// The counter spans Vercel instances and deployments. A missing or unreachable
// Redis store fails closed: we do not call the paid upstream without a budget.
const PREFIX='meridian:2026-buildathon';
const REQUESTS=`${PREFIX}:requests`;
const SUCCEEDED=`${PREFIX}:succeeded`;
const USABLE=`${PREFIX}:usable`;
const CREDITS=`${PREFIX}:credits`;
const AUDIT=`${PREFIX}:recent`;

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

export async function recordNansenCall(status:number,usable:boolean,credits:number|null,period:string,requestId:string|null){
 const entry=JSON.stringify({at:new Date().toISOString(),period,status,usable,credits,requestId});
 const commands:(string|number)[][]=[['LPUSH',AUDIT,entry],['LTRIM',AUDIT,0,199]];
 if(status>=200&&status<300)commands.push(['INCR',SUCCEEDED]);
 if(usable)commands.push(['INCR',USABLE]);
 if(credits!==null&&Number.isSafeInteger(credits)&&credits>=0)commands.push(['INCRBY',CREDITS,credits]);
 const result=await command('/multi-exec',commands) as Array<{error?:string}>;
 if(!Array.isArray(result)||result.some(x=>x.error))throw new Error('Usage audit could not be persisted');
}

export async function readNansenUsage(){
 const result=await command('', ['MGET',REQUESTS,SUCCEEDED,USABLE,CREDITS]) as {result?:unknown};
 if(!Array.isArray(result.result)||result.result.length!==4)throw new Error('Unexpected usage summary');
 const [requests,succeeded,usable,credits]=result.result.map(x=>Number(x??0));
 return {requests,succeeded,usable,reportedCredits:credits,budget:usageConfig()!.budget};
}
