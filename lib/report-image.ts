import {money,statusLabel,verdict,dateLabel,type Meeting} from '@/lib/boardroom';

async function loadImage(src:string):Promise<HTMLImageElement>{
 const image=new window.Image();
 image.src=src;
 await image.decode();
 return image;
}

// The modal and download share these exact PNG pixels.
export async function createReportImage(daily:Meeting):Promise<string>{
 const [art,logo]=await Promise.all([loadImage('/boardroom-v4.webp'),loadImage('/api/art/boner-logo')]);
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1200;const ctx=canvas.getContext('2d');if(!ctx)throw Error();ctx.fillStyle='#0b1420';ctx.fillRect(0,0,1200,1200);
 {ctx.drawImage(art,0,0,art.naturalWidth,art.naturalWidth*594/1200,0,0,1200,594);const g=ctx.createLinearGradient(0,300,0,600);g.addColorStop(0,'#0b142000');g.addColorStop(1,'#0b1420');ctx.fillStyle=g;ctx.fillRect(0,300,1200,300);}
 {ctx.save();ctx.beginPath();ctx.arc(79,621,24,0,Math.PI*2);ctx.clip();ctx.drawImage(logo,55,597,48,48);ctx.restore();}ctx.fillStyle='#e8f35b';ctx.font='bold 22px Arial';ctx.fillText('THE BONER BOARDROOM / DAILY BRIEFING',120,628);ctx.fillStyle='#ffffff';ctx.font='bold 66px Georgia';ctx.fillText('Morning Wood Report',55,709);ctx.fillStyle='#aab7c8';ctx.font='22px Arial';ctx.fillText('24-hour flows · '+dateLabel(daily.asOf)+' · '+(daily.source==='snapshot'?'Dated snapshot':'API observation'),55,752);
 daily.cohorts.forEach((c,i)=>{const x=55+i*285;ctx.fillStyle='#172433';ctx.fillRect(x,797,270,160);ctx.fillStyle='#e6ecf4';ctx.font='bold 22px Arial';ctx.fillText(c.name,x+22,832);ctx.fillStyle=c.flow!==null&&c.flow>0?'#dcec70':c.flow!==null&&c.flow<0?'#ff9d9d':'#aab7c8';ctx.font='bold 34px Arial';ctx.fillText(c.status==='measured'?money(c.flow):c.status==='quiet'?'Quiet':'Unavailable',x+22,884);ctx.fillStyle='#aab7c8';ctx.font='18px Arial';ctx.fillText(statusLabel(c),x+22,921);});
 ctx.fillStyle='#ffffff';ctx.font='italic 27px Georgia';let line='',y=1010;for(const word of verdict(daily).split(' ')){if(ctx.measureText(line+word).width>1080){ctx.fillText(line,55,y);y+=36;line='';}line+=word+' ';}ctx.fillText(line,55,y);ctx.fillStyle='#aab7c8';ctx.font='18px Arial';ctx.fillText('Net flows are token movements, not confirmed buys. Cohorts can overlap.',55,1120);ctx.fillText('Powered by Nansen API · nansen.ai · BONER / Robinhood Chain',55,1155);

 return canvas.toDataURL('image/png');
}
