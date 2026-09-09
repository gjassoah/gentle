import {canonicalCharacteristic} from './linear.js';
// Combinatorics of the permitted and forbidden successor graphs.
export function structure(A){
 const {q,paths,rel}=A,as=new Map(q.arrows.map(a=>[a.id,a])),parent=new Map(q.vertices.map(v=>[v.id,v.id]));
 const find=x=>{while(parent.get(x)!==x)x=parent.get(x);return x};const chords=[];
 for(const a of q.arrows){const x=find(a.source),y=find(a.target);if(x===y)chords.push(a.id);else parent.set(x,y)}
 const components=new Set(q.vertices.map(v=>find(v.id))).size;
 const successor=new Map(),predecessor=new Map();for(const a of q.arrows)for(const b of q.arrows)if(a.target===b.source&&rel.has(JSON.stringify([a.id,b.id]))){successor.set(a.id,b.id);predecessor.set(b.id,a.id)}
 const seen=new Set(),forbidden=[],cycles=[];
 for(const a of q.arrows)if(!predecessor.has(a.id)){const t=[];let id=a.id;while(id!==undefined&&!seen.has(id)){t.push(id);seen.add(id);id=successor.get(id)}forbidden.push(t)}
 for(const a of q.arrows)if(!seen.has(a.id)){const t=[];let id=a.id;while(id!==undefined&&!seen.has(id)){t.push(id);seen.add(id);id=successor.get(id)}cycles.push(t)}
 const permitted=paths.filter(p=>p.a.length&&!q.arrows.some(a=>a.target===p.s&&!rel.has(JSON.stringify([a.id,p.a[0]])))&&!q.arrows.some(a=>a.source===p.e&&!rel.has(JSON.stringify([p.a.at(-1),a.id]))));
 const cartan=q.vertices.map(v=>q.vertices.map(w=>paths.filter(p=>p.s===v.id&&p.e===w.id).length));
 return {components,euler:q.vertices.length-q.arrows.length,cycleRank:chords.length,chords:chords.map(id=>as.get(id).label),globalDimension:cycles.length?'∞':Math.max(0,...forbidden.map(t=>t.length)),permitted:permitted.map(p=>p.label),forbidden:forbidden.map(t=>t.map(id=>as.get(id).label).join('·')),cycles:cycles.map(t=>({length:t.length,arrows:t.map(id=>as.get(id).label),label:t.map(id=>as.get(id).label).join('·')})),cartan,vertices:q.vertices.map(v=>v.label)};
}

