import {readHolderCountHistory,usageConfig} from '@/lib/nansen-usage';

export const dynamic='force-dynamic';

export async function GET(){
 if(!usageConfig())return Response.json({points:[]},{headers:{'Cache-Control':'no-store'}});
 try{
  return Response.json({points:await readHolderCountHistory()},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Holder count history unavailable'},{status:503});}
}
