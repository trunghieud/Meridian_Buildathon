import {artwork} from '@/lib/artwork';
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 if(!(name in artwork))return new Response('Not found',{status:404});
 const bytes=Buffer.from(artwork[name as keyof typeof artwork],'base64');
 return new Response(bytes,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable'}});
}
