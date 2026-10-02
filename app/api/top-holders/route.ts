import {collectionSlot} from '@/lib/collection-schedule';
import {TOKEN} from '@/lib/boardroom';
import {readTopHolders,recordNansenCall,reserveNansenCall,reserveTopHoldersRefresh,storeTopHolders,usageConfig,type TopHolder,type TopHolders} from '@/lib/nansen-usage';

export const dynamic='force-dynamic';

function reply(snapshot:TopHolders|null,warning?:string){
 return Response.json({snapshot,warning},{headers:{'Cache-Control':'no-store'}});
}

export async function GET(){
 const slot=collectionSlot();
 if(!usageConfig()||!process.env.NANSEN_API_KEY)return reply(null,'Holder collection is not configured.');
 let previous:TopHolders|null=null;
 try{
  previous=await readTopHolders();
  if(!await reserveTopHoldersRefresh(slot))return reply(previous,previous?undefined:'The first holder observation is pending.');
  if(!await reserveNansenCall())return reply(previous,'The Nansen call budget has been reached.');
 }catch{return reply(previous,'The usage store is unavailable.');}

 let response:Response|undefined,recorded=false;
 try{
  response=await fetch('https://api.nansen.ai/api/v1/tgm/holders',{
   method:'POST',headers:{apikey:process.env.NANSEN_API_KEY!,'Content-Type':'application/json'},
   body:JSON.stringify({chain:'robinhood',token_address:TOKEN,label_type:'all_holders',aggregate_by_entity:false,premium_labels:false,
    pagination:{page:1,per_page:40},order_by:[{field:'token_amount',direction:'DESC'}]}),
   cache:'no-store',signal:AbortSignal.timeout(18000),
  });
  const costHeader=response.headers.get('x-nansen-credits-cost');
  const cost=costHeader===null?null:Number(costHeader);
  const credits=cost!==null&&Number.isSafeInteger(cost)&&cost>=0?cost:null;
  const requestId=response.headers.get('x-request-id');
  let snapshot:TopHolders|null=null;
  if(response.ok){
   const body=await response.json() as {data?:unknown};
   if(!Array.isArray(body.data)||body.data.length===0||body.data.length>40)throw new Error('Unexpected holder response');
   const wallets=body.data.map((item:unknown)=>{
    if(!item||typeof item!=='object')throw new Error('Invalid holder');
    const row=item as Record<string,unknown>;
    if(typeof row.address!=='string'||!/^0x[a-fA-F0-9]{40}$/.test(row.address)||typeof row.token_amount!=='number'||!Number.isFinite(row.token_amount))throw new Error('Invalid holder amount');
    return {address:row.address,tokenAmount:row.token_amount,
     balanceChange24h:typeof row.balance_change_24h==='number'&&Number.isFinite(row.balance_change_24h)?row.balance_change_24h:null,
     valueUsd:typeof row.value_usd==='number'&&Number.isFinite(row.value_usd)?row.value_usd:null} satisfies TopHolder;
    });
   if(new Set(wallets.map(w=>w.address.toLowerCase())).size!==wallets.length)throw new Error('Duplicate holder addresses');
   if(wallets.some((w,i)=>i>0&&w.tokenAmount>wallets[i-1].tokenAmount))throw new Error('Holder ranking was not descending');
   snapshot={asOf:new Date().toISOString(),source:'api',wallets,count:wallets.length,
    totalTokens:wallets.reduce((sum,w)=>sum+w.tokenAmount,0),
    change24h:wallets.every(w=>w.balanceChange24h!==null)?wallets.reduce((sum,w)=>sum+w.balanceChange24h!,0):null};
  }
  await recordNansenCall(response.status,Boolean(snapshot),credits,'holders',requestId);
  recorded=true;
  if(!snapshot)return reply(previous,`Nansen returned HTTP ${response.status}; showing the last holder observation.`);
  await storeTopHolders(snapshot,slot);
  return reply(snapshot);
 }catch(error){
  if(!recorded){
   try{await recordNansenCall(response?.status??0,false,null,'holders',response?.headers.get('x-request-id')??null);}catch{}
  }
  console.error('[nansen-holders]',error instanceof Error?error.message:'Unknown collection error');
  return reply(previous,'Holder refresh failed; showing the last available observation.');
 }
}
