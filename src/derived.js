import {validate} from './engine.js';
import {ribbonFromQuiver} from './structure.js';
import {field} from './linear.js';

export const DERIVED_VERSION = 'aps-1';
const mod2 = n => ((n % 2) + 2) % 2;
const mod4 = n => ((n % 4) + 4) % 4;
const gcd = (a,b) => {a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a};
const unit = (n,i) => Array.from({length:n},(_,j)=>+(i===j));

// Mod-2 symplectic elimination also supplies a radical basis, so descent of
// the quadratic refinement is checked rather than assumed.
export function symplecticReduction(matrix, values=null) {
 const n=matrix.length;
 const pair=(a,b)=>{let s=0;for(let i=0;i<n;i++)if(a[i])for(let j=0;j<n;j++)if(b[j])s^=matrix[i][j];return s};
 const quadratic=a=>{let s=0;for(let i=0;i<n;i++)if(a[i]){s^=values[i];for(let j=i+1;j<n;j++)if(a[j])s^=matrix[i][j]}return s};
 let rest=Array.from({length:n},(_,i)=>unit(n,i));const pairs=[];
 while(rest.length){let i=-1,j=-1;outer:for(let a=0;a<rest.length;a++)for(let b=a+1;b<rest.length;b++)if(pair(rest[a],rest[b])){i=a;j=b;break outer}if(i<0)break;
  const a=rest[i],b=rest[j];pairs.push({a,b,...(values?{qa:quadratic(a),qb:quadratic(b)}:{})});
  rest=rest.filter((_,k)=>k!==i&&k!==j).map(v=>{const x=pair(v,b),y=pair(v,a);return v.map((z,k)=>z^(x&a[k])^(y&b[k]))});
 }
 return {rank:2*pairs.length,pairs,radical:rest,...(values?{radicalValues:rest.map(quadratic),arf:pairs.reduce((s,p)=>s^(p.qa&p.qb),0)}:{})};
}

function connectedInvariant(q, reverseTree=false) {
 const R=ribbonFromQuiver(q),{half,alpha}=R.combinatorics;
 const rotations=R.threads.map((_,i)=>half.flatMap((h,j)=>h.thread===i?[j]:[]));
 const position=half.map((h,i)=>rotations[h.thread].indexOf(i));
 const edges=[];for(let h=0;h<half.length;h++)if(h<alpha[h])edges.push([h,alpha[h]]);
 const parent=rotations.map((_,i)=>i),find=x=>{while(parent[x]!==x)x=parent[x];return x};
 const tree=[],chords=[],adj=rotations.map(()=>[]);
 for(const e of (reverseTree?edges.slice().reverse():edges)){const [h,k]=e,u=half[h].thread,v=half[k].thread;if(find(u)!==find(v)){parent[find(u)]=find(v);tree.push(e);adj[u].push(h);adj[v].push(k)}else chords.push(e)}
 // Each chord plus its unique tree return path is an embedded simple cycle.
 function treePath(start,end){const walk=(v,prev)=>{if(v===end)return [];for(const h of adj[v]){const w=half[alpha[h]].thread;if(w===prev)continue;const t=walk(w,v);if(t)return [h,...t]}return null};return walk(start,-1)}
 const curves=chords.map(([h,k],i)=>{const walk=[h,...treePath(half[k].thread,half[h].thread)];let winding=0;const turns=[];
  for(let j=0;j<walk.length;j++){const incoming=alpha[walk[j]],outgoing=walk[(j+1)%walk.length];if(incoming===outgoing||half[incoming].thread!==half[outgoing].thread)throw Error('Derived invariant check failed: invalid simple graph cycle.');const turn=position[outgoing]<position[incoming]?1:-1;turns.push(turn);winding+=turn}
  return {name:`γ${i+1}`,winding,walk:walk.map(d=>({edge:q.vertices.find(v=>v.id===half[d].vertex).label,from:half[d].thread+1,to:half[alpha[d]].thread+1})),turns};
 });
 // Contract a spanning tree in the oriented ribbon graph. Chord endpoints
 // alternate exactly when the corresponding cycle classes intersect mod 2.
 let cycles=rotations.map(x=>x.slice());
 for(const [h,k] of tree){const i=cycles.findIndex(c=>c.includes(h)),j=cycles.findIndex(c=>c.includes(k));if(i===j)throw Error('Derived invariant check failed: tree contraction created a loop.');const a=cycles[i],b=cycles[j],ia=a.indexOf(h),ib=b.indexOf(k);const merged=[...a.slice(ia+1),...a.slice(0,ia),...b.slice(ib+1),...b.slice(0,ib)];cycles=cycles.filter((_,x)=>x!==i&&x!==j);cycles.push(merged)}
 const circle=cycles.flat(),at=new Map(circle.map((h,i)=>[h,i]));
 const intersection=chords.map(([a,b],i)=>chords.map(([c,d],j)=>{if(i===j)return 0;let x=at.get(a),y=at.get(b);if(x>y)[x,y]=[y,x];return +((at.get(c)>x&&at.get(c)<y)!==(at.get(d)>x&&at.get(d)<y))}));
 const reduction=symplecticReduction(intersection);
 if(reduction.rank!==2*R.genus||curves.length!==2*R.genus+R.boundaries.length-1)throw Error('Derived invariant check failed: homology rank disagrees with the surface genus.');
 // APS uses the opposite boundary orientation to the TT surface panel.
 const boundaries=R.boundaries.map(b=>({markedPoints:b.markedPoints,forbiddenLength:b.forbiddenLength,winding:-b.winding})).sort((a,b)=>a.markedPoints-b.markedPoints||a.winding-b.winding);
 if(boundaries.reduce((s,b)=>s+b.winding,0)!==4-4*R.genus-2*boundaries.length)throw Error('Derived invariant check failed: boundary winding sum.');
 const g=R.genus,odd=curves.some(c=>mod2(c.winding))||boundaries.some(b=>mod2(b.winding));
 let branch='genus-zero',gcdValue=null,arf=null,quadratic=null;
 if(g===1){branch='genus-one';gcdValue=[...boundaries.map(b=>b.winding+2),...curves.filter((_,i)=>intersection[i].some(Boolean)).map(c=>c.winding)].reduce(gcd,0)}
 if(g>=2){if(odd)branch='odd-winding';else if(boundaries.some(b=>mod4(b.winding)===0))branch='even-boundary-zero-mod-four';else{branch='arf';quadratic=symplecticReduction(intersection,curves.map(c=>mod2(c.winding/2+1)));if(quadratic.radicalValues.some(Boolean))throw Error('Derived invariant check failed: quadratic form does not descend to the closed surface.');arf=quadratic.arf}}
 const signature={genus:g,boundaries:boundaries.map(b=>[b.markedPoints,b.winding]),branch,...(g===1?{gcd:gcdValue}:{}),...(branch==='arf'?{arf}:{})};
 return {signature,genus:g,boundaries,markedPoints:R.markedPoints,ordinaryBoundaries:boundaries.filter(b=>b.markedPoints>0).length,punctures:boundaries.filter(b=>!b.markedPoints).length,branch,gcd:gcdValue,arf,oddWinding:odd,curves,intersection,quadratic,homologyRank:curves.length};
}

