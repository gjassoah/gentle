import assert from 'node:assert/strict';
import {algebra,validate} from '../../src/engine.js';
import {structure,ribbon,ribbonFromQuiver} from '../../src/structure.js';
let seed=231108003; const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
const sortPairs=x=>x.map(b=>[b.markedPoints,b.forbiddenLength]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
let checked=0;
for(let trial=0;trial<1000;trial++){
 const n=1+next()%8, visits=Array.from({length:2*n},(_,i)=>Math.floor(i/2));
 for(let i=visits.length-1;i>0;i--){let j=next()%(i+1);[visits[i],visits[j]]=[visits[j],visits[i]]}
 const threads=[[]];for(const v of visits){if(threads.at(-1).length&&next()%3===0)threads.push([]);threads.at(-1).push(v)}
 const vertices=Array.from({length:n},(_,i)=>({id:`v${i}`,label:`${i}`})), arrows=[],allowed=new Set();
 for(const t of threads){let prev;for(let i=1;i<t.length;i++){const a={id:`a${arrows.length}`,label:`a${arrows.length}`,source:`v${t[i-1]}`,target:`v${t[i]}`};arrows.push(a);if(prev)allowed.add(`${prev.id},${a.id}`);prev=a}}
 const relations=[];for(const a of arrows)for(const b of arrows)if(a.target===b.source&&!allowed.has(`${a.id},${b.id}`))relations.push([a.id,b.id]);
 const q={vertices,arrows,relations};assert.deepEqual(validate(q),[],JSON.stringify(q));
 const A=algebra(q),s=structure(A),r=ribbon(A);assert.deepEqual(ribbonFromQuiver(q),r);
 // Independent face tracing on the original ordered-thread input.
 const sigma=[],alpha=[],marks=new Set(),at=new Map();let h=0;
 for(const t of threads){let first=h;for(const v of t){sigma[h]=h+1;const other=at.get(v);if(other!==undefined){alpha[h]=other;alpha[other]=h}else at.set(v,h);h++}sigma[h-1]=first;marks.add(h-1)}
 const faces=[],seen=new Set();for(let i=0;i<h;i++)if(!seen.has(i)){let x=i,L=0,M=0;do{seen.add(x);L++;M+=marks.has(x);x=alpha[sigma[x]]}while(x!==i);faces.push({markedPoints:M,forbiddenLength:L-M})}
 assert.deepEqual(sortPairs(r.boundaries),sortPairs(faces));
 assert.equal(r.boundaries.reduce((s,b)=>s+b.forbiddenLength,0),arrows.length);
 assert.equal(r.boundaries.reduce((s,b)=>s+b.markedPoints,0),r.threads.length);
 assert.equal(r.boundaries.reduce((s,b)=>s+b.winding,0),-2*r.euler||0);
 assert.equal(2*r.components-2*r.genus-r.boundaries.length,r.euler);
 assert.equal(s.components,r.components);
 // Maximal forbidden strings partition arrows outside relation-cycles.
 const listed=s.forbiddenChains.reduce((k,t)=>k+t.length,0)+s.cycles.reduce((k,c)=>k+c.length,0);assert.equal(listed,arrows.length);
 const unmarked=r.boundaries.filter(b=>b.markedPoints===0).map(b=>b.forbiddenLength).sort((a,b)=>a-b);
 assert.deepEqual(unmarked,s.cycles.map(c=>c.length).sort((a,b)=>a-b));
 checked++;
}
console.log(`PASS ${checked} generated gentle presentations: ribbon reconstruction, independent face cycles, Euler/genus, AAG sums, complete circuits, disconnected components.`);
