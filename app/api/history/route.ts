import {readNansenHistory,usageConfig} from '@/lib/nansen-usage';
import type {Period} from '@/lib/boardroom';

export async function GET(request:Request){
 const period=new URL(request.url).searchParams.get('period')??'1h';
 if(!['1h','1d','7d'].includes(period))return Response.json({error:'Invalid period'},{status:400});
 if(!usageConfig())return Response.json({period,points:[]},{headers:{'Cache-Control':'no-store'}});
 try{
  return Response.json({period,points:await readNansenHistory(period as Period)},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'History unavailable'},{status:503});}
}
