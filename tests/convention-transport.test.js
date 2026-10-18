import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculus} from '../src/engine.js';
import {apply,addScaled,coordinates,identityVector,zeros} from '../src/linear.js';
import {createConvention} from '../src/convention.js';
import {examples} from '../src/examples.js';

// These are exactly the four presentations generated in validation/csss26/conventions.mjs.
// Keep the oracle below independent of convention.js: it acts on actual bar vectors in A^op.
const make=(ends,relations)=>({vertices:[...new Set(ends.flat())].map(id=>({id,label:id})),arrows:ends.map(([source,target],i)=>({id:'a'+i,label:'a'+i,source,target})),relations:relations.map(r=>r.map(i=>'a'+i))});
const generated=[make([['v','v']],[[0,0]]),make([['v','w'],['w','v']],[[1,0]]),make([['v','v'],['v','w']],[[0,0]]),make([['v','w'],['w','x'],['x','v']],[[0,1],[1,2],[2,0]])];
const presentations=[...Object.entries(examples),...generated.map((q,i)=>['conventions-'+i,q])];
const pathKey=p=>JSON.stringify(p.a.length?p.a:['idempotent',p.s]);
const termKey=t=>JSON.stringify([t.summand,t.input.map(p=>p.arrows.length?p.arrows:['idempotent',p.vertex]),t.output.arrows.length?t.output.arrows:['idempotent',t.output.vertex]]);
const semanticTerms=terms=>terms.map(t=>[termKey(t),t.coefficient,t.input.map(p=>p.notation),t.output.notation,t.term]).sort((a,b)=>a[0].localeCompare(b[0]));
const sameVector=(a,b,F,message)=>assert.deepEqual(a.map(F.str),b.map(F.str),message);

function transportOracle(q,characteristic){
 const c=new Calculus(q,characteristic),F=c.F;
 const opposite={...q,arrows:q.arrows.map(a=>({...a,source:a.target,target:a.source})),relations:q.relations.map(r=>r.slice().reverse())};
 const op=new Calculus(opposite,characteristic),pathIndex=new Map(op.A.paths.map((p,i)=>[pathKey(p),i]));
 const pathMap=c.A.paths.map(p=>pathIndex.get(pathKey({...p,a:p.a.slice().reverse(),s:p.e})));
 assert.ok(pathMap.every(i=>Number.isInteger(i)));
 const indices=new Map();
 function permutation(kind,n,model='bar'){
  const key=kind+':'+n+':'+model;if(indices.has(key))return indices.get(key);
  const src=c.space(kind,n,model),dst=op.space(kind,n,model);
  const result=src.items.map(x=>dst.index.get(`${x.t.map(i=>pathMap[i]).reverse().join(',')}|${pathMap[x.p]}`));
  assert.ok(result.every(i=>Number.isInteger(i)),key);indices.set(key,result);return result;
 }
 function T(kind,n,v,model='bar'){
  if(n<0)return [];
  const out=zeros(op.space(kind,n,model).items.length,F),sign=F.from((-1)**(n*(n-1)/2));
  permutation(kind,n,model).forEach((j,i)=>{out[j]=F.mul(sign,v[i])});return out;
 }
 function S(n,v){
  if(n<0)return [];
  const out=zeros(op.cyclicSpace(n).items.length,F),destination=op.cyclicSpace(n);
  c.cyclicSpace(n).items.forEach(({k,i},j)=>{
   const target=destination.index.get(`${k}:${permutation('ho',k)[i]}`);
   // The extra column sign is essential: bT=-Tb, whereas BT=TB.
   out[target]=F.mul(F.from((-1)**((n-k)/2+k*(k-1)/2)),v[j]);
  });return out;
 }
 function projectTransported(kind,n,v){
  if(n<0)return [];
  const original=c.group(kind,n),transformed=original.basis.map(b=>T(kind,n,b));
  const boundaries=op.group(kind,n).boundaries;
  // Coordinates must be taken in T(original basis), not the independently reduced basis of A^op.
  assert.ok(apply(op.differential(kind,n),v,op.space(kind,kind==='co'?n+1:n-1).items.length,F).every(F.isZero));
  return coordinates([...boundaries,...transformed],v,F).slice(boundaries.length);
 }
 return {c,op,F,T,S,projectTransported};
}

