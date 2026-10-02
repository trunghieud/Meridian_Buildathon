import {collectionSlot} from '@/lib/collection-schedule';
import type {Meeting,Period} from '@/lib/boardroom';

// The counter spans Vercel instances and deployments. A missing or unreachable
// Redis store fails closed: we do not call the paid upstream without a budget.
const PREFIX='meridian:2026-buildathon';
const REQUESTS=`${PREFIX}:requests`;
const SUCCEEDED=`${PREFIX}:succeeded`;
const USABLE=`${PREFIX}:usable`;
const CREDITS=`${PREFIX}:credits`;
const AUDIT=`${PREFIX}:recent`;
const HISTORY=(period:Period)=>`${PREFIX}:history:${period}`;
const HOLDERS=`${PREFIX}:top40:latest`;
const HOLDERS_HISTORY=`${PREFIX}:top40:history`;
const HOLDERS_SLOT=`${PREFIX}:top40:last-slot`;
const HOLDERS_ATTEMPT=`${PREFIX}:top40:attempt`;
const HOLDER_COUNT=`${PREFIX}:holder-count:latest`;
const HOLDER_COUNT_HISTORY=`${PREFIX}:holder-count:history`;
const HOLDER_COUNT_SLOT=`${PREFIX}:holder-count:last-slot`;
const HOLDER_COUNT_ATTEMPT=`${PREFIX}:holder-count:attempt`;

export type TopHolder={address:string;tokenAmount:number;balanceChange24h:number|null;valueUsd:number|null};
export type TopHolders={asOf:string;source:'api';wallets:TopHolder[];totalTokens:number;change24h:number|null;count:number};
export type HolderCount={asOf:string;source:'api';totalHolders:number};

// Holder USD values are a spot valuation. Applying their implied price to the
// token delta estimates its current value, not realized net flow or profit.
export function holderUsdMetrics(snapshot:TopHolders){
 const valued=snapshot.wallets.length>0&&snapshot.wallets.every(w=>w.valueUsd!==null&&w.valueUsd>=0);
 const totalValueUsd=valued?snapshot.wallets.reduce((sum,w)=>sum+w.valueUsd!,0):null;
 const priceUsd=totalValueUsd!==null&&snapshot.totalTokens>0?totalValueUsd/snapshot.totalTokens:null;
 const change24hUsd=priceUsd!==null&&snapshot.change24h!==null?snapshot.change24h*priceUsd:null;
 const changesKnown=snapshot.wallets.every(w=>w.balanceChange24h!==null);
 return {totalValueUsd,priceUsd,change24hUsd,
  adding:changesKnown?snapshot.wallets.filter(w=>w.balanceChange24h!>0).length:null,
  reducing:changesKnown?snapshot.wallets.filter(w=>w.balanceChange24h!<0).length:null};
}

export function usageConfig(){
 // The Vercel Upstash integration prefixes its injected REST credentials.
 const url=process.env.UPSTASH_REDIS_REST_URL??process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN??process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
 const raw=process.env.NANSEN_MAX_API_CALLS??'';
 const budget=/^[1-9]\d*$/.test(raw)?Number(raw):0;
 if(!url||!token||!Number.isSafeInteger(budget)||budget<1||budget>100000)return null;
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:')return null;
  return {url:parsed.origin,token,budget};
 }catch{return null;}
}

async function command(path:string,body:unknown):Promise<unknown>{
 const config=usageConfig();
 if(!config)throw new Error('Usage budget is not configured');
 const response=await fetch(config.url+path,{
  method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},
  body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(4000),
 });
 if(!response.ok)throw new Error(`Usage store returned ${response.status}`);
 const value=await response.json() as {result?:unknown;error?:string}|Array<{result?:unknown;error?:string}>;
 if(!Array.isArray(value)&&value.error)throw new Error('Usage store rejected the command');
 return value;
}

const RESERVE=`local used=tonumber(redis.call('GET',KEYS[1]) or '0')
if used>=tonumber(ARGV[1]) then return {0,used} end
return {1,redis.call('INCR',KEYS[1])}`;

export async function reserveNansenCall():Promise<boolean>{
 const config=usageConfig();
 if(!config)return false;
 const response=await command('', ['EVAL',RESERVE,'1',REQUESTS,String(config.budget)]) as {result?:unknown};
 if(!Array.isArray(response.result)||response.result.length!==2)throw new Error('Unexpected usage store reply');
 return Number(response.result[0])===1;
}

