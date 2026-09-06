import {field,zeros,matrix,addScaled,apply,quotient,isZeroComposition,reducer,kernel,identityVector} from './linear.js';
export const ENGINE_VERSION='0.4.0';
const LIMIT=900, CELL_LIMIT=1100000;
export function validate(q){
 const errors=[];if(!q || !Array.isArray(q.vertices)||!Array.isArray(q.arrows)||!Array.isArray(q.relations))return ['Invalid quiver file.'];
 if(!q.vertices.length)errors.push('Add at least one vertex.');
 for(const [items,name] of [[q.vertices,'vertex'],[q.arrows,'arrow']]){
  if(new Set(items.map(x=>x.id)).size!==items.length)errors.push(`Duplicate ${name} identifiers.`);
  if(items.some(x=>typeof x.id!=='string'||typeof x.label!=='string'||!x.label.trim()))errors.push(`Every ${name} needs an identifier and a label.`);
  if(new Set(items.map(x=>x.label)).size!==items.length)errors.push(`Choose distinct ${name} labels.`);
 }
 const vs=new Set(q.vertices.map(v=>v.id)),as=new Map(q.arrows.map(a=>[a.id,a]));
 if(q.arrows.some(a=>!vs.has(a.source)||!vs.has(a.target)))errors.push('Every arrow must join existing vertices.');
 const rel=new Set();for(const r of q.relations){if(!Array.isArray(r)||r.length!==2||!as.has(r[0])||!as.has(r[1])){errors.push('Relations must be pairs of existing arrows.');continue}if(as.get(r[0]).target!==as.get(r[1]).source)errors.push('A relation must be a composable pair of arrows.');rel.add(JSON.stringify(r))}
 if(errors.length)return errors;
 for(const v of q.vertices)if(q.arrows.filter(a=>a.source===v.id).length>2||q.arrows.filter(a=>a.target===v.id).length>2)errors.push(`Vertex ${v.label} has more than two incoming or outgoing arrows.`);
 for(const a of q.arrows)for(const dir of ['successors','predecessors']){
  const candidates=q.arrows.filter(b=>dir==='successors'?a.target===b.source:b.target===a.source);
  const nr=candidates.filter(b=>rel.has(JSON.stringify(dir==='successors'?[a.id,b.id]:[b.id,a.id]))).length;
  if(nr>1||candidates.length-nr>1)errors.push(`Arrow ${a.label} violates the gentle condition on ${dir}.`);
 }
 const active=new Set(),done=new Set();
 function visit(a){if(active.has(a.id))return true;if(done.has(a.id))return false;active.add(a.id);for(const b of q.arrows)if(a.target===b.source&&!rel.has(JSON.stringify([a.id,b.id]))&&visit(b))return true;active.delete(a.id);done.add(a.id);return false}
 if(q.arrows.some(visit))errors.push('An allowed oriented cycle makes this algebra infinite-dimensional. Add a zero relation to break it.');
 return [...new Set(errors)];
}
export function algebra(q){
 const errors=validate(q);if(errors.length)throw Error(errors.join(' '));
 const rel=new Set(q.relations.map(r=>JSON.stringify(r))),paths=q.vertices.map(v=>({s:v.id,e:v.id,a:[],label:`e(${v.label})`}));
 if(paths.length>200)throw Error('The path basis exceeds the current 200-path resource limit.');
 const arrows=new Map(q.arrows.map(a=>[a.id,a]));
 function extend(p){paths.push(p);if(paths.length>200)throw Error('The path basis exceeds the current 200-path resource limit.');for(const a of q.arrows)if(a.source===p.e&&!rel.has(JSON.stringify([p.a.at(-1),a.id])))extend({s:p.s,e:a.target,a:[...p.a,a.id],label:p.label+'·'+a.label})}
 for(const a of q.arrows)extend({s:a.source,e:a.target,a:[a.id],label:a.label});
 const key=p=>p.a.length?JSON.stringify(p.a):`e:${p.s}`,index=new Map(paths.map((p,i)=>[key(p),i]));
 const mul=paths.map(p=>paths.map(r=>{if(p.e!==r.s)return -1;if(p.a.length&&r.a.length&&rel.has(JSON.stringify([p.a.at(-1),r.a[0]])))return -1;return index.get(key({s:p.s,a:[...p.a,...r.a]}))??-1}));
 return {q,paths,mul,rel,arrows,idem:new Map(q.vertices.map((v,i)=>[v.id,i]))};
}
const skey=(t,p)=>`${t.join(',')}|${p}`;
export class Calculus{
 constructor(q,characteristic=0){this.A=algebra(q);this.F=field(characteristic);this.cache=new Map();this.spaces=new Map();this.diffs=new Map();this.bs=new Map();this.checks=[];}
 space(kind,n,model='bar'){
  if(n<0)return {items:[],index:new Map()};
  if(!Number.isInteger(n)||n>130)throw Error('Internal complex degree exceeds the supported range.');
  const key=`${model}:${kind}:${n}`;if(this.spaces.has(key))return this.spaces.get(key);
  const {paths,rel}=this.A,items=[];
  const append=(t,s,e)=>{for(let p=0;p<paths.length;p++)if(kind==='co'?(paths[p].s===s&&paths[p].e===e):(paths[p].s===e&&paths[p].e===s)){items.push({t:t.slice(),p});if(items.length>LIMIT)throw Error(`Degree ${n} ${model} ${kind==='co'?'cochain':'chain'} space exceeds ${LIMIT} basis vectors. Reduce the degree or simplify the quiver.`)}};
  if(n===0){for(const v of this.A.q.vertices)append([],v.id,v.id)}else{
   const allowed=paths.map((p,i)=>i).filter(i=>model==='bar'?paths[i].a.length>0:paths[i].a.length===1);let explored=0;
   const walk=(t,s,e)=>{if(++explored>150000)throw Error('Tensor enumeration limit reached. Reduce the degree.');if(t.length===n){append(t,s,e);return}for(const i of allowed)if(paths[i].s===e&&(model==='bar'||!t.length||rel.has(JSON.stringify([paths[t.at(-1)].a[0],paths[i].a[0]]))))walk([...t,i],s,paths[i].e)};
   for(const v of this.A.q.vertices)walk([],v.id,v.id);
  }
  const out={items,index:new Map(items.map((x,i)=>[skey(x.t,x.p),i]))};this.spaces.set(key,out);return out;
 }
 differential(kind,n,model='bar'){
  const key=`${model}:${kind}:${n}`;if(this.diffs.has(key))return this.diffs.get(key);
  const source=this.space(kind,n,model),target=this.space(kind,kind==='co'?n+1:n-1,model),F=this.F,{mul,paths}=this.A;
  if(source.items.length*target.items.length>CELL_LIMIT)throw Error('Differential exceeds the matrix resource limit. Reduce the degree.');
  const M=matrix(target.items.length,source.items.length,F);
  const put=(col,t,p,sign)=>{const row=target.index.get(skey(t,p));if(row!==undefined)M[col][row]=F.add(M[col][row],F.from(sign))};
  if(kind==='co'){
   target.items.forEach(({t,p},row)=>{
    const add=(u,r,sign)=>{const col=source.index.get(skey(u,r));if(col!==undefined)M[col][row]=F.add(M[col][row],F.from(sign))};
    for(let r=0;r<paths.length;r++){
     if(mul[t[0]][r]===p)add(t.slice(1),r,1);
     if(mul[r][t.at(-1)]===p)add(t.slice(0,-1),r,(-1)**(n+1));
    }
    if(model==='bar')for(let i=0;i<n;i++){const r=mul[t[i]][t[i+1]];if(r>=0)add([...t.slice(0,i),r,...t.slice(i+2)],p,(-1)**(i+1))}
   });
  }else if(n>0)source.items.forEach(({t,p},col)=>{
   const left=mul[p][t[0]],right=mul[t.at(-1)][p];if(left>=0)put(col,t.slice(1),left,1);if(right>=0)put(col,t.slice(0,-1),right,(-1)**n);
   if(model==='bar')for(let i=0;i<n-1;i++){const r=mul[t[i]][t[i+1]];if(r>=0)put(col,[...t.slice(0,i),r,...t.slice(i+2)],p,(-1)**(i+1))}
  });
  this.diffs.set(key,M);return M;
 }
 group(kind,n,model='bar'){
  if(!Number.isInteger(n)||n>128)throw Error('Choose a materialized group degree from 0 to 128.');
  if(n<0)return {basis:[],boundaries:[],cycles:0,rank:0,project:()=>[]};
  const key=`${model}:${kind}:${n}`;if(this.cache.has(key))return this.cache.get(key);
  const space=this.space(kind,n,model),outgoing=this.differential(kind,n,model),incoming=n===0&&kind==='co'?[]:this.differential(kind,kind==='co'?n-1:n+1,model);
  if(!isZeroComposition(outgoing,incoming,this.space(kind,kind==='co'?n+1:n-1,model).items.length,this.F))throw Error(`Internal check failed: ${key} differential does not square to zero.`);
  const g=quotient(outgoing,incoming,space.items.length,this.F);this.cache.set(key,g);return g;
 }
 connes(n){
  if(this.bs.has(n))return this.bs.get(n);const F=this.F,src=this.space('ho',n),dst=this.space('ho',n+1),M=matrix(dst.items.length,src.items.length,F),{paths,idem}=this.A;
  src.items.forEach(({t,p},j)=>{if(!paths[p].a.length)return;const all=[p,...t];for(let i=0;i<=n;i++){const rotated=[...all.slice(i),...all.slice(0,i)],e=idem.get(paths[rotated[0]].s),row=dst.index.get(skey(rotated,e));if(row===undefined)throw Error('Internal error in cyclic rotation.');M[j][row]=F.add(M[j][row],F.from((-1)**(n*i)))}});
  this.bs.set(n,M);return M;
 }
 cyclicSpace(n){const items=[];for(let k=n;k>=0;k-=2)for(let i=0;i<this.space('ho',k).items.length;i++)items.push({k,i});if(items.length>LIMIT)throw Error('Cyclic total complex exceeds the resource limit.');return {items,index:new Map(items.map((x,i)=>[`${x.k}:${x.i}`,i]))}}
 cyclicDifferential(n){const src=this.cyclicSpace(n),dst=this.cyclicSpace(n-1),F=this.F,M=matrix(dst.items.length,src.items.length,F);src.items.forEach(({k,i},j)=>{
  if(k>0)this.differential('ho',k)[i].forEach((c,r)=>{const ix=dst.index.get(`${k-1}:${r}`);if(ix!==undefined)M[j][ix]=F.add(M[j][ix],c)});
  if(k<n)this.connes(k)[i].forEach((c,r)=>{const ix=dst.index.get(`${k+1}:${r}`);if(ix!==undefined)M[j][ix]=F.add(M[j][ix],c)});
 });return M}
 cyclic(n){const key=`cyclic:${n}`;if(this.cache.has(key))return this.cache.get(key);const d=this.cyclicDifferential(n),prev=this.cyclicDifferential(n+1);if(!isZeroComposition(d,prev,this.cyclicSpace(n-1).items.length,this.F))throw Error('Internal check failed: cyclic differential does not square to zero.');const g=quotient(d,prev,this.cyclicSpace(n).items.length,this.F);this.cache.set(key,g);return g}
 vector(kind,n,coefficients){const g=this.group(kind,n),out=zeros(this.space(kind,n).items.length,this.F);if(coefficients.length!==g.basis.length)throw Error(`Expected ${g.basis.length} coefficients.`);coefficients.forEach((c,i)=>addScaled(out,g.basis[i],this.F.from(c),this.F));return out}
 evaluate(f,n,t,vertex){const F=this.F,out=zeros(this.A.paths.length,F),space=this.space('co',n);if(t.length!==n||t.some(p=>!this.A.paths[p].a.length))return out;this.A.paths.forEach((p,i)=>{if(n===0&&p.s!==vertex)return;const j=space.index.get(skey(t,i));if(j!==undefined)out[i]=f[j]});return out}
 multiply(u,v){const F=this.F,out=zeros(this.A.paths.length,F);u.forEach((a,i)=>{if(F.isZero(a))return;v.forEach((b,j)=>{const k=this.A.mul[i][j];if(k>=0&&!F.isZero(b))out[k]=F.add(out[k],F.mul(a,b))})});return out}
 cup(p,f,q,g){const n=p+q,space=this.space('co',n),F=this.F,out=zeros(space.items.length,F);space.items.forEach(({t,p:r},i)=>{const start=t.length?this.A.paths[t[0]].s:this.A.paths[r].s,split=p?this.A.paths[t[p-1]].e:start;out[i]=this.multiply(this.evaluate(f,p,t.slice(0,p),start),this.evaluate(g,q,t.slice(p),split))[r]});return out}
 insertion(p,f,q,g){const n=p+q-1;if(n<0)return [];const space=this.space('co',n),F=this.F,out=zeros(space.items.length,F);space.items.forEach(({t,p:r},j)=>{for(let i=0;i<p;i++){const v=i?this.A.paths[t[i-1]].e:(t.length?this.A.paths[t[0]].s:this.A.paths[r].s);const inner=this.evaluate(g,q,t.slice(i,i+q),v);inner.forEach((c,k)=>{if(F.isZero(c)||!this.A.paths[k].a.length)return;const outer=this.evaluate(f,p,[...t.slice(0,i),k,...t.slice(i+q)],t.length?this.A.paths[t[0]].s:this.A.paths[r].s);out[j]=F.add(out[j],F.mul(F.from((-1)**((q-1)*i)),F.mul(c,outer[r])))})}});return out}
 bracket(p,f,q,g){const out=this.insertion(p,f,q,g);addScaled(out,this.insertion(q,g,p,f),this.F.from(-((-1)**((p-1)*(q-1)))),this.F);return out}
 cap(p,f,n,z){if(p>n)return [];const F=this.F,src=this.space('ho',n),dst=this.space('ho',n-p),out=zeros(dst.items.length,F);src.items.forEach(({t,p:a},j)=>{if(F.isZero(z[j]))return;const ev=this.evaluate(f,p,t.slice(0,p),this.A.paths[a].e);ev.forEach((c,k)=>{const b=this.A.mul[a][k];if(b<0||F.isZero(c))return;const row=dst.index.get(skey(t.slice(p),b));if(row!==undefined)out[row]=F.add(out[row],F.mul(z[j],c))})});return out.map(c=>F.mul(F.from((-1)**((n+p)*p)),c))}
 contraction(p,f,n,z){return this.cap(p,f,n,z).map(c=>this.F.mul(this.F.from((-1)**(p*(n+p))),c))}
 lie(p,f,n,z){
  if(n-p+1<0)return [];const F=this.F,out=zeros(this.space('ho',n-p+1).items.length,F);
  if(n>=p)addScaled(out,apply(this.connes(n-p),this.contraction(p,f,n,z),out.length,F),F.o,F);
  const Bz=apply(this.connes(n),z,this.space('ho',n+1).items.length,F);
  addScaled(out,this.contraction(p,f,n+1,Bz),F.from(-((-1)**p)),F);return out.map(c=>F.mul(F.from((-1)**(p+1)),c));
 }
 operation(type,p,cs,q=0,ds=[]){const F=this.F;let n,kind,v;
  if(type==='connes'){n=p+1;kind='ho';const z=this.vector('ho',p,cs);v=apply(this.connes(p),z,this.space('ho',n).items.length,F)}
  else {const f=this.vector('co',p,cs);if(type==='cap'||type==='lie'){n=q-p+(type==='lie'?1:0);kind='ho';v=type==='lie'?this.lie(p,f,q,this.vector('ho',q,ds)):this.cap(p,f,q,this.vector('ho',q,ds))}else{const g=this.vector('co',q,ds);n=type==='cup'?p+q:p+q-1;kind='co';v=type==='cup'?this.cup(p,f,q,g):this.bracket(p,f,q,g)}}
  return {degree:n,kind,coefficients:n<0?[]:this.group(kind,n).project(v).map(F.str),representative:n<0?[]:this.describeVector(kind,n,v)};
 }
 lieStructure(){
  const g=this.group('co',1),F=this.F,N=g.basis.length;
  if(N>35)throw Error('The full Lie table is limited to dimension 35. Individual brackets remain available.');
  const table=g.basis.map(f=>g.basis.map(h=>g.project(this.bracket(1,f,1,h))));
  const centerMatrix=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>table[i][j]).flat());
  const center=kernel(centerMatrix,N,F),derived=[N];let basis=Array.from({length:N},(_,i)=>identityVector(N,i,F));
  const bracket=(u,v)=>{const out=zeros(N,F);for(let i=0;i<N;i++)for(let j=0;j<N;j++)addScaled(out,table[i][j],F.mul(u[i],v[j]),F);return out};
  while(basis.length){const R=reducer(F),next=[];for(const u of basis)for(const v of basis){const b=bracket(u,v);if(R.add(b))next.push(b)}derived.push(next.length);if(next.length===basis.length)break;basis=next}
  return {dimension:N,centerDimension:center.length,center:center.map(v=>v.map(F.str)),table:table.map(row=>row.map(v=>v.map(F.str))),derived,solvable:derived.at(-1)===0};
 }
 describeVector(kind,n,v,model='bar'){
  const space=kind==='cyclic'?this.cyclicSpace(n):this.space(kind,n,model);
  const path=j=>{
   const p=this.A.paths[j],arrowLabels=p.a.map(id=>this.A.arrows.get(id).label);
   const ambiguous=this.A.paths.some((other,k)=>k!==j&&other.label===p.label)||arrowLabels.some(label=>/[|\[\]↦·()"\\<>]/.test(label));
   const notation=p.a.length&&ambiguous?`path(${arrowLabels.map(s=>JSON.stringify(s)).join(', ')})`:p.label;
   return {label:p.label,notation,arrows:p.a.slice(),vertex:p.s,type:p.a.length?'path':'idempotent'};
  };
  return v.flatMap((c,i)=>{
   if(this.F.isZero(c))return [];
   let x=space.items[i],summand=null;
   if(kind==='cyclic'){summand=x.k;x=this.space('ho',x.k).items[x.i]}
   const output=path(x.p),input=x.t.map(path);
   // A degree-zero cochain takes a vertex idempotent as input, even when
   // its value is a nontrivial closed path at that vertex.
   if(kind==='co'&&!input.length)input.push(path(this.A.idem.get(output.vertex)));
   const tensor=input.map(p=>p.notation).join(' | '),prefix=summand===null?'':`C_${summand}: `;
   const central=kind==='co'&&n===0;
   return [{coefficient:this.F.str(c),kind,degree:n,form:central?'central-element':kind==='co'?'cochain':'chain',input,output,summand,coordinate:i,term:prefix+(central?output.notation:kind==='co'?`[${tensor}] ↦ ${output.notation}`:`${output.notation} [${tensor}]`)}];
  });
 }
 describeBasis(kind,n,model='bar'){
  const group=kind==='cyclic'?this.cyclic(n):this.group(kind,n,model),basis=group.basis.map(v=>this.describeVector(kind,n,v,model));
  const printed=new Set();
  for(let i=0;i<basis.length;i++){
   const key=JSON.stringify(basis[i].map(t=>[t.coefficient,t.term]));
   if(printed.has(key))throw Error(`Representative check failed: duplicate printed ${kind} basis classes in degree ${n}.`);
   printed.add(key);
   const recovered=zeros(group.basis[i].length,this.F);
   for(const term of basis[i])recovered[term.coordinate]=this.F.from(term.coefficient);
   if(recovered.some((c,j)=>!this.F.eq(c,group.basis[i][j])))throw Error('Representative check failed: serialized coordinates differ from the computed vector.');
  }
  return basis;
 }
 report(maxDegree=3,progress=()=>{}){
  const rows=[];for(let n=0;n<=maxDegree;n++){
   progress(`Computing degree ${n}…`);const co=this.group('co',n),ho=this.group('ho',n),bc=this.group('co',n,'bardzell'),bh=this.group('ho',n,'bardzell'),cy=this.cyclic(n);
   if(co.basis.length!==bc.basis.length||ho.basis.length!==bh.basis.length)throw Error(`Independent resolution check failed in degree ${n}.`);
   const row={degree:n,hhCo:co.basis.length,hhHo:ho.basis.length,hc:cy.basis.length,coBasis:this.describeBasis('co',n),hoBasis:this.describeBasis('ho',n),cyBasis:this.describeBasis('cyclic',n),coSize:this.space('co',n).items.length,hoSize:this.space('ho',n).items.length,coBoundaryRank:co.rank,hoBoundaryRank:ho.rank};rows.push(row);
   const B=this.connes(n),bnext=this.differential('ho',n+1),b=this.differential('ho',n);
   if(n<maxDegree&&!isZeroComposition(this.connes(n+1),B,this.space('ho',n+2).items.length,this.F))throw Error('Internal check failed: B² ≠ 0.');
   for(let j=0;j<B.length;j++){const a=apply(bnext,B[j],this.space('ho',n).items.length,this.F);if(n>0)addScaled(a,apply(this.connes(n-1),b[j],a.length,this.F),this.F.o,this.F);if(a.some(c=>!this.F.isZero(c)))throw Error('Internal check failed: bB + Bb ≠ 0.')}
  }
  return {engine:ENGINE_VERSION,characteristic:String(this.F.p),maxDegree,algebraDimension:this.A.paths.length,paths:this.A.paths.map(p=>p.label),rows,checks:['Gentle conditions and finite dimensionality','Exact arithmetic over the selected prime field','Cochain and chain differentials square to zero','Bar and Bardzell dimensions agree in every displayed degree','B² = 0 and bB + Bb = 0 on computed chain spaces','Cyclic total differential squares to zero','Printed basis representatives are distinct and reproduce the computed vectors'],convention:'Paths compose left to right. Representatives use the E-relative normalized bar resolution. Cap: (−1)^(p(n+p)) a₀ f(a₁,…,aₚ) [aₚ₊₁|…|aₙ] (paper §5.3). Contraction I_f is the unsigned bar evaluation; L_f = I_f B − (−1)^p B I_f. The Cartan identity [L_f,I_g] = I_[f,g] is checked in this convention.'};
 }
}
