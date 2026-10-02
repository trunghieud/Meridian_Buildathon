// Collection slots open at 06:00 and 18:00 America/New_York, including DST.
export function collectionSlot(now:Date=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 let day=`${part('year')}-${part('month')}-${part('day')}`;
 const hour=Number(part('hour'));
 if(hour<6)day=new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return `${day}-${hour>=6&&hour<18?'06':'18'}`;
}
