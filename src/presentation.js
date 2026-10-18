// Text I/O only: mathematical validation remains in engine.js.
import {createConvention} from './convention.js';
const bare = s => s.length > 0 && !/[\s:,#→=*·"]|->/.test(s);
const token = '(?:"(?:[^"\\\\]|\\\\.)*"|[^\\s:,#→=*·"]+)';
const arrowLine = new RegExp(`^(${token})\\s*:\\s*(${token})\\s*(?:->|→)\\s*(${token})$`);
const relationLine = new RegExp(`^(${token})(?:\\s*[·*]\\s*|\\s+)(${token})\\s*=\\s*0$`);
const label = s => s.startsWith('"') ? JSON.parse(s) : (bare(s) ? s : null);
const quoted = s => bare(s) && !['name','vertices','convention'].includes(s) ? s : JSON.stringify(s);
function uncomment(s){let quoted=false,escaped=false;for(let i=0;i<s.length;i++){const c=s[i];if(escaped){escaped=false;continue}if(quoted&&c==='\\'){escaped=true;continue}if(c==='"')quoted=!quoted;if(c==='#'&&!quoted)return s.slice(0,i)}return s}
function labels(s){const result=[];let start=0,quoted=false,escaped=false;for(let i=0;i<=s.length;i++){const c=s[i];if(escaped){escaped=false;continue}if(quoted&&c==='\\'){escaped=true;continue}if(c==='"')quoted=!quoted;if((c===','&&!quoted)||i===s.length){const v=label(s.slice(start,i).trim());if(typeof v!=='string'||!v.trim())throw Error('Invalid vertex label.');result.push(v);start=i+1}}if(quoted)throw Error('Unclosed quoted label.');return result}
/** Return {quiver, errors}; errors have a one-based line and a message. */
export function parse(text,convention='left'){
 const errors=[],vertices=[],arrows=[],relations=[],vs=new Map(),as=new Map(),pending=[];
 let name='Untitled algebra',named=false,listed=false,declared=false;
 const error=(line,message)=>errors.push({line,message});
 const vertex=s=>{if(!vs.has(s)){const v={id:`v${vertices.length+1}`,label:s,x:400,y:220};vs.set(s,v);vertices.push(v)}return vs.get(s).id};
 if(typeof text!=='string')return {quiver:null,errors:[{line:1,message:'Expected presentation text.'}]};
 text.split(/\r?\n/).forEach((raw,i)=>{const line=i+1,s=uncomment(raw).trim();if(!s)return;
  try{
   if(s.startsWith('convention:')){if(declared){error(line,'Duplicate convention statement.');return}declared=true;const value=s.slice(11).trim();if(!['left','right'].includes(value)){error(line,'Convention must be left or right.');return}convention=value;return}
   if(s.startsWith('name:')){if(named){error(line,'Duplicate name statement.');return}named=true;const value=s.slice(5).trim();name=value.startsWith('"')?JSON.parse(value):value;if(typeof name!=='string')throw Error('Invalid name.');return}
   if(s.startsWith('vertices:')){if(listed){error(line,'Duplicate vertices statement.');return}listed=true;const seen=new Set();for(const value of labels(s.slice(9))){if(seen.has(value))error(line,`Duplicate vertex label “${value}”.`);seen.add(value);vertex(value)}return}
   const a=s.match(arrowLine);if(a){const [title,source,target]=a.slice(1).map(label);if([title,source,target].some(v=>typeof v!=='string'||!v.trim()))throw Error('Invalid label.');if(as.has(title)){error(line,`Duplicate arrow label “${title}”.`);return}const item={id:`a${arrows.length+1}`,label:title,source:vertex(source),target:vertex(target)};arrows.push(item);as.set(title,item);return}
   const r=s.match(relationLine);if(r){pending.push({line,labels:r.slice(1).map(label)});return}
   error(line,'Malformed line. Use α: 1 -> 2 or α β = 0.');
  }catch{error(line,'Malformed line or label.');}
 });
 const display=createConvention({vertices,arrows,relations},convention);
 for(const r of pending){const ids=r.labels.map(s=>as.get(s));if(ids.some(a=>!a)){error(r.line,`Unknown arrow “${r.labels[ids.findIndex(a=>!a)]}”.`);continue}const [a,b]=display.sequence(ids);if(a.target!==b.source){error(r.line,'A relation must be a composable pair of arrows in the declared path convention.');continue}relations.push([a.id,b.id])}
 const quiver={name,vertices,arrows,relations};
 errors.sort((a,b)=>a.line-b.line);
 return {quiver:errors.length?null:quiver,errors,convention:display.name};
}
export function format(q,convention='left'){
 const vertices=new Map(q.vertices.map(v=>[v.id,v.label])),arrows=new Map(q.arrows.map(a=>[a.id,a.label]));
 const name=String(q.name??'Untitled algebra'),display=createConvention(q,convention);
 return [`convention: ${display.name}`,`name: ${(/[#\r\n]|^"/.test(name)||name!==name.trim())?JSON.stringify(name):name}`,
  ...(q.vertices.length?[`vertices: ${q.vertices.map(v=>quoted(v.label)).join(', ')}`]:[]),
  ...q.arrows.map(a=>`${quoted(a.label)}: ${quoted(vertices.get(a.source))} -> ${quoted(vertices.get(a.target))}`),
  ...q.relations.map(r=>`${display.sequence(r).map(id=>quoted(arrows.get(id))).join(' ')} = 0`)].join('\n')+'\n';
}
// Shared with Arrange; all positions lie inside the existing canvas bounds.
export function arrangeVertices(vertices){return vertices.map((v,i)=>{const t=2*Math.PI*i/vertices.length-Math.PI/2;return {...v,x:vertices.length===1?400:400+210*Math.cos(t),y:vertices.length===1?220:220+135*Math.sin(t)}})}
export function preservePositions(next,previous){
 const old=new Map(previous.vertices.map(v=>[v.label,v])),arranged=new Map(arrangeVertices(next.vertices.filter(v=>!old.has(v.label))).map(v=>[v.label,v]));
 const result={...next,vertices:next.vertices.map(v=>({...v,...arranged.get(v.label)}))},fresh=result.vertices.filter(v=>!old.has(v.label));
 for(const v of result.vertices){const before=old.get(v.label);if(before){v.x=before.x;v.y=before.y}}
 // Use the existing keyboard grid when an arranged position overlaps a survivor.
 const placed=result.vertices.filter(v=>old.has(v.label));
 for(const v of fresh){if(placed.some(p=>Math.hypot(p.x-v.x,p.y-v.y)<40)){const candidates=Array.from({length:80},(_,i)=>({x:70+i%10*73,y:120+Math.floor(i/10)*33}));const p=candidates.reduce((best,p)=>{const distance=Math.min(...placed.map(v=>Math.hypot(p.x-v.x,p.y-v.y)));return distance>best.distance?{...p,distance}:best},{x:v.x,y:v.y,distance:-1});v.x=p.x;v.y=p.y}placed.push(v)}
 return result;
}