export function derivedInvariant(q) {
 // Validate first, including finite dimensionality and all gentle conditions.
 const errors=validate(q);if(errors.length)throw Error(errors.join(' '));
 if(q.vertices.length>80||q.arrows.length>160||q.relations.length>320)throw Error('Derived invariant input limit: 80 vertices, 160 arrows and 320 relations.');
 const seen=new Set(),components=[];
 for(const v of q.vertices)if(!seen.has(v.id)){const todo=[v.id],ids=new Set();while(todo.length){const x=todo.pop();if(ids.has(x))continue;ids.add(x);seen.add(x);for(const a of q.arrows){if(a.source===x)todo.push(a.target);if(a.target===x)todo.push(a.source)}}
  const arrows=q.arrows.filter(a=>ids.has(a.source)),arrowIds=new Set(arrows.map(a=>a.id));const sub={vertices:q.vertices.filter(v=>ids.has(v.id)),arrows,relations:q.relations.filter(r=>r.every(a=>arrowIds.has(a)))};
  const result=connectedInvariant(sub),alternate=connectedInvariant(sub,true);
  if(JSON.stringify(result.signature)!==JSON.stringify(alternate.signature))throw Error('Derived invariant check failed: spanning-tree independence.');
  components.push({...result,vertices:sub.vertices.map(v=>v.label)});
 }
 const signatures=components.map(c=>JSON.stringify(c.signature)).sort();
 return {version:DERIVED_VERSION,source:'https://doi.org/10.1007/s00029-022-00822-x',components,signature:JSON.stringify(signatures),checks:['Gentle and finite-dimensional presentation','Ribbon homology rank = 2g + b + p − 1','Intersection rank = 2g','APS boundary winding sum = 4 − 4g − 2(b+p)','Forward and reverse spanning trees give identical invariants','Quadratic refinement vanishes on the radical whenever Arf is required']};
}

export function compareDerived(left,right,leftCharacteristic,rightCharacteristic){
 if(field(leftCharacteristic).p!==field(rightCharacteristic).p)return {status:'different-fields',equivalent:null,reason:'These tabs use different characteristics. Derived equivalence here is a comparison over the same ground field; select the same characteristic in both tabs.'};
 const a=derivedInvariant(left),b=derivedInvariant(right),equivalent=a.signature===b.signature;
 return {status:equivalent?'equivalent':'not-equivalent',equivalent,left:a,right:b,reason:equivalent?'The complete component invariants agree (Amiot–Plamondon–Schroll, Theorem 7.4).':'The complete component invariants differ (Amiot–Plamondon–Schroll, Theorem 7.4).'};
}
