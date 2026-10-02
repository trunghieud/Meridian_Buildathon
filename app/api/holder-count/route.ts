import {collectionSlot} from '@/lib/collection-schedule';
import {TOKEN} from '@/lib/boardroom';
import {readHolderCount,recordNansenCall,reserveHolderCountRefresh,reserveNansenCall,storeHolderCount,usageConfig,type HolderCount} from '@/lib/nansen-usage';

export const dynamic='force-dynamic';

function reply(snapshot:HolderCount|null,warning?:string){
 return Response.json({snapshot,warning},{headers:{'Cache-Control':'no-store'}});
}

export async function GET(){
 const slot=collectionSlot();
 if(!usageConfig()||!process.env.NANSEN_API_KEY)return reply(null,'Holder count collection is not configured.');
 let previous:HolderCount|null=null;
 try{
  previous=await readHolderCount();
  if(!await reserveHolderCountRefresh(slot))return reply(previous,previous?undefined:'The first holder count is pending.');
  if(!await reserveNansenCall())return reply(previous,'The Nansen call budget has been reached.');
 }catch{return reply(previous,'The usage store is unavailable.');}

 let response:Response|undefined,recorded=false;
 try{
  response=await fetch('https://api.nansen.ai/api/v1/tgm/token-information',{
   method:'POST',headers:{apikey:process.env.NANSEN_API_KEY!,'Content-Type':'application/json'},
   body:JSON.stringify({chain:'robinhood',token_address:TOKEN,timeframe:'1d'}),
   cache:'no-store',signal:AbortSignal.timeout(18000),
  });
  const costHeader=response.headers.get('x-nansen-credits-cost');
  const cost=costHeader===null?null:Number(costHeader);
  const credits=cost!==null&&Number.isSafeInteger(cost)&&cost>=0?cost:null;
  const requestId=response.headers.get('x-request-id');
  let snapshot:HolderCount|null=null;
  if(response.ok){
   const body=await response.json() as {data?:{spot_metrics?:{total_holders?:unknown}}};
   const count=body.data?.spot_metrics?.total_holders;
   if(typeof count!=='number'||!Number.isSafeInteger(count)||count<0)throw new Error('Invalid total holder count');
   snapshot={asOf:new Date().toISOString(),source:'api',totalHolders:count};
  }
  await recordNansenCall(response.status,Boolean(snapshot),credits,'holder-count',requestId);
  recorded=true;
  if(!snapshot)return reply(previous,`Nansen returned HTTP ${response.status}; showing the last holder count.`);
  await storeHolderCount(snapshot,slot);
  return reply(snapshot);
 }catch(error){
  if(!recorded){
   try{await recordNansenCall(response?.status??0,false,null,'holder-count',response?.headers.get('x-request-id')??null);}catch{}
  }
  console.error('[nansen-holder-count]',error instanceof Error?error.message:'Unknown collection error');
  return reply(previous,'Holder count refresh failed; showing the last available observation.');
 }
}
