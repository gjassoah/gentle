import test from 'node:test';
import assert from 'node:assert/strict';
import {derivedInvariant,compareDerived,symplecticReduction} from '../src/derived.js';
import {examples} from '../src/examples.js';
import {latexDerivedReport} from '../src/export.js';
import {algebra} from '../src/engine.js';
import {ribbon,ribbonFromQuiver} from '../src/structure.js';

// Construct presentations from ordered permitted threads. Each ribbon edge
// occurs twice; all composable pairs crossing between threads are forbidden.
function fromThreads(threads){
 const vertices=[...new Set(threads.flat())].map(id=>({id:String(id),label:String(id),x:0,y:0})),arrows=[],allowed=new Set();
 for(const thread of threads){let last;for(let i=1;i<thread.length;i++){const id='a'+arrows.length;arrows.push({id,label:id,source:String(thread[i-1]),target:String(thread[i])});if(last)allowed.add(last+','+id);last=id}}
 return {vertices,arrows,relations:arrows.flatMap(a=>arrows.filter(b=>a.target===b.source&&!allowed.has(a.id+','+b.id)).map(b=>[a.id,b.id]))};
}
test('APS section 9: same AAG invariant, gcd 0 versus 2',()=>{
 const a=derivedInvariant(examples.aps1),b=derivedInvariant(examples.aps2);
 assert.deepEqual(a.components[0].boundaries,b.components[0].boundaries);
 assert.deepEqual(a.components[0].signature,{genus:1,boundaries:[[2,-2]],branch:'genus-one',gcd:0});
 assert.equal(b.components[0].gcd,2);
 assert.equal(compareDerived(examples.aps1,examples.aps2,0,0).equivalent,false);
});
test('genus zero, punctures, field validation and disconnected component multisets',()=>{
 const fork=structuredClone(examples.a3);fork.arrows[0].source='v2';fork.arrows[0].target='v1';
 assert.equal(compareDerived(examples.a3,fork,0,'00').equivalent,true);
 assert.equal(compareDerived(examples.a3,fork,0,2).equivalent,null);
 assert.throws(()=>compareDerived(examples.a3,fork,4,4),/prime/);
 assert.deepEqual(derivedInvariant(examples.dual).components[0].signature,{genus:0,boundaries:[[0,-1],[1,1]],branch:'genus-zero'});
 const separate={vertices:[{id:'x',label:'x'},{id:'y',label:'y'}],arrows:[],relations:[]};
 assert.equal(derivedInvariant(separate).components.length,2);
 assert.notEqual(derivedInvariant(separate).signature,derivedInvariant(examples.field).signature);
 assert.equal(derivedInvariant(separate).signature,derivedInvariant({...separate,vertices:separate.vertices.slice().reverse()}).signature);
 assert.throws(()=>derivedInvariant({...examples.dual,relations:[]}),/infinite-dimensional/);
});
test('genus two: identical boundary data distinguished by Arf',()=>{
 const a=fromThreads([[0,1,2,3,4],[0,1,2,3,4]]),b=fromThreads([[0,1,2,3,4],[0,3,4,1,2]]);
 const ca=derivedInvariant(a).components[0],cb=derivedInvariant(b).components[0];
 assert.deepEqual(ca.signature,{genus:2,boundaries:[[2,-6]],branch:'arf',arf:1});
 assert.equal(cb.arf,0);assert.deepEqual(ca.boundaries,cb.boundaries);
 assert.equal(compareDerived(a,b,2,2).equivalent,false);
 // Independent Gauss-sum check: sum (-1)^q = (-1)^Arf 2^g.
 for(const c of [ca,cb]){let sum=0;for(let bits=0;bits<16;bits++){let value=0;for(let i=0;i<4;i++)if(bits>>i&1){value^=((c.curves[i].winding/2+1)%2+2)%2;for(let j=i+1;j<4;j++)if(bits>>j&1)value^=c.intersection[i][j]}sum+=value?-1:1}assert.equal(sum,(c.arf?-1:1)*4)}
});
test('symplectic elimination retains a radical and detects failure of quadratic descent',()=>{
 const matrix=[[0,1,0],[1,0,0],[0,0,0]],r=symplecticReduction(matrix,[1,1,0]);assert.equal(r.rank,2);assert.equal(r.arf,1);assert.deepEqual(r.radicalValues,[0]);
 assert.deepEqual(symplecticReduction(matrix,[1,1,1]).radicalValues,[1]);
});
test('thread construction agrees with path enumeration and works beyond its limit',()=>{
 for(const q of Object.values(examples))assert.deepEqual(ribbonFromQuiver(q),ribbon(algebra(q)));
 const q=fromThreads([Array.from({length:80},(_,i)=>i)]);
 assert.throws(()=>algebra(q),/200-path/);
 assert.deepEqual(derivedInvariant(q).components[0].signature,{genus:0,boundaries:[[81,2]],branch:'genus-zero'});
});
test('higher-genus odd and even boundary branches',()=>{
 const odd=fromThreads([[0,1,0,2,1,3,2,3]]);
 assert.equal(derivedInvariant(odd).components[0].branch,'odd-winding');
 const even=fromThreads([[7,1,0],[1,3,4,5,2,7,6,0],[5,2,6,4]]);
 assert.equal(derivedInvariant(even).components[0].branch,'even-boundary-zero-mod-four');
});
test('deterministic generated presentations: invariance under relabeling and input order',()=>{
 let seed=42;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
 for(let sample=0;sample<300;sample++){
  const n=3+random(7),half=Array.from({length:n},(_,i)=>[i,i]).flat();
  for(let i=half.length-1;i>0;i--){const j=random(i+1);[half[i],half[j]]=[half[j],half[i]]}
  const threads=[[]];for(const h of half){if(threads.at(-1).length&&random(5)===0)threads.push([]);threads.at(-1).push(h)}
  const q=fromThreads(threads),expected=derivedInvariant(q).signature;
  const renamed={vertices:q.vertices.slice().reverse().map(v=>({...v,id:'v'+v.id,label:'vertex '+v.label})),arrows:q.arrows.slice().reverse().map(a=>({...a,id:'new'+a.id,label:'arrow '+a.id,source:'v'+a.source,target:'v'+a.target})),relations:q.relations.slice().reverse().map(r=>r.map(id=>'new'+id))};
  assert.equal(derivedInvariant(renamed).signature,expected,JSON.stringify(threads));
 }
});
test('derived LaTeX contains presentations, distinguishing invariant and comparison',()=>{
 const result=compareDerived(examples.aps1,examples.aps2,0,0),comparison={left:{name:examples.aps1.name,quiver:examples.aps1,characteristic:'0'},right:{name:examples.aps2.name,quiver:examples.aps2,characteristic:'0'},result};
 const tex=latexDerivedReport(examples.aps1,result.left,comparison);
 assert.match(tex,/Genus-one gcd: \$0\$/);assert.match(tex,/Genus-one gcd: \$2\$/);assert.match(tex,/invariants differ/);assert.match(tex,/Intersection matrix/);assert.match(tex,/Zero relations/);
});
