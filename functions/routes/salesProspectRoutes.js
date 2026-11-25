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
function webhook(provider, env) {
  return [secret(env,'X-Webhook-Secret'),body,wrap(async(req,res)=>{
    // Keep the original payload for later normalization; deduplicate exact retries.
    const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v;
    const payload = JSON.stringify(canonical(req.body));
    const key = crypto.createHash('sha256').update(provider+':'+payload).digest('hex');
    await pool.query('INSERT INTO sales_prospect_webhook_events (provider,event_key,payload) VALUES ($1,$2,$3::jsonb) ON CONFLICT (provider,event_key) DO NOTHING',[provider,key,payload]);
    res.status(200).json({received:true});
  })];
}
router.post('/webhooks/zeptomail', ...webhook('zeptomail','ZEPTOMAIL_WEBHOOK_SECRET'));
router.post('/webhooks/zoho-mail', ...webhook('zoho-mail','ZOHO_MAIL_WEBHOOK_SECRET'));
router.use('/prospects', admin);
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
