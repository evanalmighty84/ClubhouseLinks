'use strict';
require('dotenv').config();
const pool=require('../db/db');
const {syncVerifiedMail}=require('../utils/syncVerifiedProspectMail');
async function main(){
  const args=process.argv.slice(2);
  if(args.some(a=>a!=='--apply'&&!a.startsWith('--since=')&&!a.startsWith('--limit='))) throw new Error('Use --since=YYYY-MM-DD --limit=100 [--apply]');
  const since=args.find(a=>a.startsWith('--since='))?.slice(8)||'2026-11-01';
  const limit=Number(args.find(a=>a.startsWith('--limit='))?.slice(8)||100);
  const result=await syncVerifiedMail({since,limit,dryRun:!args.includes('--apply')});
  console.log(JSON.stringify(result,null,2));
}
main().catch(err=>{console.error('Verified IMAP sync failed:',err.code||err.name);process.exitCode=1;}).finally(()=>pool.end());
