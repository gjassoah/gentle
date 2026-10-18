import assert from 'node:assert/strict';
import {Calculus,validate} from '../../src/engine.js';
import {cohomologyFamilies,familyDimension,homologyFormula} from '../../src/structure.js';
import {apply,reducer,quotient} from '../../src/linear.js';
const ring=(r,attached=false)=>({vertices:Array.from({length:r+(attached?1:0)},(_,i)=>({id:String(i),label:String(i)})),arrows:[...Array.from({length:r},(_,i)=>({id:'a'+i,label:'a'+i,source:String(i),target:String((i+1)%r)})),...(attached?[{id:'b',label:'b',source:'0',target:String(r)}]:[])],relations:Array.from({length:r},(_,i)=>['a'+i,'a'+((i+1)%r)])});
let total=0,materialized=0;
for(const r of [1,2,3,4,5])for(const attach of [false,true])for(const p of [0,2,3,5,7]){
 const q=ring(r,attach),c=new Calculus(q,p),families=cohomologyFamilies(c.A,p);
 for(let n=0;n<=15;n++){
  const f=homologyFormula(c.A,p,n);
  assert.equal(f.hh,c.group('ho',n,'bardzell').basis.length,JSON.stringify({q,p,n,kind:'ho'}));
  assert.equal(familyDimension(families,n),c.group('co',n,'bardzell').basis.length,JSON.stringify({q,p,n,kind:'co'}));
  total++;
  if(n>8)continue;
  try {
   const ho=c.group('ho',n),next=c.group('ho',n+1),F=c.F;
   const B=ho.basis.map(v=>next.project(apply(c.connes(n),v,c.space('ho',n+1).items.length,F)));
   const R=reducer(F);B.forEach(v=>R.add(v));assert.equal(R.pivots.length,f.bRank);
   const previous=n?c.group('ho',n-1).basis.map(v=>ho.project(apply(c.connes(n-1),v,c.space('ho',n).items.length,F))):[];
   assert.equal(quotient(B,previous,ho.basis.length,F).basis.length,f.deRham);
   assert.equal(c.cyclic(n).basis.length,f.hc);materialized++;
  } catch(e) {if(!/limit|exceeds/.test(e.message))throw e;}
 }
}
let seed=0x5a17;const random=n=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed%n};
let accepted=0,skips=0;
for(let t=0;t<2500;t++){
 const vn=2+random(3),an=1+random(5),q={vertices:Array.from({length:vn},(_,i)=>({id:String(i),label:String(i)})),arrows:Array.from({length:an},(_,i)=>({id:'a'+i,label:'a'+i,source:String(random(vn)),target:String(random(vn))})),relations:[]};
 for(const a of q.arrows)for(const b of q.arrows)if(a.target===b.source&&random(2))q.relations.push([a.id,b.id]);
 if(validate(q).length)continue;accepted++;
 for(const p of [0,2,3]){
  const c=new Calculus(q,p),families=cohomologyFamilies(c.A,p);
  for(let n=0;n<6;n++){
   const f=homologyFormula(c.A,p,n);
   assert.equal(f.hh,c.group('ho',n,'bardzell').basis.length,JSON.stringify({q,p,n,kind:'ho'}));
   assert.equal(familyDimension(families,n),c.group('co',n,'bardzell').basis.length,JSON.stringify({q,p,n,kind:'co'}));
   total++;
   if(n>3)continue;
   try {assert.equal(c.group('co',n).basis.length,familyDimension(families,n));assert.equal(c.group('ho',n).basis.length,f.hh);assert.equal(c.cyclic(n).basis.length,f.hc);materialized++;}catch(e){if(!/limit|exceeds/.test(e.message))throw e;skips++;}
  }
 }
}
console.log(JSON.stringify({totalDegreeCharacteristicCases:total,materializedCases:materialized,randomAcceptedPresentations:accepted,resourceSkips:skips,seed:'0x5a17'}));