// Ribbon graph from maximal permitted paths (paper, Chapter 7).
// A half-edge is a visit to a quiver vertex, including repeated visits.
export function surfaceComponents(q){
 const seen=new Set(),components=[];
 for(const vertex of q.vertices)if(!seen.has(vertex.id)){
  const ids=new Set(),todo=[vertex.id];while(todo.length){const id=todo.pop();if(ids.has(id))continue;ids.add(id);seen.add(id);for(const a of q.arrows){if(a.source===id)todo.push(a.target);if(a.target===id)todo.push(a.source)}}
  const vertices=q.vertices.filter(v=>ids.has(v.id)),arrows=q.arrows.filter(a=>ids.has(a.source)),arrowIds=new Set(arrows.map(a=>a.id));
  const r=ribbonFromQuiver({vertices,arrows,relations:q.relations.filter(t=>t.every(id=>arrowIds.has(id)))});
  components.push({genus:r.genus,boundaries:r.boundaries.filter(b=>b.markedPoints>0).length,punctures:r.boundaries.filter(b=>b.markedPoints===0).length,vertices:vertices.map(v=>v.label)});
 }
 return components;
}
// For a validated gentle presentation, obtain just the maximal threads without
// enumerating the entire algebra path basis. Used by the derived invariant.
export function ribbonFromQuiver(q){
 const rel=new Set(q.relations.map(r=>JSON.stringify(r))),successor=new Map(),predecessor=new Set();
 for(const a of q.arrows)for(const b of q.arrows)if(a.target===b.source&&!rel.has(JSON.stringify([a.id,b.id]))){successor.set(a.id,b);predecessor.add(b.id)}
 const seen=new Set(),paths=[];
 for(const start of q.arrows)if(!predecessor.has(start.id)){
  const walk=[];let arrow=start;
  while(arrow){if(seen.has(arrow.id))throw Error('Ribbon check failed: permitted threads overlap or cycle.');seen.add(arrow.id);walk.push(arrow);arrow=successor.get(arrow.id)}
  paths.push({s:start.source,e:walk.at(-1).target,a:walk.map(a=>a.id),label:walk.map(a=>a.label).join('·')});
 }
 if(seen.size!==q.arrows.length)throw Error('An allowed oriented cycle makes this algebra infinite-dimensional.');
 return ribbon({q,paths,rel});
}
export function ribbon(A){
 const {q,paths,rel}=A,arrows=new Map(q.arrows.map(a=>[a.id,a]));
 const maximal=paths.filter(p=>p.a.length&&!q.arrows.some(a=>a.target===p.s&&!rel.has(JSON.stringify([a.id,p.a[0]])))&&!q.arrows.some(a=>a.source===p.e&&!rel.has(JSON.stringify([p.a.at(-1),a.id]))));
 const threads=maximal.map(p=>({label:p.label,visits:[p.s,...p.a.map(id=>arrows.get(id).target)]}));
 for(const v of q.vertices){const count=threads.reduce((n,t)=>n+t.visits.filter(x=>x===v.id).length,0);if(count>2)throw Error('Ribbon check failed: more than two incidences.');for(let i=count;i<2;i++)threads.push({label:`e(${v.label})`,visits:[v.id]})}
 const half=[],sigma=[],marked=new Set(),byVertex=new Map(q.vertices.map(v=>[v.id,[]]));
 threads.forEach((t,j)=>{const start=half.length;t.visits.forEach((v,i)=>{const id=half.length;half.push({vertex:v,thread:j});byVertex.get(v).push(id);sigma[id]=start+(i+1)%t.visits.length});marked.add(half.length-1)});
 const alpha=[];for(const ids of byVertex.values()){if(ids.length!==2)throw Error('Ribbon check failed: edge has not exactly two ends.');alpha[ids[0]]=ids[1];alpha[ids[1]]=ids[0]}
 const seen=new Set(),boundaries=[];
 for(let h=0;h<half.length;h++)if(!seen.has(h)){let x=h;const walk=[];let marks=0;do{seen.add(x);const sector=alpha[x];marks+=marked.has(sector)?1:0;walk.push(q.vertices.find(v=>v.id===half[x].vertex).label);x=sigma[sector]}while(x!==h);const forbiddenLength=walk.length-marks;boundaries.push({markedPoints:marks,forbiddenLength,winding:forbiddenLength-marks,edgeWalk:walk})}
 const parent=threads.map((_,i)=>i),find=i=>{while(parent[i]!==i)i=parent[i];return i};for(const ids of byVertex.values())parent[find(half[ids[0]].thread)]=find(half[ids[1]].thread);
 const components=new Set(parent.map((_,i)=>find(i))).size,euler=threads.length-q.vertices.length,genus=(2*components-boundaries.length-euler)/2;
 if(!Number.isInteger(genus)||genus<0)throw Error('Ribbon check failed: invalid Euler characteristic.');
 const aagMap=new Map();for(const b of boundaries){const key=`${b.markedPoints},${b.forbiddenLength}`;aagMap.set(key,(aagMap.get(key)||0)+1)}
 return {threads:threads.map(t=>({label:t.label,visits:t.visits.map(id=>q.vertices.find(v=>v.id===id).label)})),edges:q.vertices.map(v=>({label:v.label,ends:byVertex.get(v.id).map(h=>half[h].thread)})),boundaries,euler,genus,components,markedPoints:threads.length,aag:[...aagMap].map(([key,value])=>({pair:key.split(',').map(Number),multiplicity:value})),combinatorics:{half,sigma,alpha,marked:[...marked]}};
}

