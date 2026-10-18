import test from 'node:test';
import assert from 'node:assert/strict';
import {createConvention,normalizeConvention,transportSign,coordinateTerms,invariantFormula,invariantFormulas} from '../src/convention.js';
import {Calculus,algebra} from '../src/engine.js';
import {structure,ribbon,cohomologyFamilies,ringPresentation} from '../src/structure.js';
import {derivedInvariant} from '../src/derived.js';
import {examples} from '../src/examples.js';

const report=(q,p=0)=>{const c=new Calculus(q,p),r=c.report(3);r.structure=structure(c.A);r.structure.ribbon=ribbon(c.A);r.families=cohomologyFamilies(c.A,p);r.ring=ringPresentation(c.A,p);return r};
const record=(arrows,vertex='v1')=>({arrows,vertex,type:arrows.length?'path':'idempotent',label:'UNCONVERTED PATH',notation:'UNCONVERTED PATH'});

test('left modules are the default; path order, relation order and sequence round trips use one boundary',()=>{
 const q=examples.a3,left=createConvention(q),right=createConvention(q,'right');
 assert.equal(normalizeConvention(), 'left');assert.equal(normalizeConvention('invalid'),'left');
 assert.equal(left.name,'left');assert.equal(left.path(['a','b']),'β·α');assert.equal(right.path(['a','b']),'α·β');
 assert.equal(left.relation(['a','b']),'β·α');assert.equal(left.zeroRelation(['a','b']),'β·α = 0');
 assert.equal(left.path([],'v1'),'e(1)');
 for(const d of [left,right])assert.deepEqual(d.sequence(d.sequence(['a','b'])),['a','b']);
});

test('coordinate and invariant formulas explicitly cross an identity display boundary',()=>{
 const left=createConvention(examples.dual),right=createConvention(examples.dual,'right');
 assert.equal(left.invariants,right.invariants);assert.equal(left.invariants,invariantFormulas);
 for(const formula of Object.values(invariantFormulas))assert.equal(invariantFormula(formula),formula);
 const body='<mrow><mi>h</mi><mo>+</mo><mn>1</mn></mrow>';assert.equal(invariantFormula(body),body);
 assert.match(invariantFormulas.homologyFamilies,/B\(x_\(C,k\)\) = k y_\(C,k\)/);
});

test('separator, quote, markup and idempotent-like labels have unambiguous reversed notation',()=>{
 const q=structuredClone(examples.a3);q.arrows[0].label='a·"b';q.arrows[1].label='x|[y]\\<z>';
 const left=createConvention(q),right=createConvention(q,'right');
 assert.equal(left.path(['a','b']),`path(${JSON.stringify(q.arrows[1].label)}, ${JSON.stringify(q.arrows[0].label)})`);
 assert.equal(right.path(['a','b']),`path(${JSON.stringify(q.arrows[0].label)}, ${JSON.stringify(q.arrows[1].label)})`);
 q.arrows[0].label='e(1)';assert.equal(createConvention(q).path(['a']),'path("e(1)")');
 assert.equal(createConvention(q).path([],'v1'),'e(1)');
});

test('cochain and chain transport signs in degrees zero through five include every path and bar factor',()=>{
 const q=examples.a3,left=createConvention(q),right=createConvention(q,'right'),signs=[1,1,-1,-1,1,1];
 for(let degree=0;degree<=5;degree++)for(const kind of ['co','ho']){
  const input=Array.from({length:degree},(_,i)=>record(i%2?['a','b']:['a']));
  const t={kind,degree,coefficient:'3/5',form:kind==='co'?'cochain':'chain',input,output:record(['a','b']),summand:null,coordinate:7};
  const expectedInputs=input.slice().reverse().map(p=>p.arrows.slice().reverse());
  assert.equal(transportSign(degree),signs[degree]);
  const l=left.representative([t])[0];assert.equal(l.coefficient,signs[degree]<0?'-3/5':'3/5');
  assert.deepEqual(l.input.map(p=>p.arrows),expectedInputs);assert.deepEqual(l.output.arrows,['b','a']);assert.equal(l.output.notation,'β·α');
  assert.equal(l.coordinate,7);assert.ok(!l.term.includes('UNCONVERTED'));
  const r=right.representative([t])[0];assert.equal(r.coefficient,'3/5');assert.deepEqual(r.input.map(p=>p.arrows),input.map(p=>p.arrows));
  assert.deepEqual(left.representative(left.representative([t])),left.representative([t]));
  assert.deepEqual(right.representative(left.representative([t])),right.representative([t]));
 }
 assert.throws(()=>transportSign(-1));assert.throws(()=>transportSign(3,2));
});

test('transport scalars use the selected prime field; degree-zero central elements keep their idempotent input',()=>{
 const c=new Calculus(examples.dual),t=c.describeBasis('co',2)[0];
 assert.equal(createConvention(examples.dual,'left',0).representative(t)[0].coefficient,'-1');
 assert.equal(createConvention(examples.dual,'left',2).representative(t)[0].coefficient,'1');
 assert.equal(createConvention(examples.dual,'left',3).representative(t)[0].coefficient,'2');
 const central=createConvention(examples.dual).representative(c.describeBasis('co',0)[1])[0];
 assert.equal(central.term,'ε');assert.equal(central.coefficient,'1');assert.equal(central.input[0].notation,'e(1)');
});

