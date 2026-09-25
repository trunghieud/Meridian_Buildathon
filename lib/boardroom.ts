export const TOKEN='0x98096d17e191b3da1d5f99a6d7b3584351b11e18';
export type Period='1h'|'1d'|'7d';
export type Cohort={id:string;name:string;role:string;flow:number|null;wallets:number|null;status:'measured'|'quiet'|'missing'};
export type Meeting={period:Period;asOf:string;source:'snapshot'|'api';cohorts:Cohort[];warning?:string};
export const PERIOD_NAMES={'1h':'1 hour','1d':'24 hours','7d':'7 days'};
const people=[['smart','Smart Traders','The spreadsheet delegation'],['whale','Whales','The reinforced-chair committee'],['public','Public Figures','The publicity department']];
export function snapshot(period:Period):Meeting{
 const flows=period==='7d'?[143900,null,167600]:period==='1d'?[73700,null,null]:[null,null,null];
 const wallets=period==='7d'?[27,null,5]:period==='1d'?[4,null,null]:[null,null,null];
 return {period,asOf:'2026-09-25T16:13:00Z',source:'snapshot',cohorts:people.map(([id,name,role],i)=>({id,name,role,flow:flows[i],wallets:wallets[i],status:flows[i]!==null?'measured':period==='1h'&&i===0?'missing':'quiet'}))};
}
export function money(n:number|null){return n===null?'—':(n<0?'−':n>0?'+':'')+'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(Math.abs(n));}
export function statusLabel(c:Cohort){return c.status==='missing'?'Data unavailable':c.status==='quiet'?'No significant net flow':c.flow!>0?'Net inflow':c.flow!<0?'Net outflow':'Balanced net flow';}
export function joke(c:Cohort){
 if(c.status==='missing')return 'The spreadsheet is buffering. No motion will be passed on vibes alone.';
 if(c.status==='quiet')return c.id==='whale'?'Chair reinforced. Motion not detected.':'The cameras are ready. The wallets are keeping a low profile.';
 if(c.flow!<0)return c.id==='smart'?'The spreadsheets have requested an exit interview.':c.id==='whale'?'A large withdrawal. The chair is finally recovering.':'The publicity department has left through the side door.';
 if(c.flow===0)return 'Perfectly balanced. Nobody gets to claim victory.';
 return c.id==='smart'?'They brought spreadsheets to a BONER meeting. And positive net flows.':c.id==='whale'?'Exposure is increasing. So is the furniture budget.':'The VIP delegation is increasing its exposure. Cameras, please.';
}
export function verdict(m:Meeting){
 const smart=m.cohorts[0],pub=m.cohorts[2];
 if(m.cohorts.every(c=>c.status!=='measured'))return 'The room is quiet. The chairman refuses to manufacture excitement.';
 if(m.cohorts.every(c=>c.flow!==null&&c.flow>0))return 'Every delegation is increasing its exposure. HR has been notified.';
 if(m.cohorts.every(c=>c.flow!==null&&c.flow<0))return 'The meeting has been adjourned due to widespread shrinkage.';
 if(smart.flow!==null&&smart.flow>0&&pub.flow!==null&&pub.flow>0&&m.cohorts[1].status==='quiet')return 'Brains and fame are showing up. The whale has yet to make a splash.';
 if(smart.flow!==null&&smart.flow>0&&m.cohorts.slice(1).every(c=>c.status==='quiet'))return 'The brains are showing interest. Everyone else is practicing restraint.';
 if(m.cohorts.some(c=>c.flow!==null&&c.flow<0))return 'Some exposure is leaving the room. The minutes will record the shrinkage.';
 return 'Mixed participation. The chairman is keeping his enthusiasm professionally contained.';
}
export function dateLabel(iso:string){return new Date(iso).toLocaleString('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' PT';}
