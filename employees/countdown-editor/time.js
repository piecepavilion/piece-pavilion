(function(root){
'use strict';
function parts(ms, zone) {
  const result = {};
  new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).forEach(p => {if(p.type !== 'literal') result[p.type] = p.value;});
  return result;
}
function localFields(iso, zone) {
  const p = parts(Date.parse(iso),zone);
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`};
}
function toInstant(date,time,zone) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)) throw Error('Choose a valid date and time.');
  const wall = Date.parse(date+'T'+time+':00Z');
  if(!Number.isFinite(wall)||new Date(wall).toISOString().slice(0,16)!==date+'T'+time) throw Error('Choose a valid date and time.');
  // Collect offsets on both sides of a possible daylight-saving transition.
  const offsets = new Set();
  for(let h=-36;h<=36;h+=6){
    const sample=wall+h*3600000, p=parts(sample,zone);
    offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`)-sample);
  }
  const matches=[...offsets].map(offset=>wall-offset).filter(ms=>{const p=localFields(new Date(ms).toISOString(),zone);return p.date===date&&p.time===time;}).sort((a,b)=>a-b);
  if(!matches.length) throw Error('That local time does not exist because the clocks change. Choose another time.');
  return new Date(matches[0]).toISOString();
}
const api={localFields,toInstant};
if(typeof module!=='undefined'&&module.exports)module.exports=api; else root.CountdownTime=api;
})(typeof window!=='undefined'?window:globalThis);
