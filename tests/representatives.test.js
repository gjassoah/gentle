import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculus} from '../src/engine.js';
import {examples} from '../src/examples.js';
test('dual numbers in characteristic two: both positive-degree classes have distinct output paths',()=>{
 const c=new Calculus(examples.dual,2);
 for(const model of ['bar','bardzell'])for(let n=1;n<=5;n++)for(const kind of ['co','ho']){
  const g=c.group(kind,n,model);assert.equal(g.basis.length,2);
  const basis=g.basis.map(v=>c.describeVector(kind,n,v,model));
  assert.deepEqual(basis.map(b=>b[0].output.type),['idempotent','path']);
  assert.deepEqual(basis.map(b=>b[0].output.arrows),[[],['a']]);
  assert.notEqual(basis[0][0].term,basis[1][0].term);
  assert.deepEqual(basis.map(b=>b[0].input.map(p=>p.arrows)),[Array.from({length:n},()=>['a']),Array.from({length:n},()=>['a'])]);
 }
});
test('degree-zero cochains use the vertex idempotent as domain, including nontrivial central paths',()=>{
 const c=new Calculus(examples.dual,2),basis=c.group('co',0).basis.map(v=>c.describeVector('co',0,v));
 assert.equal(basis[0][0].term,'e(1)');
 assert.equal(basis[1][0].term,'ε');
 assert.equal(basis[1][0].form,'central-element');
 assert.equal(basis[1][0].input[0].type,'idempotent');
});
test('degree-zero central-element display is e(1), epsilon in every tested characteristic',()=>{
 for(const p of [0,2,3,5]){const c=new Calculus(examples.dual,p);assert.deepEqual(c.describeBasis('co',0).map(b=>b.map(t=>t.term)),[['e(1)'],['ε']])}
});
test('an arrow named like its vertex idempotent cannot duplicate printed cohomology classes',()=>{
 const q=structuredClone(examples.dual);q.arrows[0].label='e(1)';const c=new Calculus(q,2);
 for(const model of ['bar','bardzell'])for(let n=0;n<=4;n++){
  const basis=c.describeBasis('co',n,model);
  assert.equal(basis.length,2);
  assert.notEqual(basis[0][0].term,basis[1][0].term);
  assert.equal(basis[0][0].output.notation,'e(1)');
  assert.equal(basis[1][0].output.notation,'path("e(1)")');
 }
});
test('an arrow label containing a product separator remains distinct from a composite path',()=>{
 const q={vertices:['1','2','3'].map(id=>({id,label:id})),arrows:[{id:'a',label:'a',source:'1',target:'2'},{id:'b',label:'b',source:'2',target:'3'},{id:'c',label:'a·b',source:'1',target:'3'}],relations:[]};
 const c=new Calculus(q),basis=c.describeBasis('co',1);
 const paths=basis.flatMap(b=>b.flatMap(t=>[...t.input,t.output]));
 assert.ok(paths.some(p=>p.notation==='path("a", "b")'));
 assert.ok(paths.some(p=>p.notation==='path("a·b")'));
});
test('printed basis uniqueness is checked before a report is returned',()=>{
 const c=new Calculus(examples.dual,2),describe=c.describeVector.bind(c);
 c.describeVector=(...args)=>describe(...args).map(term=>({...term,term:'same incorrect representative'}));
 assert.throws(()=>c.describeBasis('co',1),/duplicate printed/);
});
