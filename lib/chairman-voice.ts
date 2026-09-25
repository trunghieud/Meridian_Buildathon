// Web Speech has no standardized gender field. Accept only specifically named
// English male voices; an unknown voice must never trigger the browser default.
export function chairmanVoices<T extends {name:string;lang:string;voiceURI:string}>(voices:T[]):T[] {
 const score=(voice:T)=>{
  if(!/^en(?:-|_)/i.test(voice.lang)||/\bfemale\b|\bwoman\b/i.test(voice.name))return 0;
  const name=voice.name.toLowerCase();
  if(/google (?:uk|us) english male/.test(name))return 100;
  if(/\b(?:microsoft )?guy\b/.test(name))return 95;
  if(/\b(?:microsoft )?david\b/.test(name))return 90;
  if(/\bdaniel\b/.test(name))return 85;
  if(/\b(?:microsoft )?george\b/.test(name))return 80;
  if(/\b(?:alex|fred|aaron)\b/.test(name))return 70;
  return /\bmale\b/.test(name)?60:0;
 };
 return voices.map(voice=>({voice,score:score(voice)})).filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score).map(x=>x.voice);
}

export function selectChairmanVoice<T extends {name:string;lang:string;voiceURI:string}>(voices:T[],preferredURI?:string):T|null {
 const approved=chairmanVoices(voices);
 return approved.find(voice=>voice.voiceURI===preferredURI)??approved[0]??null;
}
