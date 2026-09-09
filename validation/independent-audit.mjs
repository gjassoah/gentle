// Regression checks for the adversarial audit findings; no dependencies.
import assert from 'node:assert/strict';
import {Calculus, validate} from '../src/engine.js';
import {cohomologyFamilies, familyDimension, ringPresentation, structure, ribbon} from '../src/structure.js';
import {apply, reducer} from '../src/linear.js';

export function cycle(r) {
 const vertices=Array.from({length:r},(_,i)=>({id:`v${i}`,label:String(i)}));
 const arrows=vertices.map((v,i)=>({id:`a${i}`,label:`x${i}`,source:v.id,target:vertices[(i+1)%r].id}));
 return {vertices,arrows,relations:arrows.map((a,i)=>[a.id,arrows[(i+1)%r].id])};
}
const mode=process.argv[2]||'controls';
if(mode==='characteristic' || mode==='fallback') {
 const messages=[];globalThis.self={postMessage:m=>messages.push(m)};
 await import('../src/worker.js');
 let q=cycle(1),degree=0;
 if(mode==='fallback') {
  const vertices=Array.from({length:12},(_,i)=>({id:`line${i}`,label:`line${i}`}));
  const arrows=vertices.slice(1).map((v,i)=>({id:`lineArrow${i}`,label:`lineArrow${i}`,source:vertices[i].id,target:v.id}));
  q={vertices:[...vertices,...q.vertices],arrows:[...arrows,...q.arrows],relations:q.relations};degree=4;
 }
 self.onmessage({data:{id:1,type:'compute',quiver:q,characteristic:'02',degree}});
 const {result,error}=messages.at(-1);assert.equal(error,undefined);
 if(mode==='fallback') {
  console.log(JSON.stringify({mode:result.mode,characteristic:result.characteristic,hhCo:result.rows.map(r=>r.hhCo),expected:[3,2,2,2,2]}));
  assert.deepEqual(result.rows.map(r=>r.hhCo),[3,2,2,2,2],'F1: fallback returns incorrect dimensions');
 }
 const c=new Calculus(cycle(1),'02'),dualRing=result.ring.find(r=>r.vertices.includes('0'));
 console.log(JSON.stringify({mode:result.mode,characteristic:result.characteristic,
  actualHH1:c.group('co',1).basis.length,familyHH1:familyDimension(result.families,1),ring:dualRing},null,2));
 // D(x)=1 and xD(x)=x are independent derivations in characteristic two.
 assert.equal(familyDimension(result.families,1),2,'F1: accepted characteristic 02 loses D(x)=1');
 assert.equal(dualRing.exceptional,true);
} else if(mode==='controls') {
 let pairs=0;
 for(const p of [0,2,3,5]) for(const r of [1,2,3]) {
  const q=cycle(r),c=new Calculus(q,p);assert.deepEqual(validate(q),[]);
  assert.equal(structure(c.A).cycles.length,1);
  assert.equal(structure(c.A).cycles[0].length,r);
  for(let k=1;k<=5;k++) {
   const m=r*k,n=m-1;
   // For the length-m cyclic word, signed rotation is consistent iff
   // (-1)^(r*(m-1))=1. B repeats each of r distinct rotations k times.
   const survives=p===2 || (r*(m-1))%2===0;
   const expectedRank=survives && (p===0 || k%p!==0)?1:0;
   const source=c.group('ho',n),target=c.group('ho',n+1),R=reducer(c.F);
   for(const z of source.basis)R.add(target.project(apply(c.connes(n),z,c.space('ho',n+1).items.length,c.F)));
   assert.equal(R.pivots.length,expectedRank,JSON.stringify({p,r,k}));pairs++;
  }
  const reversed={...q,vertices:q.vertices.slice().reverse(),arrows:q.arrows.slice().reverse(),relations:q.relations.slice().reverse()};
  assert.deepEqual(new Calculus(reversed,p).report(2).rows.map(x=>[x.hhCo,x.hhHo,x.hc]),c.report(2).rows.map(x=>[x.hhCo,x.hhHo,x.hc]));
 }
 const c=new Calculus(cycle(1)),F=c.F;
 // Named cochains: x, D(x)=x, T(x,x)=1. All boundaries in HH^0 vanish.
 const named=(n,output)=>c.space('co',n).items.map(({p})=>c.A.paths[p].a.length===output?F.o:F.z);
 const D=named(1,1),T=named(2,0),x=named(0,1);
 assert.deepEqual(c.bracket(1,D,0,x).map(F.str),x.map(F.str));
 assert.deepEqual(c.bracket(1,D,2,T).map(F.str),T.map(v=>F.str(F.mul(F.from(-2),v))));
 assert.ok(c.group('co',4).project(c.cup(2,T,2,T)).some(v=>!F.isZero(v)));
 const two=new Calculus(cycle(2)),G=two.F;
 const D0=two.space('co',1).items.map(({t,p})=>two.A.paths[t[0]].a[0]==='a0' && p===t[0]?G.o:G.z);
 const z=two.space('ho',2).items.map(({t,p})=>two.A.paths[p].a.length?G.z:G.from(two.A.paths[t[0]].a[0]==='a0'?1:-1));
 const wanted=two.space('ho',1).items.map(({t,p})=>two.A.paths[p].a[0]==='a0' && two.A.paths[t[0]].a[0]==='a1'?G.from(-1):G.z);
 assert.deepEqual(two.cap(1,D0,2,z).map(G.str),wanted.map(G.str));
 assert.ok(two.group('ho',1).project(wanted).some(v=>!G.isZero(v)));
 for(const p of [0,2,3,5]) {
  const d=new Calculus(cycle(1),p);
  assert.equal(familyDimension(cohomologyFamilies(d.A,p),1),p===2?2:1);
  assert.equal(ringPresentation(d.A,p)[0].exceptional,p===2);
 }
 const r=ribbon(c.A);assert.equal(r.genus,0);
 assert.deepEqual(r.boundaries.map(b=>[b.markedPoints,b.forbiddenLength]).sort(),[[0,1],[1,0]]);
 console.log(`Controls passed: ${pairs} circuit/field/multiplicity B-rank checks; nonzero cup and brackets; order and canonical characteristic checks.`);
} else throw Error('Use controls, characteristic, or fallback');
