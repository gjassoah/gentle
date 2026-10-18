import assert from 'node:assert/strict';
import {Calculus} from '../../src/engine.js';
import {apply,addScaled,zeros,identityVector} from '../../src/linear.js';
const make=(ends,rels)=>({vertices:[...new Set(ends.flat())].map(id=>({id,label:id})),arrows:ends.map(([source,target],i)=>({id:'a'+i,label:'a'+i,source,target})),relations:rels.map(r=>r.map(i=>'a'+i))});
const quivers=[make([['v','v']],[[0,0]]),make([['v','w'],['w','v']],[[1,0]]),make([['v','v'],['v','w']],[[0,0]]),make([['v','w'],['w','x'],['x','v']],[[0,1],[1,2],[2,0]])];
let checks=0;
for(const q of quivers)for(const char of [0,2,3]){
 const c=new Calculus(q,char),F=c.F;
 const op=new Calculus({vertices:q.vertices,arrows:q.arrows.map(a=>({...a,source:a.target,target:a.source})),relations:q.relations.map(r=>r.slice().reverse())},char);
 const pathMap=c.A.paths.map(p=>op.A.paths.findIndex(r=>r.s===p.e&&r.e===p.s&&JSON.stringify(r.a)===JSON.stringify(p.a.slice().reverse())));
 function T(kind,n,v){if(n<0)return [];const src=c.space(kind,n),dst=op.space(kind,n),out=zeros(dst.items.length,F),s=F.from((-1)**(n*(n-1)/2));src.items.forEach((x,i)=>{const t=x.t.map(k=>pathMap[k]).reverse(),p=pathMap[x.p],j=dst.items.findIndex(y=>p===y.p&&JSON.stringify(t)===JSON.stringify(y.t));assert.ok(j>=0);out[j]=F.mul(s,v[i]);});return out;}
 const neg=v=>v.map(F.neg);
 const eq=(a,b)=>{assert.deepEqual(a.map(F.str),b.map(F.str));checks++};
 const eqH=(kind,n,a,b)=>{if(n<0)return;let v=a.slice();addScaled(v,b,F.from(-1),F);assert.ok(op.group(kind,n).project(v).every(F.isZero));checks++};
 for(let n=0;n<=3;n++)for(const kind of ['co','ho']){
  const next=kind==='co'?n+1:n-1;
  for(let i=0;i<c.space(kind,n).items.length;i++){
   const v=identityVector(c.space(kind,n).items.length,i,F),d=apply(c.differential(kind,n),v,c.space(kind,next).items.length,F);
   eq(apply(op.differential(kind,n),T(kind,n,v),op.space(kind,next).items.length,F),neg(T(kind,next,d)));
   if(kind==='ho')eq(apply(op.connes(n),T(kind,n,v),op.space(kind,n+1).items.length,F),T(kind,n+1,apply(c.connes(n),v,c.space(kind,n+1).items.length,F)));
  }
 }
 for(let p=0;p<=2;p++)for(let r=0;r<=2;r++)for(const f of c.group('co',p).basis)for(const g of c.group('co',r).basis){
  const tf=T('co',p,f),tg=T('co',r,g);
  eqH('co',p+r,op.cup(p,tf,r,tg),T('co',p+r,c.cup(p,f,r,g)));
  eqH('co',p+r-1,op.bracket(p,tf,r,tg),T('co',p+r-1,c.bracket(p,f,r,g)));
 }
 for(let p=0;p<=2;p++)for(let n=p;n<=3;n++)for(const f of c.group('co',p).basis)for(const z of c.group('ho',n).basis){
  eqH('ho',n-p,op.cap(p,T('co',p,f),n,T('ho',n,z)),T('ho',n-p,c.cap(p,f,n,z)));
  eqH('ho',n-p+1,op.lie(p,T('co',p,f),n,T('ho',n,z)),T('ho',n-p+1,c.lie(p,f,n,z)));
 }
}
console.log(JSON.stringify({checks,quivers:quivers.length,characteristics:[0,2,3],result:'Signed reversal anticommutes with b and delta; commutes with B; preserves cup, bracket, cap and Lie on homology.'},null,2));
