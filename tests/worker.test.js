import test from 'node:test';import assert from 'node:assert/strict';import {examples} from '../src/examples.js';import {latexReport} from '../src/export.js';
import {familyDimension} from '../src/structure.js';
const messages=[];globalThis.self={postMessage:x=>messages.push(x)};await import('../src/worker.js');
function call(data){messages.length=0;self.onmessage({data:{id:1,...data}});return messages.at(-1)}
test('derived computations do not require a calculus report or destroy its worker state',()=>{const a=call({type:'derived',quiver:examples.aps1});assert.ok(!a.error,a.error);assert.equal(a.result.components[0].gcd,0);const b=call({type:'compareDerived',left:examples.aps1,right:examples.aps2,leftCharacteristic:0,rightCharacteristic:0});assert.equal(b.result.equivalent,false);assert.ok(!call({type:'init',quiver:examples.dual,characteristic:2}).error);call({type:'derived',quiver:examples.aps2});const g=call({type:'group',kind:'co',degree:1});assert.equal(g.result.dimension,2);assert.equal(g.result.basis[1][0].output.label,'ε')});
test('worker report includes checked Connes matrices and de Rham representatives',()=>{const x=call({type:'compute',quiver:examples.dual,characteristic:2,degree:3});assert.ok(!x.error,x.error);assert.equal(x.result.mode,'checked');assert.equal(x.result.rows[0].connesRank,1);assert.equal(x.result.rows[0].deRhamBasis.length,1);assert.ok(x.result.ring[0].exceptional)});
test('equivalent characteristic spellings preserve checked reports, the full ring and formula queries',()=>{
 for(const degree of [0,3]){
  const expected=call({type:'compute',quiver:examples.dual,characteristic:2,degree}).result;
  for(const characteristic of [2,'2','02','0002']){
   const x=call({type:'compute',quiver:examples.dual,characteristic,degree});assert.ok(!x.error,x.error);
   assert.deepEqual(x.result,expected);assert.equal(x.result.characteristic,'2');assert.equal(x.result.mode,'checked');
   assert.equal(familyDimension(x.result.families,1),2);assert.ok(x.result.ring[0].exceptional);
   assert.equal(call({type:'formula',degree:1}).result.co,2);
  }
 }
});
test('characteristic-two spellings preserve exact dimensions in formula fallback',()=>{
 const vertices=Array.from({length:12},(_,i)=>({id:'line'+i,label:'line'+i})),arrows=vertices.slice(1).map((v,i)=>({id:'lineArrow'+i,label:'lineArrow'+i,source:vertices[i].id,target:v.id}));
 const q={vertices:[...vertices,...examples.dual.vertices],arrows:[...arrows,...examples.dual.arrows],relations:examples.dual.relations};
 let expected;
 for(const characteristic of [2,'2','02','0002']){
  const x=call({type:'compute',quiver:q,characteristic,degree:4});assert.ok(!x.error,x.error);
  assert.equal(x.result.mode,'formulas');assert.equal(x.result.characteristic,'2');
  assert.deepEqual(x.result.rows.map(r=>r.hhCo),[3,2,2,2,2]);assert.equal(x.result.ring.filter(r=>r.exceptional).length,1);
  if(expected)assert.deepEqual(x.result,expected);else expected=x.result;
 }
});
test('resource fallback retains exact dimensions and never invents representatives',()=>{const vertices=Array.from({length:12},(_,i)=>({id:'v'+i,label:String(i)})),arrows=vertices.slice(1).map((v,i)=>({id:'a'+i,label:'a'+i,source:'v'+i,target:v.id})),q={vertices,arrows,relations:[]};const x=call({type:'compute',quiver:q,characteristic:0,degree:4});assert.ok(!x.error,x.error);assert.equal(x.result.mode,'formulas');assert.deepEqual(x.result.rows.map(r=>r.hhCo),[1,0,0,0,0]);assert.equal(x.result.rows[0].coBasis,null);assert.equal(x.result.rows[0].hhHo,12);assert.ok(!x.result.checks.some(c=>c.includes('Bar and Bardzell')));assert.ok(latexReport(q,x.result).includes('not materialized'))});
