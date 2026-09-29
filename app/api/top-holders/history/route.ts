import {holderUsdMetrics,readTopHolders,readTopHoldersHistory,usageConfig} from '@/lib/nansen-usage';

export const dynamic='force-dynamic';

export async function GET(){
 if(!usageConfig())return Response.json({points:[]},{headers:{'Cache-Control':'no-store'}});
 try{
  const points=await readTopHoldersHistory();
  if(points.length===0){
   const latest=await readTopHolders();
   if(latest)points.push({asOf:latest.asOf,totalTokens:latest.totalTokens,change24h:latest.change24h,count:latest.count,...holderUsdMetrics(latest)});
  }
  return Response.json({points},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Holder history unavailable'},{status:503});}
}
