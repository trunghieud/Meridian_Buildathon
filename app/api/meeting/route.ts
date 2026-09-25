import {TOKEN,snapshot,type Period,type Meeting} from '@/lib/boardroom';
const inFlight=new Map<string,Promise<Meeting>>();
const localCache=new Map<string,{expires:number;data:Meeting}>();
export async function GET(request:Request){
 const p=new URL(request.url).searchParams.get('period')??'1d';
 if(!['1h','1d','7d'].includes(p))return Response.json({error:'Invalid period'},{status:400});
 const period=p as Period,apiKey=process.env.NANSEN_API_KEY;
 if(!apiKey)return Response.json(snapshot(period),{headers:{'Cache-Control':'no-store'}});
 const warm=localCache.get(period);if(warm&&warm.expires>Date.now())return Response.json(warm.data);
 try{let pending=inFlight.get(period);if(!pending){pending=(async()=>{
 const response=await fetch('https://api.nansen.ai/api/v1/tgm/flow-intelligence',{method:'POST',headers:{apikey:apiKey,'Content-Type':'application/json'},body:JSON.stringify({chain:'robinhood',token_address:TOKEN,timeframe:period}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Upstream unavailable');const body=await response.json() as {data?:unknown;warnings?:unknown};
 const row=Array.isArray(body.data)?body.data[0]:body.data;if(!row||typeof row!=='object')throw Error('Unexpected upstream schema');
 const data=row as Record<string,unknown>,base=snapshot(period),prefixes=['smart_trader','whale','public_figure'];
 const result:Meeting={period,source:'api',asOf:new Date().toISOString(),cohorts:base.cohorts.map((c,i)=>{const f=data[prefixes[i]+'_net_flow_usd'],n=data[prefixes[i]+'_wallet_count'],valid=typeof f==='number'&&Number.isFinite(f);return {...c,flow:valid?f:null,wallets:typeof n==='number'&&Number.isFinite(n)?n:null,status:valid?'measured':'missing'};})};
 if(result.cohorts.every(c=>c.status==='missing'))result.warning='Nansen returned no usable cohort values for this window.';
 if(Array.isArray(body.warnings)&&body.warnings.length)result.warning='Nansen reports a data-quality warning. Treat this observation as partial.';
 return result;})();inFlight.set(period,pending);}
 const result=await pending;localCache.set(period,{expires:Date.now()+900000,data:result});const response=Response.json(result,{headers:{'Cache-Control':'public,max-age=0,s-maxage=900,stale-while-revalidate=60'}});return response;
 }catch{return Response.json({...snapshot(period),warning:'Nansen could not be refreshed. Showing the dated launch snapshot.'},{headers:{'Cache-Control':'no-store'}});}finally{inFlight.delete(period);}
}
