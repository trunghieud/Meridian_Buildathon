import {TOKEN,snapshot,type Period,type Meeting} from '@/lib/boardroom';
import {recordNansenCall,reserveNansenCall,usageConfig} from '@/lib/nansen-usage';

const inFlight=new Map<Period,Promise<Meeting>>();
const localCache=new Map<Period,{expires:number;data:Meeting}>();
const periods:Period[]=['1h','1d','7d'];
const CACHE_SECONDS:Record<Period,number>={'1h':100,'1d':220,'7d':540};

function fallback(period:Period,warning:string){
 return Response.json({...snapshot(period),warning},{headers:{'Cache-Control':'no-store'}});
}

async function fetchMeeting(period:Period,apiKey:string):Promise<Meeting>{
 if(!await reserveNansenCall())throw new Error('The Nansen call budget is exhausted or not configured.');
 let response:Response;
 try{
  response=await fetch('https://api.nansen.ai/api/v1/tgm/flow-intelligence',{
   method:'POST',headers:{apikey:apiKey,'Content-Type':'application/json'},
   body:JSON.stringify({chain:'robinhood',token_address:TOKEN,timeframe:period}),
   cache:'no-store',signal:AbortSignal.timeout(12000),
  });
 }catch(error){
  // The reservation remains counted: a timeout does not prove the call was unbilled.
  await recordNansenCall(0,false,null,period,null);
  throw error;
 }
 const cost=Number(response.headers.get('x-nansen-credits-cost'));
 const credits=Number.isSafeInteger(cost)&&cost>=0&&response.headers.has('x-nansen-credits-cost')?cost:null;
 const requestId=response.headers.get('x-request-id');
 let result:Meeting|null=null;
 try{
  if(response.ok){
   const body=await response.json() as {data?:unknown;warnings?:unknown};
   const row=Array.isArray(body.data)?body.data[0]:body.data;
   if(row&&typeof row==='object'){
    const data=row as Record<string,unknown>,base=snapshot(period);
    const prefixes=['smart_trader','whale','public_figure','exchange'];
    const warnings=Array.isArray(body.warnings)?body.warnings.filter((w):w is string=>typeof w==='string'):[];
    const affected=(prefix:string)=>warnings.some(w=>w.toLowerCase().includes(prefix)&&!w.includes('wallet_count is always 0'));
    // Keep upstream diagnostics in private runtime logs without exposing the
    // API key or entire response to public visitors.
    console.info('[nansen-flow]',JSON.stringify({period,requestId,warnings,cohorts:Object.fromEntries(prefixes.map(prefix=>[prefix,{
     netFlowUsd:data[prefix+'_net_flow_usd']??null,walletCount:data[prefix+'_wallet_count']??null,
    }]))}));
    result={period,source:'api',asOf:new Date().toISOString(),cohorts:base.cohorts.map((c,i)=>{
     const flow=data[prefixes[i]+'_net_flow_usd'],wallets=data[prefixes[i]+'_wallet_count'];
     const measured=typeof flow==='number'&&Number.isFinite(flow);
     // Warnings about unrelated exchange/fresh-wallet counts do not invalidate this cohort.
     const unverified=affected(prefixes[i])&&flow===0&&wallets===0;
     // Nansen explicitly does not track exchange wallet counts; zero there is not an activity count.
     return {...c,flow:measured&&!unverified?flow:null,wallets:c.id==='exchange'?null:typeof wallets==='number'&&Number.isFinite(wallets)&&!unverified?wallets:null,status:measured&&!unverified?'measured':'missing'};
    })};
    if(result.cohorts.every(c=>c.status==='missing'))result.warning='Nansen returned no usable cohort values for this window.';
    if(prefixes.some(affected))result.warning='Nansen warned about a cohort measurement. Check the holder view for balance changes.';
   }
  }
 }finally{
  // Count the actual upstream response, even if parsing fails. Official Nansen
  // usage analytics remains the authority on calls that qualify for the event.
  await recordNansenCall(response.status,Boolean(result?.cohorts.some(c=>c.status==='measured')),credits,period,requestId,result);
 }
 if(!response.ok)throw new Error(`Nansen returned HTTP ${response.status}.`);
 if(!result)throw new Error('Nansen returned an unexpected response.');
 return result;
}

export async function GET(request:Request){
 const p=new URL(request.url).searchParams.get('period')??'1d';
 if(!periods.includes(p as Period))return Response.json({error:'Invalid period'},{status:400});
 const period=p as Period,apiKey=process.env.NANSEN_API_KEY;
 if(!apiKey)return fallback(period,'Nansen API key is not configured. Showing the dated launch snapshot.');
 if(!usageConfig())return fallback(period,'Live refresh is paused until durable usage counting and a call budget are configured.');
 const warm=localCache.get(period);
 const cacheSeconds=CACHE_SECONDS[period];
 if(warm&&warm.expires>Date.now())return Response.json(warm.data,{headers:{'Cache-Control':`public,max-age=0,s-maxage=${cacheSeconds},stale-while-revalidate=15`}});
 try{
  let pending=inFlight.get(period);
  if(!pending){pending=fetchMeeting(period,apiKey);inFlight.set(period,pending);}
  const result=await pending;
  localCache.set(period,{expires:Date.now()+cacheSeconds*1000,data:result});
  return Response.json(result,{headers:{'Cache-Control':`public,max-age=0,s-maxage=${cacheSeconds},stale-while-revalidate=15`}});
 }catch(error){
  const detail=error instanceof Error&&error.message.includes('budget')?'The Nansen call budget has been reached.':'Nansen could not be refreshed or counted.';
  return fallback(period,`${detail} Showing the dated launch snapshot.`);
 }finally{inFlight.delete(period);}
}
