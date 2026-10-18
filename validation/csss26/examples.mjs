import assert from 'node:assert/strict';
import {Calculus,validate} from '../../src/engine.js';
import {zeros,apply,addScaled,coordinates} from '../../src/linear.js';
import {structure,cohomologyFamilies,familyDimension,ringPresentation,ribbon} from '../../src/structure.js';

const checks=[];
const q=(vs,as,rs=[])=>({vertices:vs.map(id=>({id,label:id})),arrows:as.map(([id,source,target])=>({id,label:id,source,target})),relations:rs});
const dual=q(['v'],[['a','v','v']],[['a','a']]);
const kronecker=q(['0','1'],[['a','0','1'],['b','0','1']]);
const path=(c,word,vertex='v')=>c.A.paths.findIndex(p=>p.a.join(',')===word.join(',')&&(word.length||p.s===vertex));
function one(c,kind,n,word,out,vertex='v',model='bar'){
 const v=zeros(c.space(kind,n,model).items.length,c.F),t=word.map(a=>path(c,[a])),p=path(c,out,vertex);
 const i=c.space(kind,n,model).items.findIndex(x=>x.p===p&&x.t.join(',')===t.join(','));
 assert.ok(i>=0,`missing ${kind}${n}: ${word}->${out}`);v[i]=c.F.o;return v;
}
const scale=(c,v,a)=>v.map(x=>c.F.mul(x,c.F.from(a)));
const zero=(c,k,n)=>zeros(c.space(k,n).items.length,c.F);
function equal(c,k,n,actual,expected,label){
 let g,project;
 try {g=c.group(k,n);project=v=>g.project(v);} catch(e){
  if(k!=='co'||!/exceeds|limit/.test(e.message))throw e;
  const big=c.space(k,n),small=c.space(k,n,'bardzell');g=c.group(k,n,'bardzell');
  const indexes=small.items.map(x=>big.index.get(`${x.t.join(',')}|${x.p}`));
  project=v=>g.project(indexes.map(i=>v[i]));label+=' (bar product restricted to Bardzell for quotient)';
 }
 assert.deepEqual(project(actual).map(c.F.str),project(expected).map(c.F.str),label);checks.push(label);
}
const outputs={};
for(const p of [0,2,3,5]){
 const c=new Calculus(dual,p),f=(n,out)=>one(c,'co',n,Array(n).fill('a'),out),z=(n,out)=>one(c,'ho',n,Array(n).fill('a'),out);
 const x=f(0,['a']),unit=f(0,[]),C=n=>f(n,[]),D=n=>f(n,['a']);
 equal(c,'co',0,c.cup(0,x,0,x),zero(c,'co',0),`R5.3 p${p}: x²=0`);
 for(let m=1;m<=4;m++)for(let n=1;n<=4;n++){
  if(p===2){
   equal(c,'co',m,c.cup(0,x,m,C(m)),D(m),`R5.3 p2: x C${m}=D${m}`);
   equal(c,'co',m,c.cup(0,x,m,D(m)),zero(c,'co',m),`R5.3 p2: x D${m}=0`);
   equal(c,'co',m+n,c.cup(m,C(m),n,C(n)),C(m+n),`R5.3 p2: C${m} C${n}`);
   equal(c,'co',m+n,c.cup(m,C(m),n,D(n)),D(m+n),`R5.3 p2: C${m} D${n}`);
   equal(c,'co',m+n,c.cup(m,D(m),n,D(n)),zero(c,'co',m+n),`R5.3 p2: D${m} D${n}=0`);
  }else{
   equal(c,'co',2*m,c.cup(0,x,2*m,C(2*m)),D(2*m),`R5.3 p${p}: x C${2*m}=D${2*m}=boundary`);
   equal(c,'co',2*n-1,c.cup(0,x,2*n-1,D(2*n-1)),zero(c,'co',2*n-1),`R5.3 p${p}: x D${2*n-1}=0`);
   equal(c,'co',2*(m+n),c.cup(2*m,C(2*m),2*n,C(2*n)),C(2*(m+n)),`R5.3 p${p}: C${2*m} C${2*n}`);
   equal(c,'co',2*(m+n)-1,c.cup(2*m,C(2*m),2*n-1,D(2*n-1)),D(2*(m+n)-1),`R5.3 p${p}: C${2*m} D${2*n-1}`);
   equal(c,'co',2*(m+n)-2,c.cup(2*m-1,D(2*m-1),2*n-1,D(2*n-1)),zero(c,'co',2*(m+n)-2),`R5.3 p${p}: D${2*m-1} D${2*n-1}=0`);
  }
 }
 for(let m=0;m<=8;m++){
  if(p===2||m%2===0)equal(c,'ho',m,c.cap(0,x,m,z(m,['a'])),zero(c,'ho',m),`R5.18 p${p}: a[a]^${m} cap x`);
  if(m===0)equal(c,'ho',0,c.cap(0,x,0,z(0,[])),z(0,['a']),`R5.18 p${p}: 1 cap x=a`);
  if(m>0&&(p===2||m%2===1))equal(c,'ho',m,c.cap(0,x,m,z(m,[])),p===2?z(m,['a']):zero(c,'ho',m),`R5.18 p${p}: [a]^${m} cap x`);
  for(let n=1;n<=m;n++){
   if(p===2||n%2===0){
    if(p===2||m%2===1)equal(c,'ho',m-n,c.cap(n,C(n),m,z(m,[])),z(m-n,[]),`R5.18 p${p}: [a]^${m} cap C${n}`);
    if(p===2||m%2===0)equal(c,'ho',m-n,c.cap(n,C(n),m,z(m,['a'])),z(m-n,['a']),`R5.18 p${p}: a[a]^${m} cap C${n}`);
   }
   if(p===2||n%2===1){
    if(p===2||m%2===1)equal(c,'ho',m-n,c.cap(n,D(n),m,z(m,[])),z(m-n,['a']),`R5.18 p${p}: [a]^${m} cap D${n}`);
    if(p===2||m%2===0)equal(c,'ho',m-n,c.cap(n,D(n),m,z(m,['a'])),zero(c,'ho',m-n),`R5.18 p${p}: a[a]^${m} cap D${n}`);
   }
  }
 }
 for(let n=1;n<=4;n++){
  if(p===2||n%2===0){assert.deepEqual(c.cap(n,C(n),0,z(0,[])),[]);assert.deepEqual(c.cap(n,C(n),0,z(0,['a'])),[]);checks.push(`R5.18 p${p}: degree-zero row cap C${n}=0`);}
  if(p===2||n%2===1){assert.deepEqual(c.cap(n,D(n),0,z(0,[])),[]);assert.deepEqual(c.cap(n,D(n),0,z(0,['a'])),[]);checks.push(`R5.18 p${p}: degree-zero row cap D${n}=0`);}
 }
 equal(c,'co',0,c.bracket(1,p===2?C(1):D(1),0,x),p===2?unit:x,`R6.5 p${p}: dual-number displayed bracket`);
 if(p!==2)equal(c,'co',2,c.bracket(1,D(1),2,C(2)),scale(c,C(2),-2),`R6.5 omission p${p}: [d,t]=-2t`);
 outputs[`dual_char${p}`]={co:Array.from({length:9},(_,n)=>c.group('co',n).basis.length),ho:Array.from({length:9},(_,n)=>c.group('ho',n).basis.length),ring:ringPresentation(c.A,p)};
}
for(const p of [0,2,3,5]){
 const c=new Calculus(kronecker,p),aa=one(c,'co',1,['a'],['a'],'0'),ab=one(c,'co',1,['a'],['b'],'0'),ba=one(c,'co',1,['b'],['a'],'0');
 equal(c,'co',1,c.bracket(1,aa,1,ab),scale(c,ab,-1),`R6.5 Kronecker p${p}: [aa,ab]=-ab`);
 equal(c,'co',1,c.bracket(1,aa,1,ba),ba,`R6.5 Kronecker p${p}: [aa,ba]=ba`);
 equal(c,'co',1,c.bracket(1,ba,1,ab),scale(c,aa,2),`R6.5 Kronecker p${p}: [ba,ab]=2aa`);
 outputs[`kronecker_char${p}`]={lie:c.lieStructure(),aag:ribbon(c.A).aag};
}
for(let N=2;N<=8;N++)for(const p of [0,2,3,5]){
 const vs=Array.from({length:N},(_,i)=>String(i)),as=vs.map((v,i)=>[`a${i}`,v,String((i+1)%N)]),rs=vs.slice(1).map((v,i)=>[`a${i+1}`,`a${(i+2)%N}`]);
 const c=new Calculus(q(vs,as,rs),p),s=structure(c.A),f=cohomologyFamilies(c.A,p),dims=Array.from({length:N+4},(_,n)=>c.group('co',n,'bardzell').basis.length);
 assert.equal(dims[N],1);assert.deepEqual(dims.slice(N+1),[0,0,0]);assert.equal(s.globalDimension,N);assert.equal(s.cycles.length,0);
 dims.forEach((d,n)=>assert.equal(d,familyDimension(f,n)));checks.push(`Cor3.16 sharpness N=${N}, p=${p}`);outputs[`sharpness_N${N}_char${p}`]=dims;
}
// Every finite-dimensional family in Table 1 is represented. Lift named
// Bardzell cocycles via restriction of the computed bar cohomology basis.
function lift(c,n,b){
 const bar=c.space('co',n),small=c.space('co',n,'bardzell'),g=c.group('co',n),bg=c.group('co',n,'bardzell');
 const indexes=small.items.map(x=>bar.index.get(`${x.t.join(',')}|${x.p}`));
 const cols=g.basis.map(v=>bg.project(indexes.map(i=>v[i]))),cs=coordinates(cols,bg.project(b),c.F);
 return apply(g.basis,cs,bar.items.length,c.F);
}
function cycleClass(c,word,repetitions=1){
 const n=word.length*repetitions,out=zeros(c.space('co',n,'bardzell').items.length,c.F);
 for(let j=0;j<word.length;j++){const rot=[...word.slice(j),...word.slice(0,j)],w=Array.from({length:repetitions},()=>rot).flat(),v=c.A.arrows.get(w[0]).source;addScaled(out,one(c,'co',n,w,[],v,'bardzell'),c.F.o,c.F)}
 return lift(c,n,out);
}
function derivation(c,arrow){const v=zeros(c.space('co',1).items.length,c.F);c.space('co',1).items.forEach(({t,p},i)=>{if(t[0]===p)v[i]=c.F.from(c.A.paths[p].a.filter(x=>x===arrow).length)});return v;}
const mixed=q(['0','1'],[['a','0','1'],['b','1','1'],['c','1','0']],[['a','c'],['c','a'],['b','b']]);
for(const p of [0,2,3]){
 const c=new Calculus(mixed,p),central=one(c,'co',0,[],['a','b','c'],'0'),d=derivation(c,'c'),db=derivation(c,'b'),t=cycleClass(c,['a','c']),tb=cycleClass(c,['b'],p===2?1:2),s=c.cup(1,d,2,t);
 for(const [n,v,name] of [[0,central,'II'],[1,d,'IV'],[2,t,'VII'],[3,s,'VIII']])equal(c,'co',n,c.cup(0,central,n,v),zero(c,'co',n),`Table1 p${p}: II*${name}=0`);
 equal(c,'co',2,c.cup(1,d,1,d),zero(c,'co',2),`Table1 p${p}: IV*IV=0`);
 equal(c,'co',3,c.cup(1,db,2,t),zero(c,'co',3),`Table1 p${p}: chord outside circuit gives zero`);
 equal(c,'co',3,c.cup(1,d,2,t),lift(c,3,one(c,'co',3,['c','a','c'],['c'],'1','bardzell')),`Table1 p${p}: IV*VII=VIII`);
 const n=p===2?1:2;
 equal(c,'co',n+2,c.cup(2,t,n,tb),zero(c,'co',n+2),`Table1 p${p}: distinct VII circuits multiply to zero`);
}
const complete2=q(['0','1'],[['a','0','1'],['c','1','0']],[['a','c'],['c','a']]);
for(const p of [0,2,3]){
 const c=new Calculus(complete2,p),d=derivation(c,'c'),t=cycleClass(c,['a','c']),s=c.cup(1,d,2,t),t4=cycleClass(c,['a','c'],2);
 equal(c,'co',4,c.cup(2,t,2,t),t4,`Table1 p${p}: VII*VII=next VII`);
 equal(c,'co',5,c.cup(3,s,2,t),c.cup(1,d,4,t4),`Table1 p${p}: VIII*VII=next VIII`);
 equal(c,'co',4,c.cup(1,d,3,s),zero(c,'co',4),`Table1 p${p}: IV*VIII=0`);
 equal(c,'co',6,c.cup(3,s,3,s),zero(c,'co',6),`Table1 p${p}: VIII*VIII=0`);
}
const bypass=q(['0','1','2'],[['a','0','1'],['b','1','2'],['c','0','2']],[['a','b']]);
for(const p of [0,2,3]){
 const c=new Calculus(bypass,p),u=lift(c,2,one(c,'co',2,['a','b'],['c'],'0','bardzell')),d=derivation(c,'c');
 equal(c,'co',3,c.cup(1,d,2,u),zero(c,'co',3),`Table1 p${p}: IV*VI=0`);
 equal(c,'co',4,c.cup(2,u,2,u),zero(c,'co',4),`Table1 p${p}: VI*VI=0`);
}
const extra=q(['2','3','4'],[['d','2','3'],['e','3','4'],['f','2','4']],[['d','e']]);
const union=(a,b)=>({vertices:[...a.vertices,...b.vertices],arrows:[...a.arrows,...b.arrows],relations:[...a.relations,...b.relations]});
for(const p of [0,2,3]){
 let c=new Calculus(union(mixed,extra),p),u=lift(c,2,one(c,'co',2,['d','e'],['f'],'2','bardzell')),x=one(c,'co',0,[],['a','b','c'],'0');
 equal(c,'co',2,c.cup(0,x,2,u),zero(c,'co',2),`Table1 p${p}: II*VI=0 (different components)`);
 c=new Calculus(union(complete2,extra),p);u=lift(c,2,one(c,'co',2,['d','e'],['f'],'2','bardzell'));
 const t=cycleClass(c,['a','c']),s=c.cup(1,derivation(c,'c'),2,t);
 equal(c,'co',4,c.cup(2,u,2,t),zero(c,'co',4),`Table1 p${p}: VI*VII=0 (different components)`);
 equal(c,'co',5,c.cup(2,u,3,s),zero(c,'co',5),`Table1 p${p}: VI*VIII=0 (different components)`);
}
const complete3=q(['0','1','2'],[['a','0','1'],['b','1','2'],['c','2','0']],[['a','b'],['b','c'],['c','a']]);
for(const p of [0,2,3]){
 const other=q(['2','3'],[['d','2','3'],['e','3','2']],[['d','e'],['e','d']]),c=new Calculus(union(complete2,other),p),t=cycleClass(c,['a','c']),otherT=cycleClass(c,['d','e']),otherS=c.cup(1,derivation(c,'e'),2,otherT);
 equal(c,'co',5,c.cup(2,t,3,otherS),zero(c,'co',5),`Table1 p${p}: VII*VIII for distinct circuits=0`);
}
{
 const c=new Calculus(complete3,2),t=cycleClass(c,['a','b','c']),t2=cycleClass(c,['a','b','c'],2);
 equal(c,'co',6,c.cup(3,t,3,t),t2,'Remark5.2: characteristic-two odd-degree complete-circuit class has nonzero square');
 assert.ok(c.group('co',6).project(t2).some(x=>!c.F.isZero(x)));
}
const fig2=q(['1','2','3'],[['a','1','2'],['b','2','3'],['c','3','1'],['d','1','2'],['e','2','3'],['f','3','1']],[['a','b'],['b','c'],['c','a'],['d','e'],['e','f'],['f','d']]);
for(const [name,presentation] of [['polynomial',q(['v'],[['a','v','v']])],['Fig2',fig2],['R5.19',q(['v'],[['a','v','v'],['b','v','v']],[['a','a'],['b','b']])]]){
 const errors=validate(presentation);assert.ok(errors.some(e=>e.includes('infinite-dimensional')));outputs[name]={unsupported:true,errors};
}
console.log(JSON.stringify({checkCount:checks.length,checks,outputs},null,2));
