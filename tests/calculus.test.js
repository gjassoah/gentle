import test from 'node:test';import assert from 'node:assert/strict';
import {Calculus} from '../src/engine.js';import {examples} from '../src/examples.js';import {zeros,addScaled} from '../src/linear.js';
const same=(c,kind,n,a,b)=>{if(n<0)return;const v=a.slice();addScaled(v,b,c.F.from(-1),c.F);assert.ok(c.group(kind,n).project(v).every(c.F.isZero),`Identity failed in ${kind} degree ${n}`)};
test('graded commutativity, bracket skew symmetry, and cap associativity',()=>{
 for(const char of [0,2,3])for(const q of [examples.dual,examples.kronecker,examples.triangle]){const c=new Calculus(q,char),F=c.F;
  for(let p=0;p<=2;p++)for(let r=0;r<=2;r++)for(const f of c.group('co',p).basis)for(const g of c.group('co',r).basis){same(c,'co',p+r,c.cup(p,f,r,g),c.cup(r,g,p,f).map(x=>F.mul(F.from((-1)**(p*r)),x)));if(p+r>0)same(c,'co',p+r-1,c.bracket(p,f,r,g),c.bracket(r,g,p,f).map(x=>F.mul(F.from(-((-1)**((p-1)*(r-1)))),x)));
   const n=3;for(const z of c.group('ho',n).basis)if(p+r<=n)same(c,'ho',n-p-r,c.cap(p+r,c.cup(p,f,r,g),n,z),c.cap(r,g,n-p,c.cap(p,f,n,z)));
  }
 }
});
test('Cartan identity in the documented normalized-bar convention',()=>{
 for(const char of [0,2,3])for(const q of [examples.dual,examples.triangle]){const c=new Calculus(q,char),F=c.F;
  for(let p=0;p<=2;p++)for(let r=0;r<=2;r++)for(const f of c.group('co',p).basis)for(const g of c.group('co',r).basis){const n=3,d=n-p-r+1;if(d<0)continue;for(const z of c.group('ho',n).basis){
   const lhs=c.lie(p,f,n-r,c.contraction(r,g,n,z));const second=c.contraction(r,g,n-p+1,c.lie(p,f,n,z));addScaled(lhs,second,F.from(-((-1)**((1-p)*r))),F);
   const rhs=p+r===0?zeros(c.space('ho',d).items.length,F):c.contraction(p+r-1,c.bracket(p,f,r,g),n,z);try{same(c,'ho',d,lhs,rhs)}catch(e){console.log({char,q:q.name,p,r,n,lhs:c.group('ho',d).project(lhs).map(F.str),rhs:c.group('ho',d).project(rhs).map(F.str)});throw e}
  }}
 }
});
test('graded Jacobi and bracket derivation identity',()=>{for(const char of [0,2,3]){const c=new Calculus(examples.dual,char),F=c.F;for(let p=0;p<=2;p++)for(let q=0;q<=2;q++)for(let r=0;r<=2;r++)for(const f of c.group('co',p).basis)for(const g of c.group('co',q).basis)for(const h of c.group('co',r).basis){
 const lhs=c.bracket(p,f,q+r,c.cup(q,g,r,h));const rhs=zeros(c.space('co',p+q+r-1).items.length,F);if(p+q>=1)addScaled(rhs,c.cup(p+q-1,c.bracket(p,f,q,g),r,h),F.o,F);if(p+r>=1)addScaled(rhs,c.cup(q,g,p+r-1,c.bracket(p,f,r,h)),F.from((-1)**((p-1)*q)),F);same(c,'co',p+q+r-1,lhs,rhs);
 if(p+q+r>=2&&p+q>=1&&q+r>=1&&p+r>=1){const left=c.bracket(p,f,q+r-1,c.bracket(q,g,r,h)),right=c.bracket(p+q-1,c.bracket(p,f,q,g),r,h);addScaled(right,c.bracket(q,g,p+r-1,c.bracket(p,f,r,h)),F.from((-1)**((p-1)*(q-1))),F);same(c,'co',p+q+r-2,left,right)}
}}});
test('HH1 distinguishes Kronecker in characteristic two',()=>{assert.deepEqual(new Calculus(examples.kronecker).lieStructure().derived,[3,3]);assert.deepEqual(new Calculus(examples.kronecker,2).lieStructure().derived,[3,2,0]);assert.equal(new Calculus(examples.dual).lieStructure().centerDimension,1)});
