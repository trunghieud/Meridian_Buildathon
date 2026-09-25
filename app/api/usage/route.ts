import {timingSafeEqual} from 'node:crypto';
import {readNansenUsage,usageConfig} from '@/lib/nansen-usage';

export async function GET(request:Request){
 const secret=process.env.NANSEN_USAGE_ADMIN_TOKEN;
 if(!secret||!usageConfig())return Response.json({error:'Usage report is not configured'},{status:503});
 const supplied=request.headers.get('authorization')?.replace(/^Bearer /i,'')??'';
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await readNansenUsage(),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Usage store unavailable'},{status:503});}
}