test('every displayed example and convention-validation representative is the independent signed reversal',()=>{
 for(const [name,q] of presentations)for(const characteristic of [0,2,3]){
  const {c,op,F,T,S}=transportOracle(q,characteristic),left=createConvention(q,'left',String(characteristic)),right=createConvention(q,'right',String(characteristic));
  for(let n=0;n<=3;n++){
   for(const model of ['bar','bardzell'])for(const kind of ['co','ho'])for(const vector of c.group(kind,n,model).basis){
    const original=c.describeVector(kind,n,vector,model),snapshot=structuredClone(original);
    assert.deepEqual(semanticTerms(left.representative(original)),semanticTerms(op.describeVector(kind,n,T(kind,n,vector,model),model)),`${name}, char ${characteristic}, ${model} ${kind} ${n}`);
    assert.deepEqual(semanticTerms(right.representative(original)),semanticTerms(original));
    assert.deepEqual(original,snapshot,'rendering must leave engine records unchanged');
   }
   for(const vector of c.cyclic(n).basis){
    const original=c.describeVector('cyclic',n,vector);
    assert.deepEqual(semanticTerms(left.representative(original)),semanticTerms(op.describeVector('cyclic',n,S(n,vector))),`${name}, char ${characteristic}, cyclic ${n}`);
   }
   for(const kind of ['co','ho']){
    const next=kind==='co'?n+1:n-1;
    for(let i=0;i<c.space(kind,n).items.length;i++){
     const v=identityVector(c.space(kind,n).items.length,i,F),d=apply(c.differential(kind,n),v,c.space(kind,next).items.length,F);
     sameVector(apply(op.differential(kind,n),T(kind,n,v),op.space(kind,next).items.length,F),T(kind,next,d).map(F.neg),F,'dT = -Td');
    }
   }
  }
 }
});

test('cyclic total summand signs anticommute with the total differential and preserve cyclic coordinates',()=>{
 for(const q of generated)for(const characteristic of [0,2,3]){
  const {c,op,F,S}=transportOracle(q,characteristic),left=createConvention(q,'left',String(characteristic));
  for(let n=0;n<=5;n++){
   // Include every elementary chain, including noncycles and all lower C_k summands.
   for(let i=0;i<c.cyclicSpace(n).items.length;i++){
    const v=identityVector(c.cyclicSpace(n).items.length,i,F);
    const d=apply(c.cyclicDifferential(n),v,c.cyclicSpace(n-1).items.length,F);
    sameVector(apply(op.cyclicDifferential(n),S(n,v),op.cyclicSpace(n-1).items.length,F),S(n-1,d).map(F.neg),F,`cyclic D S = -S D in degree ${n}`);
    assert.deepEqual(semanticTerms(left.representative(c.describeVector('cyclic',n,v))),semanticTerms(op.describeVector('cyclic',n,S(n,v))));
   }
   const g=c.cyclic(n),opg=op.cyclic(n),basis=g.basis.map(v=>S(n,v));
   const v=zeros(c.cyclicSpace(n).items.length,F);
   g.basis.forEach((b,i)=>addScaled(v,b,F.from(i+1),F));
   sameVector(coordinates([...opg.boundaries,...basis],S(n,v),F).slice(opg.boundaries.length),g.project(v),F,'cyclic coordinates in transported bases');
  }
 }
});

test('cup, bracket, cap, Lie and Connes retain class coordinates in the transported bases',()=>{
 for(const [name,q] of presentations)for(const characteristic of [0,2,3]){
  const {c,op,F,T,projectTransported}=transportOracle(q,characteristic),left=createConvention(q,'left',String(characteristic)),right=createConvention(q,'right',String(characteristic));
  function check(type,p,i,r,j){
   const f=c.group('co',p).basis[i],kind=['cap','lie'].includes(type)?'ho':'co',g=c.group(kind,r).basis[j];
   const n=type==='cup'?p+r:type==='bracket'?p+r-1:r-p+(type==='lie'?1:0);
   if(n<0)return;
   const outputKind=kind,original=c[type](p,f,r,g),actual=op[type](p,T('co',p,f),r,T(kind,r,g));
   sameVector(projectTransported(outputKind,n,actual),c.group(outputKind,n).project(original),F,`${name}, char ${characteristic}, ${type} (${p},${r})`);
   const cs=identityVector(c.group('co',p).basis.length,i,F).map(F.str),ds=identityVector(c.group(kind,r).basis.length,j,F).map(F.str);
   const result=c.operation(type,p,cs,r,ds),record={type,p,q:r,left:cs,right:ds,result,outputBasis:{kind:outputKind,degree:n,basis:c.describeBasis(outputKind,n)}};
   const l=left.operation(record),rr=right.operation(record);
   assert.deepEqual(l.result.coefficients,rr.result.coefficients);
   assert.deepEqual(l.left,rr.left);assert.deepEqual(l.right,rr.right);
   assert.deepEqual(semanticTerms(l.result.representative),semanticTerms(op.describeVector(outputKind,n,T(outputKind,n,original))));
  }
  for(let p=0;p<=2;p++)for(let r=0;r<=2;r++)for(let i=0;i<c.group('co',p).basis.length;i++)for(let j=0;j<c.group('co',r).basis.length;j++)for(const type of ['cup','bracket'])check(type,p,i,r,j);
  for(let p=0;p<=2;p++)for(let n=p;n<=3;n++)for(let i=0;i<c.group('co',p).basis.length;i++)for(let j=0;j<c.group('ho',n).basis.length;j++)for(const type of ['cap','lie'])check(type,p,i,n,j);
  for(let n=0;n<=3;n++)for(const z of c.group('ho',n).basis){
   const original=apply(c.connes(n),z,c.space('ho',n+1).items.length,F),actual=apply(op.connes(n),T('ho',n,z),op.space('ho',n+1).items.length,F);
   sameVector(actual,T('ho',n+1,original),F,'BT = TB on chains');
   sameVector(projectTransported('ho',n+1,actual),c.group('ho',n+1).project(original),F,'Connes coordinates');
  }
 }
});