// A finite description of all homogeneous HH* basis families in Theorem 3.12.
export function cohomologyFamilies(A,characteristic){
 const s=structure(A),p=canonicalCharacteristic(characteristic),{q,paths,rel}=A,as=new Map(q.arrows.map(a=>[a.id,a]));
 const families=[];
 families.push({type:'I',name:'Component units',degree:0,multiplicity:s.components,description:'One unit for each connected component.'});
 const central=paths.filter(a=>a.a.length&&a.s===a.e&&!q.arrows.some(b=>b.target===a.s&&!rel.has(JSON.stringify([b.id,a.a[0]])))&&!q.arrows.some(b=>b.source===a.e&&!rel.has(JSON.stringify([a.a.at(-1),b.id]))));
 for(const a of central)families.push({type:'II',name:`c(${a.label})`,degree:0,multiplicity:1,description:`${a.label} is a maximal closed permitted path.`});
 for(const c of s.chords)families.push({type:'IV',name:`d(${c})`,degree:1,multiplicity:1,description:`Arrow-scaling derivation: ${c} ↦ ${c}.`});
 const successor=new Map(),predecessor=new Map();for(const a of q.arrows)for(const b of q.arrows)if(a.target===b.source&&rel.has(JSON.stringify([a.id,b.id]))){successor.set(a.id,b.id);predecessor.set(b.id,a.id)}
 for(const a of q.arrows)if(!predecessor.has(a.id)){const t=[];let id=a.id;while(id!==undefined){t.push(id);id=successor.get(id)}const end=as.get(t.at(-1)).target;for(const b of paths)if(b.s===a.source&&b.e===end&&b.a[0]!==t[0]&&b.a.at(-1)!==t.at(-1))families.push({type:'VI',name:`u(${t.map(id=>as.get(id).label).join('·')} ↦ ${b.label})`,degree:t.length,multiplicity:1,description:'Maximal forbidden path parallel to a permitted path with distinct end arrows.'})}
 for(const [i,c] of s.cycles.entries()){const step=p==='2'||c.length%2===0?c.length:2*c.length;families.push({type:'VII',name:`t${i+1}`,degree:step,step,multiplicity:1,description:`Circuit ${c.label}; one class in each positive multiple of ${step}.`});families.push({type:'VIII',name:`s${i+1}`,degree:step+1,step,multiplicity:1,description:`Circuit ${c.label}; one class in each degree ${step}k + 1, k ≥ 1.`})}
 return families;
}
export function familyDimension(families,n){return families.reduce((sum,f)=>sum+((f.step?n>=f.degree&&(n-f.degree)%f.step===0:n===f.degree)?f.multiplicity:0),0)}
export function homologyFormula(A,characteristic,n){
 const s=structure(A),p=Number(canonicalCharacteristic(characteristic));let hh=n===0?A.q.vertices.length:0,bRank=0,deRham=n===0?A.q.vertices.length:0,hc=n%2===0?A.q.vertices.length:0;
 for(const c of s.cycles)for(let m=c.length;m<=n+1;m+=c.length){if(p!==2&&(m+1)*c.length%2)continue;const divisible=p!==0&&(m/c.length)%p===0;
  if(n===m||n===m-1){hh++;if(divisible)deRham++}
  if(n===m-1&&!divisible)bRank++;
  if(n===m-1||(n===m&&divisible))hc++;
  if(divisible){if(n>=m+1&&(n-(m-1))%2===0)hc++;if(n>=m+2&&(n-m)%2===0)hc++}
 }
 return {hh,bRank,deRham,hc};
}

export function ringPresentation(A,characteristic){
 characteristic=canonicalCharacteristic(characteristic);
 const {q}=A,seen=new Set(),components=[];
 for(const vertex of q.vertices)if(!seen.has(vertex.id)){const stack=[vertex.id],ids=new Set();while(stack.length){const id=stack.pop();if(ids.has(id))continue;ids.add(id);seen.add(id);for(const a of q.arrows){if(a.source===id)stack.push(a.target);if(a.target===id)stack.push(a.source)}}
  const sub={...A,q:{vertices:q.vertices.filter(v=>ids.has(v.id)),arrows:q.arrows.filter(a=>ids.has(a.source)),relations:q.relations},paths:A.paths.filter(p=>ids.has(p.s))};const families=cohomologyFamilies(sub,characteristic),s=structure(sub);
  if(String(characteristic)==='2'&&sub.q.vertices.length===1&&sub.q.arrows.length===1){components.push({vertices:sub.q.vertices.map(v=>v.label),exceptional:true,generators:[{name:'c',degree:0,description:'The central loop.'},{name:'t',degree:1,description:'The derivative sending the loop to its vertex idempotent.'}],allowedProducts:['t·t','c·t'],equalities:[],description:'k[c,t]/(c²), with |c| = 0 and |t| = 1. The arrow-scaling derivation is c·t.'});continue}
  const generators=families.filter(f=>!['I','VIII'].includes(f.type)),allowedProducts=[],equalities=[];
  s.cycles.forEach((c,i)=>{const name=`t${i+1}`;allowedProducts.push(`${name}·${name}`);const ds=s.chords.filter(a=>c.arrows.includes(a));for(const a of ds)allowedProducts.push(`d(${a})·${name}`);for(let j=1;j<ds.length;j++)equalities.push(`d(${ds[j]})·${name} = d(${ds[0]})·${name}`)});
  components.push({vertices:sub.q.vertices.map(v=>v.label),exceptional:false,generators,allowedProducts,equalities,description:'The free unital graded-commutative algebra on these generators, modulo every quadratic monomial except the products listed below, and modulo the listed equalities. Products involving the unit retain their usual values.'});
 }
 return components;
}
