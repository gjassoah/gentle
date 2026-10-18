import assert from 'node:assert/strict';
import {field,kernel,reducer,coordinates,quotient,apply,zeros,addScaled,identityVector} from '../../src/linear.js';
// An independent reference uses ROW elimination with swaps. Production linear.js
// uses column elimination. Chain inputs come from the reference nullspace, never
// from any Calculus space/differential or the production kernel routine.
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r}return a};
const reference=p=>{
 p=BigInt(p);const mod=a=>(a%p+p)%p;
 const power=(a,n)=>{let b=1n;while(n){if(n&1n)b=mod(b*a);a=mod(a*a);n>>=1n}return b};
 const make=(a,b=1n)=>{if(p){assert.notEqual(mod(b),0n);return [mod(a*power(mod(b),p-2n)),1n]}if(b<0n){a=-a;b=-b}const g=gcd(a,b);return [a/g,b/g]};
 return {z:make(0n),o:make(1n),make,zero:a=>a[0]===0n,add:(a,b)=>make(a[0]*b[1]+b[0]*a[1],a[1]*b[1]),neg:a=>make(-a[0],a[1]),mul:(a,b)=>make(a[0]*b[0],a[1]*b[1]),div:(a,b)=>{assert.notEqual(b[0],0n);return make(a[0]*b[1],a[1]*b[0])}};
};
const rowReduction=(columns,nrows,R)=>{
 const nc=columns.length,rows=Array.from({length:nrows},(_,i)=>Array.from({length:nc},(_,j)=>columns[j][i])),pivots=[];let row=0;
 for(let col=0;col<nc&&row<nrows;col++){
  let pivot=row;while(pivot<nrows&&R.zero(rows[pivot][col]))pivot++;
  if(pivot===nrows)continue;[rows[row],rows[pivot]]=[rows[pivot],rows[row]];
  const a=rows[row][col];rows[row]=rows[row].map(x=>R.div(x,a));
  for(let i=0;i<nrows;i++)if(i!==row){const b=rows[i][col];if(!R.zero(b))rows[i]=rows[i].map((x,j)=>R.add(x,R.neg(R.mul(b,rows[row][j]))))}
  pivots.push(col);row++;
 }
 const pivotSet=new Set(pivots),nullspace=[];
 for(let j=0;j<nc;j++)if(!pivotSet.has(j)){const v=Array.from({length:nc},()=>R.z);v[j]=R.o;pivots.forEach((c,i)=>v[c]=R.neg(rows[i][j]));nullspace.push(v)}
 return {rank:pivots.length,nullspace};
};
const refApply=(M,v,rows,R)=>Array.from({length:rows},(_,i)=>v.reduce((a,c,j)=>R.add(a,R.mul(M[j][i],c)),R.z));
let seed=0x05c55a26;const rand=n=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed%n};
const counts={seed:'0x05c55a26',fields:[0,2,3,5],arbitraryMatrixCases:0,chainComplexCases:0,spanReconstructionCases:0,noncycleRejections:0,scalarComparisons:0};
for(const p of counts.fields){
 const F=field(p),R=reference(p);
 const scalar=()=>{const a=BigInt(rand(15)-7);let b=BigInt(1+rand(7));while(p&&b%BigInt(p)===0n)b=BigInt(1+rand(7));const x=R.make(a,b);assert.deepEqual(F.from(`${a}/${b}`),x);counts.scalarComparisons++;return x};
 const vector=n=>Array.from({length:n},scalar),matrix=(rows,cols)=>Array.from({length:cols},()=>vector(rows));
 for(let trial=0;trial<250;trial++){
  const rows=rand(10),cols=rand(10),M=matrix(rows,cols),rank=rowReduction(M,rows,R).rank,K=kernel(M,cols,F),red=reducer(F);M.forEach(v=>red.add(v));
  assert.equal(red.pivots.length,rank);assert.equal(K.length,cols-rank);assert.equal(rowReduction(K,cols,R).rank,K.length);
  for(const v of K)assert.ok(refApply(M,v,rows,R).every(R.zero));
  const coeff=vector(cols),value=refApply(M,coeff,rows,R),c=coordinates(M,value,F);
  assert.deepEqual(refApply(M,c,rows,R),value);assert.deepEqual(apply(M,coeff,rows,F),value);
  counts.arbitraryMatrixCases++;counts.spanReconstructionCases++;
  const size=rand(10),target=rand(10),outgoing=matrix(target,size),ref=rowReduction(outgoing,target,R),incomingColumns=rand(12);
  const incoming=Array.from({length:incomingColumns},()=>refApply(ref.nullspace,vector(ref.nullspace.length),size,R));
  if(incoming.length>2)incoming[1]=incoming[0].slice();
  if(incoming.length)incoming.at(-1).fill(R.z);
  const rankIncoming=rowReduction(incoming,size,R).rank,g=quotient(outgoing,incoming,size,F);
  assert.equal(g.basis.length,size-ref.rank-rankIncoming);assert.equal(g.rank,rankIncoming);assert.equal(g.cycles,size-ref.rank);
  for(const b of incoming)assert.ok(g.project(b).every(R.zero));
  for(let i=0;i<g.basis.length;i++)assert.deepEqual(g.project(g.basis[i]),identityVector(g.basis.length,i,F));
  for(const v of [...g.boundaries,...g.basis])assert.ok(refApply(outgoing,v,target,R).every(R.zero));
  for(let repeat=0;repeat<3;repeat++){
   const cycle=refApply(ref.nullspace,vector(ref.nullspace.length),size,R),projection=g.project(cycle),representative=refApply(g.basis,projection,size,R);
   const difference=cycle.map((x,i)=>R.add(x,R.neg(representative[i])));
   assert.equal(rowReduction([...incoming,difference],size,R).rank,rankIncoming);
   const b=refApply(incoming,vector(incoming.length),size,R),same=cycle.map((x,i)=>R.add(x,b[i]));
   assert.deepEqual(g.project(same),projection);counts.spanReconstructionCases++;
  }
  const noncycle=Array.from({length:size},(_,i)=>identityVector(size,i,F)).find(v=>refApply(outgoing,v,target,R).some(x=>!R.zero(x)));
  if(noncycle){assert.throws(()=>g.project(noncycle),/did not produce a cycle/);counts.noncycleRejections++}
  counts.chainComplexCases++;
 }
}
console.log(JSON.stringify({...counts,status:'all assertions passed'},null,2));
