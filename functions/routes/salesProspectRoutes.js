'use strict';
const express = require('express');
const crypto = require('crypto');
const pool = require('../db/db');
const router = express.Router();

function secret(env, header) {
  return (req, res, next) => {
    const expected = process.env[env];
    if (!expected) return res.status(503).json({error:'Integration not configured'});
    const actual = req.get(header) || '';
    const hash = v => crypto.createHash('sha256').update(v).digest();
    if (!crypto.timingSafeEqual(hash(actual), hash(expected))) return res.status(401).json({error:'Unauthorized'});
    next();
  };
}
const admin = secret('PROSPECT_API_SECRET', 'X-Prospect-Secret');
const wrap = fn => async (req,res) => {
  try {
    if (process.env.PROSPECT_PIPELINE_ENABLED !== 'true') return res.status(503).json({error:'Prospect storage not enabled'});
    await fn(req,res);
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return res.status(503).json({error:'Prospect schema not ready'});
    if (err.code === '23503') return res.status(404).json({error:'Related prospect not found'});
    if (['22P02','22007','22008','23514','23502'].includes(err.code)) return res.status(400).json({error:'Invalid input'});
    console.error('Prospect API error', err.code || err.name);
    return res.status(500).json({error:'Prospect operation failed'});
  }
};
function validId(req,res,next) {
  if (!/^[1-9][0-9]{0,17}$/.test(req.params.id)) return res.status(400).json({error:'Invalid prospect ID'});
  next();
}
function body(req,res,next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({error:'JSON object required'});
  next();
}
// Only explicitly registered outreach recipients qualify for email storage.
function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email=value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) ? email : null;
}
async function verifiedRecipients(emails) {
  const normalized=[...new Set(emails.map(normalizeEmail).filter(Boolean))];
  if (!normalized.length) return new Map();
  const {rows}=await pool.query('SELECT email,prospect_id FROM sales_prospect_verified_recipients WHERE is_active=true AND email=ANY($1::text[])',[normalized]);
  return new Map(rows.map(row=>[row.email,row]));
}
function array(value) { return Array.isArray(value) ? value : []; }
function string(value) { return typeof value === 'string' ? value : null; }
function eventTime(value,fallback) {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const date=new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}
async function storeVerifiedEvent(client, event) {
  // Only normalized, allowlisted fields are retained, never the original batch.
  const {provider,email,prospect_id,type,sender,subject,message_id,payload}=event;
  const serialized=JSON.stringify(payload);
  const key=crypto.createHash('sha256').update(provider+':'+email+':'+serialized).digest('hex');
  const result=await client.query('INSERT INTO sales_prospect_webhook_events (provider,event_key,payload,prospect_id,event_type,recipient_email,sender_email,subject,message_id) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9) ON CONFLICT (provider,event_key) DO NOTHING',[provider,key,serialized,prospect_id,type,provider==='zeptomail'?email:null,sender,subject,message_id]);
  return result.rowCount;
}
function explicitEventRecipient(detail) {
  return normalizeEmail(detail.bounced_recipient || detail.delivered_recipient ||
    detail.recipient_email || detail.recipient_address || detail.recipient ||
    detail.email_address?.address || detail.email_address);
}
router.post('/webhooks/zeptomail',secret('ZEPTOMAIL_WEBHOOK_SECRET','X-Webhook-Secret'),body,wrap(async(req,res)=>{
  const candidates=[];
  for (const msg of array(req.body.event_message)) {
    const info=msg?.email_info;
    if (!info || typeof info !== 'object') continue;
    const sender=normalizeEmail(info.from?.address);
    // Exclude verification fixtures; only SMTP traffic can be our scripts.
    if (sender==='webhooktest@zylker.com' || info.subject==='webhook test email' || info.is_smtp_trigger!==true) continue;
    const allAddresses=[...array(info.to),...array(info.cc),...array(info.bcc)].map(x=>normalizeEmail(x?.email_address?.address));
    const recipients=[...new Set(allAddresses.filter(Boolean))];
    for (const data of array(msg.event_data)) {
      if (!data || typeof data.object!=='string') continue;
      for (const detail of array(data.details)) {
        if (!detail || typeof detail!=='object') continue;
        const explicit=explicitEventRecipient(detail);
        // Do not guess which recipient opened or clicked a multi-address email.
        const email=explicit || (recipients.length===1 && allAddresses.every(Boolean) ? recipients[0] : null);
        if (!email || !recipients.includes(email)) continue;
        const message_id=string(info.email_reference)||string(msg.request_id);
        if (!message_id) continue;
        const type=data.object;
        candidates.push({provider:'zeptomail',email,type,sender,subject:string(info.subject),message_id,
          payload:{event_name:[type],message_id,recipient_email:email,event_time:eventTime(detail.time,eventTime(info.processed_time,null)),
            reason:string(detail.reason),diagnostic_message:string(detail.diagnostic_message)}});
      }
    }
  }
  const verified=await verifiedRecipients(candidates.map(e=>e.email));
  let inserted=0;
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    for (const event of candidates) {
      if (!verified.has(event.email)) continue;
      inserted+=await storeVerifiedEvent(client,{...event,prospect_id:verified.get(event.email).prospect_id});
    }
    await client.query('COMMIT');
  } catch(err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
  return res.status(200).json({received:true,inserted});
}));
// Zoho Mail supplies its own signing key on the first request. Enrollment
// is authorized by a separate URL token and can never overwrite a saved key.
const zohoRegistrationProvider = 'zoho-mail-registration';
const zohoRegistrationKey = 'signing-key-v1';
function equalSecret(a,b) {
  const hash = v => crypto.createHash('sha256').update(v).digest();
  return crypto.timingSafeEqual(hash(a),hash(b));
}
function zohoSignatureValid(key,raw,signature) {
  return Buffer.isBuffer(raw) && typeof signature === 'string' &&
    equalSecret(crypto.createHmac('sha256',key).update(raw).digest('base64'),signature);
}
function zohoEncryptionKey(token) {
  return crypto.createHash('sha256').update('zoho-mail-signing-key-v1:'+token).digest();
}
function sealZohoKey(key,token) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',zohoEncryptionKey(token),iv);
  const data=Buffer.concat([cipher.update(key,'utf8'),cipher.final()]);
  return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