export async function recordNansenCall(status:number,usable:boolean,credits:number|null,period:Period|'holders'|'holder-count',requestId:string|null,meeting?:Meeting|null){
 const entry=JSON.stringify({at:new Date().toISOString(),period,status,usable,credits,requestId});
 const commands:(string|number)[][]=[['LPUSH',AUDIT,entry],['LTRIM',AUDIT,0,199]];
 if(meeting?.source==='api'&&usable&&period!=='holders'&&period!=='holder-count'){
  const point=JSON.stringify({at:meeting.asOf,period,cohorts:meeting.cohorts.map(c=>({id:c.id,flow:c.flow,status:c.status})),warning:meeting.warning??null});
  commands.push(['LPUSH',HISTORY(period),point],['LTRIM',HISTORY(period),0,1199]);
 }
 if(status>=200&&status<300)commands.push(['INCR',SUCCEEDED]);
 if(usable)commands.push(['INCR',USABLE]);
 if(credits!==null&&Number.isSafeInteger(credits)&&credits>=0)commands.push(['INCRBY',CREDITS,credits]);
 const result=await command('/multi-exec',commands) as Array<{error?:string}>;
 if(!Array.isArray(result)||result.some(x=>x.error))throw new Error('Usage audit could not be persisted');
}

export async function readNansenHistory(period:Period){
 const response=await command('', ['LRANGE',HISTORY(period),0,71]) as {result?:unknown};
 if(!Array.isArray(response.result))throw new Error('Unexpected history reply');
 return response.result.map(row=>JSON.parse(String(row)) as {at:string;period:Period;cohorts:{id:string;flow:number|null;status:string}[];warning:string|null}).reverse();
}

export async function readTopHolders():Promise<TopHolders|null>{
 const response=await command('', ['GET',HOLDERS]) as {result?:unknown};
 return typeof response.result==='string'?JSON.parse(response.result) as TopHolders:null;
}

// One successful observation per Eastern morning/evening slot. Attempts are
// locked atomically for an hour within that slot; a new slot has its own lock.
const HOLDER_GATE=`if redis.call('GET',KEYS[1])==ARGV[1] then return 0 end
if not redis.call('SET',KEYS[2],ARGV[1],'NX','EX',3600) then return 0 end
return 1`;
export async function reserveTopHoldersRefresh(slot:string=collectionSlot()):Promise<boolean>{
 const response=await command('', ['EVAL',HOLDER_GATE,'2',HOLDERS_SLOT,HOLDERS_ATTEMPT+':'+slot,slot]) as {result?:unknown};
 return Number(response.result)===1;
}

export async function storeTopHolders(snapshot:TopHolders,slot:string=collectionSlot(new Date(snapshot.asOf))){
 const response=await command('/multi-exec',[
  ['SET',HOLDERS,JSON.stringify(snapshot)],['SET',HOLDERS_SLOT,slot],
  ['LPUSH',HOLDERS_HISTORY,JSON.stringify(snapshot)],['LTRIM',HOLDERS_HISTORY,0,179],
 ]) as Array<{error?:string}>;
 if(!Array.isArray(response)||response.some(x=>x.error))throw new Error('Holder snapshot could not be persisted');
}

export async function readTopHoldersHistory(){
 const response=await command('', ['LRANGE',HOLDERS_HISTORY,0,59]) as {result?:unknown};
 if(!Array.isArray(response.result))throw new Error('Unexpected holder history reply');
 return response.result.map(row=>{
  const point=JSON.parse(String(row)) as TopHolders;
  return {asOf:point.asOf,totalTokens:point.totalTokens,change24h:point.change24h,count:point.count,...holderUsdMetrics(point)};
 }).reverse();
}

export async function readHolderCount():Promise<HolderCount|null>{
 const response=await command('', ['GET',HOLDER_COUNT]) as {result?:unknown};
 return typeof response.result==='string'?JSON.parse(response.result) as HolderCount:null;
}

export async function reserveHolderCountRefresh(slot:string=collectionSlot()):Promise<boolean>{
 const response=await command('', ['EVAL',HOLDER_GATE,'2',HOLDER_COUNT_SLOT,HOLDER_COUNT_ATTEMPT+':'+slot,slot]) as {result?:unknown};
 return Number(response.result)===1;
}

export async function storeHolderCount(snapshot:HolderCount,slot:string=collectionSlot(new Date(snapshot.asOf))){
 const response=await command('/multi-exec',[
  ['SET',HOLDER_COUNT,JSON.stringify(snapshot)],['SET',HOLDER_COUNT_SLOT,slot],
  ['LPUSH',HOLDER_COUNT_HISTORY,JSON.stringify(snapshot)],['LTRIM',HOLDER_COUNT_HISTORY,0,729],
 ]) as Array<{error?:string}>;
 if(!Array.isArray(response)||response.some(x=>x.error))throw new Error('Holder count could not be persisted');
}

export async function readHolderCountHistory():Promise<HolderCount[]>{
 const response=await command('', ['LRANGE',HOLDER_COUNT_HISTORY,0,729]) as {result?:unknown};
 if(!Array.isArray(response.result))throw new Error('Unexpected holder count history reply');
 return response.result.map(row=>JSON.parse(String(row)) as HolderCount).reverse();
}

export async function readNansenUsage(){
 const result=await command('', ['MGET',REQUESTS,SUCCEEDED,USABLE,CREDITS]) as {result?:unknown};
 if(!Array.isArray(result.result)||result.result.length!==4)throw new Error('Unexpected usage summary');
 const [requests,succeeded,usable,credits]=result.result.map(x=>Number(x??0));
 return {requests,succeeded,usable,reportedCredits:credits,budget:usageConfig()!.budget};
}
