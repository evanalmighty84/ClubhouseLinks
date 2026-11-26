'use strict';
const Imap = require('imap');
const {simpleParser} = require('mailparser');
const crypto = require('crypto');
const pool = require('../db/db');

const normalize = v => typeof v === 'string' ? v.trim().toLowerCase() : '';
const call = (obj, method, ...args) => new Promise((resolve,reject) =>
  obj[method](...args,(err,value)=>err?reject(err):resolve(value)));
const addresses = obj => (obj?.value || []).map(x=>normalize(x.address)).filter(Boolean);
function fetchOne(imap,uid) {
  return new Promise((resolve,reject)=>{
    const chunks=[]; let size=0, oversized=false, attrs;
    const fetch=imap.fetch(uid,{bodies:'',markSeen:false});
    fetch.on('error',reject);
    fetch.on('message',msg=>{
      msg.on('attributes',a=>{attrs=a;});
      msg.on('body',stream=>{
        stream.on('data',chunk=>{
          size+=chunk.length;
          if(size>5*1024*1024){oversized=true;chunks.length=0;}
          if(!oversized)chunks.push(chunk);
        });
        stream.on('error',reject);
      });
      msg.on('error',reject);
    });
    fetch.on('end',()=>resolve(oversized||!chunks.length?null:{raw:Buffer.concat(chunks),attrs}));
  });
}
async function syncVerifiedMail({since='2026-11-01',limit=100,dryRun=true}={}) {
  if(process.env.PROSPECT_PIPELINE_ENABLED!=='true') throw new Error('Prospect storage not enabled');
  if(typeof since!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(since)||!Number.isFinite(Date.parse(since))) throw new Error('Invalid since date');
  if(!Number.isInteger(limit)||limit<1||limit>500) throw new Error('Limit must be 1-500');
  const user=process.env.PROSPECT_IMAP_USER;
  const password=process.env.PROSPECT_IMAP_PASSWORD;
  const host=process.env.PROSPECT_IMAP_HOST;
  if(!user||!password||!host) throw new Error('PROSPECT_IMAP_HOST, PROSPECT_IMAP_USER and PROSPECT_IMAP_PASSWORD must be configured');
  const {rows}=await pool.query('SELECT email,prospect_id FROM sales_prospect_verified_recipients WHERE is_active=true ORDER BY email');
  const registry=new Map(rows.map(row=>[normalize(row.email),row.prospect_id]));
  const result={dryRun,since,verifiedRecipients:registry.size,matched:0,inserted:0,duplicates:0,skipped:0,folders:[],truncated:false};
  if(!registry.size)return result;
  const imap=new Imap({user,password,host,port:Number(process.env.PROSPECT_IMAP_PORT||993),tls:true,tlsOptions:{rejectUnauthorized:true},connTimeout:15000,authTimeout:15000,socketTimeout:30000});
  // Prevent asynchronous connection errors from becoming unhandled exceptions.
  imap.on('error',()=>{});
  try {
    await new Promise((resolve,reject)=>{imap.once('ready',resolve);imap.once('error',reject);imap.connect();});
    const folders=[{name:'INBOX',direction:'incoming'},{name:process.env.PROSPECT_IMAP_SENT_FOLDER||'Sent',direction:'outgoing'}];
    for(const folder of folders){
      const report={name:folder.name,direction:folder.direction,candidates:0,scanned:0};result.folders.push(report);
      await call(imap,'openBox',folder.name,true);
      const uids=new Set();
      // IMAP searches only the registered correspondents, not the entire mailbox.
      for(const email of registry.keys()){
        const fields=folder.direction==='incoming'?['FROM']:['TO','CC','BCC'];
        for(const field of fields){
          const found=await call(imap,'search',[['SINCE',new Date(since+'T00:00:00Z')],[field,email]]);
          for(const uid of found||[])uids.add(uid);
        }
      }
      report.candidates=uids.size;
      if(uids.size>limit)result.truncated=true;
      for(const uid of [...uids].sort((a,b)=>b-a).slice(0,limit)){
        report.scanned++;
        const fetched=await fetchOne(imap,uid);
        if(!fetched){result.skipped++;continue;}
        const mail=await simpleParser(fetched.raw,{skipHtmlToText:false,skipTextToHtml:true,skipImageLinks:true});
        const from=addresses(mail.from);
        const recipients=[...new Set([...addresses(mail.to),...addresses(mail.cc),...addresses(mail.bcc)])];
        const peers=folder.direction==='incoming'?(from.length===1?from:[]):recipients;
        const verified=peers.filter(email=>registry.has(email));
        if(!verified.length){result.skipped++;continue;}
        // Never retain other correspondents' address lists or attachment data.
        const messageId=mail.messageId||crypto.createHash('sha256').update(fetched.raw).digest('hex');
        const occurred=(mail.date||fetched.attrs?.date||new Date()).toISOString();
        for(const email of verified){
          result.matched++;
          if(dryRun)continue;
          const payload={message_id:messageId,direction:folder.direction,correspondent:email,subject:mail.subject||null,text:(mail.text||'').slice(0,200000),occurred_at:occurred};
          const key=crypto.createHash('sha256').update('zoho-imap:'+email+':'+messageId+':'+folder.direction).digest('hex');
          // Recheck the active registry atomically at insertion time.
          const inserted=await pool.query(`INSERT INTO sales_prospect_webhook_events
          (provider,event_key,payload,prospect_id,event_type,recipient_email,sender_email,subject,message_id)
          SELECT 'zoho-imap',$1,$2::jsonb,prospect_id,$3,$4,$5,$6,$7
          FROM sales_prospect_verified_recipients WHERE email=$8 AND is_active=true
          ON CONFLICT (provider,event_key) DO NOTHING`,[key,JSON.stringify(payload),folder.direction==='incoming'?'incoming_email':'outgoing_email',folder.direction==='outgoing'?email:null,folder.direction==='incoming'?email:null,payload.subject,messageId,email]);
          if(inserted.rowCount)result.inserted++;else result.duplicates++;
        }
      }
    }
    return result;
  } finally { imap.end(); }
}
module.exports={syncVerifiedMail};