function openZohoKey(payload,token) {
  const decipher=crypto.createDecipheriv('aes-256-gcm',zohoEncryptionKey(token),Buffer.from(payload.iv,'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.data,'base64')),decipher.final()]).toString('utf8');
}
router.post('/webhooks/zoho-mail', wrap(async(req,res)=>{
  const token=process.env.ZOHO_MAIL_WEBHOOK_SECRET;
  if (!token) return res.status(503).json({error:'Integration not configured'});
  const proposed=req.get('x-hook-secret');
  const signature=req.get('x-hook-signature');
  const raw=req.zohoRawBody;
  const configured=process.env.ZOHO_MAIL_SIGNING_SECRET;
  const saved=await pool.query('SELECT payload FROM sales_prospect_webhook_events WHERE provider=$1 AND event_key=$2',[zohoRegistrationProvider,zohoRegistrationKey]);
  let signingKey=configured || (saved.rows.length ? openZohoKey(saved.rows[0].payload,token) : null);
  if (proposed) {
    if (signingKey) {
      // Permit only a retry of the original enrollment, never replacement.
      if (typeof req.query.enroll !== 'string' || !equalSecret(req.query.enroll,token) ||
          !equalSecret(proposed,signingKey) || (signature && !zohoSignatureValid(signingKey,raw,signature)))
        return res.status(401).json({error:'Unauthorized'});
    } else {
      if (typeof req.query.enroll !== 'string' || !equalSecret(req.query.enroll,token) ||
          proposed.length > 4096 || (signature && !zohoSignatureValid(proposed,raw,signature)))
        return res.status(401).json({error:'Unauthorized'});
      const encrypted=sealZohoKey(proposed,token);
      await pool.query("INSERT INTO sales_prospect_webhook_events (provider,event_key,payload,processing_status) VALUES ($1,$2,$3::jsonb,'ignored') ON CONFLICT (provider,event_key) DO NOTHING",[zohoRegistrationProvider,zohoRegistrationKey,JSON.stringify(encrypted)]);
      const persisted=await pool.query('SELECT payload FROM sales_prospect_webhook_events WHERE provider=$1 AND event_key=$2',[zohoRegistrationProvider,zohoRegistrationKey]);
      signingKey=openZohoKey(persisted.rows[0].payload,token);
      if (!equalSecret(proposed,signingKey)) return res.status(401).json({error:'Unauthorized'});
    }
    res.set('x-hook-secret',proposed);
    return res.status(200).json({received:true});
  }
  if (!signingKey || !zohoSignatureValid(signingKey,raw,signature)) return res.status(401).json({error:'Unauthorized'});
  // Preserve the original JSON text, including large numeric message IDs.
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({error:'JSON object required'});
  const email=normalizeEmail(req.body.fromAddress);
  const verified=await verifiedRecipients([email]);
  if (!verified.has(email)) return res.status(200).json({received:true,inserted:0});
  // Parse the numeric message ID from the original JSON to avoid JS precision loss.
  // Only accept the documented top-level sender field for authorization.
  const idResult=await pool.query("SELECT ($1::jsonb)->>'messageId' AS id",[raw.toString('utf8')]);
  const message_id=idResult.rows[0].id;
  if (!message_id) return res.status(200).json({received:true,inserted:0});
  const payload={message_id,fromAddress:email,sender:string(req.body.sender),subject:string(req.body.subject),
    receivedTime:eventTime(req.body.receivedTime,null),sentDateInGMT:eventTime(req.body.sentDateInGMT,null),
    summary:string(req.body.summary),html:string(req.body.html)};
  // Use the provider's stable message ID, not mutable summary/body content.
  const key=crypto.createHash('sha256').update('zoho-mail:'+email+':'+message_id).digest('hex');
  const result=await pool.query('INSERT INTO sales_prospect_webhook_events (provider,event_key,payload,prospect_id,event_type,sender_email,subject,message_id) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8) ON CONFLICT (provider,event_key) DO NOTHING',['zoho-mail',key,JSON.stringify(payload),verified.get(email).prospect_id,'incoming_email',email,payload.subject,message_id]);
  return res.status(200).json({received:true,inserted:result.rowCount});
}));
router.use('/prospects', admin);
router.post('/prospects/emails/register-recipient',body,wrap(async(req,res)=>{
  const email=normalizeEmail(req.body.email);
  const name=req.body.recipient_name;
  const messageId=req.body.message_id;
  const prospectId=req.body.prospect_id ?? null;
  if (!email || email.endsWith('@zylker.com') || typeof messageId!=='string' || !messageId.trim() || messageId.length>1000 ||
      (name!=null && (typeof name!=='string'||name.length>500)) ||
      (prospectId!==null && !/^[1-9][0-9]{0,17}$/.test(String(prospectId))))
    return res.status(400).json({error:'Valid email and SMTP message_id required'});
  // Trusted caller attests successful SMTP submission. Do not reactivate
  // disabled recipients or accept arbitrary verification sources from clients.
  const {rows}=await pool.query(`INSERT INTO sales_prospect_verified_recipients
    (email,recipient_name,prospect_id,verified_source,last_message_id)
    VALUES ($1,$2,$3,'zepto_script',$4)
    ON CONFLICT (email) DO UPDATE SET
      recipient_name=COALESCE(EXCLUDED.recipient_name,sales_prospect_verified_recipients.recipient_name),
      prospect_id=COALESCE(EXCLUDED.prospect_id,sales_prospect_verified_recipients.prospect_id),
      last_sent_at=CASE WHEN sales_prospect_verified_recipients.last_message_id IS DISTINCT FROM EXCLUDED.last_message_id THEN NOW() ELSE sales_prospect_verified_recipients.last_sent_at END,
      total_emails_sent=sales_prospect_verified_recipients.total_emails_sent+
        CASE WHEN sales_prospect_verified_recipients.last_message_id IS DISTINCT FROM EXCLUDED.last_message_id THEN 1 ELSE 0 END,
      last_message_id=EXCLUDED.last_message_id,updated_at=NOW()
    RETURNING id,email,recipient_name,prospect_id,is_active,first_sent_at,last_sent_at,total_emails_sent`,[email,name||null,prospectId,messageId.trim()]);
  res.status(200).json(rows[0]);
}));
router.get('/prospects/emails/verified-recipients',wrap(async(req,res)=>{
  const after=String(req.query.after_id||'0');
  if (!/^[0-9]{1,18}$/.test(after)) return res.status(400).json({error:'Invalid cursor'});
  const {rows}=await pool.query('SELECT id,email,recipient_name,prospect_id,verified_source,is_active,first_sent_at,last_sent_at,total_emails_sent FROM sales_prospect_verified_recipients WHERE id>$1 ORDER BY id LIMIT 500',[after]);
  res.json(rows);
}));

router.get('/prospects/followups',wrap(async(req,res)=>{
  const {rows}=await pool.query("SELECT * FROM sales_prospects WHERE next_followup_at IS NOT NULL AND status NOT IN ('won','lost','closed') ORDER BY next_followup_at,id LIMIT 500");
  res.json(rows);
}));
router.get('/prospects/dashboard',wrap(async(req,res)=>{
  const {rows}=await pool.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE next_followup_at <= now() AND status NOT IN ('won','lost','closed'))::int AS due, count(*) FILTER (WHERE priority='high')::int AS high_priority FROM sales_prospects");
  const stages=await pool.query('SELECT status,count(*)::int AS count FROM sales_prospects GROUP BY status ORDER BY status');
  res.json({...rows[0],stages:stages.rows});
}));
router.get('/prospects',wrap(async(req,res)=>{
  const {rows}=await pool.query('SELECT * FROM sales_prospects ORDER BY next_followup_at NULLS LAST,id LIMIT 500');
  res.json(rows);
}));
const fields=['company_name','contact_name','email','phone','priority','status','notes','next_action','next_followup_at'];
function validate(req,res,next){
  const b=req.body;
  if (Object.keys(b).some(k=>!fields.includes(k)) || Object.values(b).some(v=>v!==null && (typeof v!=='string'||v.length>20000))) return res.status(400).json({error:'Invalid prospect fields'});
  if ('company_name' in b && (typeof b.company_name!=='string'||!b.company_name.trim())) return res.status(400).json({error:'Company name required'});
  if ('priority' in b && !['high','medium','low'].includes(b.priority)) return res.status(400).json({error:'Invalid priority'});
  if ('status' in b && (typeof b.status!=='string'||!b.status.trim())) return res.status(400).json({error:'Invalid status'});
  next();
}
router.post('/prospects',body,validate,wrap(async(req,res)=>{
  if (!req.body.company_name) return res.status(400).json({error:'Company name required'});
  const keys=fields.filter(k=>Object.hasOwn(req.body,k));
  const {rows}=await pool.query('INSERT INTO sales_prospects ('+keys.join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',keys.map(k=>req.body[k]));
  res.status(201).json(rows[0]);
}));
router.patch('/prospects/:id',validId,body,validate,wrap(async(req,res)=>{
  const keys=fields.filter(k=>Object.hasOwn(req.body,k));
  if (!keys.length) return res.status(400).json({error:'No changes supplied'});
  const {rows}=await pool.query('UPDATE sales_prospects SET '+keys.map((k,i)=>k+'=$'+(i+1)).join(',')+', updated_at=now() WHERE id=$'+(keys.length+1)+' RETURNING *',[...keys.map(k=>req.body[k]),req.params.id]);
  if (!rows.length) return res.status(404).json({error:'Prospect not found'});
  res.json(rows[0]);
}));
router.post('/prospects/:id/interactions',validId,body,wrap(async(req,res)=>{
  const {type='note',notes,occurred_at=null}=req.body;
  if (!['note','call','meeting','email','visit'].includes(type)||typeof notes!=='string'||!notes.trim()||notes.length>20000||(occurred_at!==null&&typeof occurred_at!=='string')) return res.status(400).json({error:'Invalid interaction'});
  const {rows}=await pool.query("INSERT INTO sales_prospect_interactions (prospect_id,type,notes,occurred_at) SELECT id,$2,$3,COALESCE($4::timestamptz,now()) FROM sales_prospects WHERE id=$1 RETURNING *",[req.params.id,type,notes,occurred_at]);
  if (!rows.length) return res.status(404).json({error:'Prospect not found'});
  res.status(201).json(rows[0]);
}));
router.get('/prospects/:id/interactions',validId,wrap(async(req,res)=>{
  const exists=await pool.query('SELECT id FROM sales_prospects WHERE id=$1',[req.params.id]);
  if (!exists.rowCount) return res.status(404).json({error:'Prospect not found'});
  const {rows}=await pool.query('SELECT * FROM sales_prospect_interactions WHERE prospect_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 500',[req.params.id]);
  res.json(rows);
}));
module.exports=router;
