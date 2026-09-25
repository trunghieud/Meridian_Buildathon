// Web Speech exposes names and languages, but no standardized gender field.
// Use recognized male English voices only; never silently fall back to a female voice.
export function selectChairmanVoice<T extends {name:string;lang:string}>(voices:T[]):T|null {
 const ranked = voices.filter(v=>/^en(?:-|_)/i.test(v.lang)).map(v=>{
  const name=v.name.toLowerCase();
  const score=/\b(daniel|guy|george)\b/.test(name)?100:/\b(google uk english male|david|james|ryan|thomas|arthur|aaron|alex|fred)\b/.test(name)?80:/\bmale\b/.test(name)?50:0;
  return {voice:v,score};
 }).filter(v=>v.score>0).sort((a,b)=>b.score-a.score);
 return ranked[0]?.voice??null;
}