test('cyclic representatives carry the additional summand sign',()=>{
 const display=createConvention(examples.dual);
 for(let degree=0;degree<=5;degree++)for(let k=degree;k>=0;k-=2){
  const t={coefficient:'1',kind:'cyclic',degree,form:'chain',input:Array.from({length:k},()=>record(['a'])),output:record([]),summand:k,coordinate:0};
  const expected=(-1)**((degree-k)/2+k*(k-1)/2);
  const converted=display.representative([t])[0];
  assert.equal(converted.coefficient,String(expected));assert.equal(converted.term,`C_${k}: e(1) [${Array(k).fill('ε').join(' | ')}]`);
 }
 // In CC_2 the C_0 summand changes sign even though T_0 itself is positive.
 assert.equal(transportSign(2,0),-1);
});

test('reports regenerate every structural path from ids and preserve invariants and raw data',()=>{
 for(const q of Object.values(examples)){
  const raw=report(q),snapshot=structuredClone(raw),left=createConvention(q).report(raw),right=createConvention(q,'right').report(raw);
  const s=raw.structure;
  assert.deepEqual(left.paths,s.pathRecords.map(p=>createConvention(q).path(p.arrows,p.vertex)));
  assert.deepEqual(right.paths,s.pathRecords.map(p=>createConvention(q,'right').path(p.arrows,p.vertex)));
  assert.deepEqual(left.structure.permitted,s.permittedRecords.map(p=>createConvention(q).path(p.arrows,p.vertex)));
  assert.deepEqual(left.structure.forbidden,s.forbiddenRecords.map(p=>createConvention(q).path(p.arrows,p.vertex)));
  for(const [i,cycle] of s.cycles.entries())assert.equal(left.structure.cycles[i].label,createConvention(q).path(cycle.arrowIds));
  assert.deepEqual(left.structure.cartan,right.structure.cartan);assert.deepEqual(left.structure.ribbon.aag,right.structure.ribbon.aag);
  assert.equal(left.structure.ribbon.genus,right.structure.ribbon.genus);
  assert.deepEqual(left.structure.ribbon.boundaries.map(b=>b.winding),right.structure.ribbon.boundaries.map(b=>b.winding));
  left.structure.ribbon.threads.forEach((t,i)=>assert.deepEqual(t.visits,right.structure.ribbon.threads[i].visits.slice().reverse()));
  assert.deepEqual(createConvention(q,'right').report(left),right);
  assert.deepEqual(raw,snapshot);
 }
});

test('family and ring generators preserve distinct paths even when their old joined labels collide',()=>{
 const labels=['x·y','z','y','z·x'],ends=[['v','w'],['w','v'],['v','x'],['x','v']];
 const q={vertices:['v','w','x'].map(id=>({id,label:id})),arrows:ends.map(([source,target],i)=>({id:'a'+i,label:labels[i],source,target})),relations:[['a0','a1'],['a1','a2'],['a2','a3'],['a3','a0']]};
 const A=algebra(q),left=createConvention(q),families=left.families(cohomologyFamilies(A,0)),ring=left.ring(ringPresentation(A,0));
 const expected=['c(path("x·y", "z"))','c(path("y", "z·x"))'];
 assert.deepEqual(families.filter(f=>f.type==='II').map(f=>f.name).sort(),expected);
 assert.deepEqual(ring.flatMap(c=>c.generators).filter(g=>g.type==='II').map(g=>g.name).sort(),expected);
 assert.equal(new Set(ring.flatMap(c=>c.generators.map(g=>g.name))).size,ring.flatMap(c=>c.generators).length);
});

test('operation records change displayed representatives while all input and output coordinates stay fixed',()=>{
 const c=new Calculus(examples.dual),output=c.operation('cup',2,['1'],2,['1']);
 const raw={type:'cup',p:2,q:2,left:['1'],right:['1'],result:output,outputBasis:{kind:'co',degree:4,basis:c.describeBasis('co',4)}};
 const snapshot=structuredClone(raw),l=createConvention(examples.dual).operation(raw),r=createConvention(examples.dual,'right').operation(raw);
 assert.deepEqual(l.left,r.left);assert.deepEqual(l.right,r.right);assert.deepEqual(l.result.coefficients,r.result.coefficients);
 assert.deepEqual(raw,snapshot);assert.deepEqual(createConvention(examples.dual,'right').operation(l),r);
 assert.deepEqual(coordinateTerms(['0','-1','2/3']),[{index:1,negative:true,coefficient:'1'},{index:2,negative:false,coefficient:'2/3'}]);
});

test('derived walks reverse their written traversal and cyclic turns while keeping computed invariants',()=>{
 for(const q of Object.values(examples)){
  const raw=derivedInvariant(q),snapshot=structuredClone(raw),l=createConvention(q).derived(raw),r=createConvention(q,'right').derived(raw);
  assert.equal(l.signature,r.signature);
  for(const [i,c] of l.components.entries())for(const [j,curve] of c.curves.entries()){
   const original=r.components[i].curves[j];assert.equal(curve.winding,original.winding);
   assert.deepEqual(curve.walk,original.walk.slice().reverse().map(e=>({...e,from:e.to,to:e.from})));
   assert.equal(curve.turns.reduce((a,b)=>a+b,0),curve.winding);
   curve.walk.forEach((edge,k)=>assert.equal(edge.to,curve.walk[(k+1)%curve.walk.length].from));
  }
  assert.deepEqual(raw,snapshot);
 }
});
