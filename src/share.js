import {canonicalCharacteristic} from './linear.js';
import {clampPoint} from './canvas.js';
export const MAX_FRAGMENT_LENGTH=16000;
// The JSON import, saved sessions and links share this structural/resource gate.
export function validFile(x){return x&&Array.isArray(x.vertices)&&x.vertices.length<=80&&Array.isArray(x.arrows)&&x.arrows.length<=160&&Array.isArray(x.relations)&&x.relations.length<=320&&x.vertices.every(v=>v&&typeof v.id==='string'&&typeof v.label==='string'&&v.label.length<=32&&Number.isFinite(v.x)&&Number.isFinite(v.y))&&x.arrows.every(a=>a&&typeof a.id==='string'&&typeof a.label==='string'&&a.label.length<=32&&x.vertices.some(v=>v.id===a.source)&&x.vertices.some(v=>v.id===a.target))&&x.relations.every(r=>Array.isArray(r)&&r.length===2&&r.every(id=>x.arrows.some(a=>a.id===id)))&&new Set(x.vertices.map(v=>v.id)).size===x.vertices.length&&new Set(x.arrows.map(a=>a.id)).size===x.arrows.length}
function settings(data){
 if(!data||data.v!==1||!validFile(data.q)||(data.q.name!==undefined&&typeof data.q.name!=='string'))throw Error('This link is not a supported algebra presentation.');
 if(!Number.isInteger(data.d)||data.d<0||data.d>128)throw Error('Choose an integer degree from 0 to 128.');
 if(!['string','number'].includes(typeof data.c))throw Error('Invalid field characteristic in the link.');
 const characteristic=canonicalCharacteristic(data.c);
 const quiver=structuredClone(data.q);
 // Positions are kept within the editor's full drawing area, as for imported JSON.
 quiver.vertices.forEach(v=>Object.assign(v,clampPoint(v)));
 return {quiver,characteristic,degree:data.d};
}
export function encode(quiver,characteristic,degree){
 const value=settings({v:1,q:quiver,c:characteristic,d:degree});
 const bytes=new TextEncoder().encode(JSON.stringify({v:1,q:value.quiver,c:value.characteristic,d:value.degree}));
 const result='#a='+btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(result.length>MAX_FRAGMENT_LENGTH)throw Error('The share link exceeds 16 000 characters. Export JSON instead.');
 return result;
}
export function decode(fragment){
 if(typeof fragment!=='string'||fragment.length>MAX_FRAGMENT_LENGTH)throw Error('The share link exceeds 16 000 characters.');
 if(!/^#a=[A-Za-z0-9_-]+$/.test(fragment))throw Error('Malformed algebra link.');
 const payload=fragment.slice(3);
 if(payload.length%4===1)throw Error('Malformed algebra link.');
 let data;
 try{
  const raw=atob(payload.replaceAll('-','+').replaceAll('_','/'));
  if(btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')!==payload)throw Error();
  data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
 }catch{throw Error('Malformed algebra link.');}
 return settings(data);
}
