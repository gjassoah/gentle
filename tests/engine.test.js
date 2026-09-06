import test from 'node:test';
import assert from 'node:assert/strict';
import {Calculus,validate} from '../src/engine.js';
import {field,apply,addScaled} from '../src/linear.js';
import {examples} from '../src/examples.js';
test('exact rationals and prime fields',()=>{const F=field();assert.equal(F.str(F.add(F.from('1/3'),F.from('2/7'))),'13/21');assert.equal(F.str(F.mul(F.from('9007199254740993'),F.from(3))),'27021597764222979');assert.equal(field(5).str(field(5).from('1/2')),'3');assert.throws(()=>field(4));assert.throws(()=>field(5).from('1/5'))});
test('gentle validation rejects infinite paths and branching',()=>{const q=structuredClone(examples.dual);q.relations=[];assert.match(validate(q).join(),/infinite/);const r=structuredClone(examples.kronecker);r.arrows.push({...r.arrows[0],id:'c',label:'c'});assert.match(validate(r).join(),/two/)});
test('ground field in every characteristic',()=>{for(const p of [0,2,3,5]){const r=new Calculus(examples.field,p).report(5);assert.deepEqual(r.rows.map(x=>x.hhCo),[1,0,0,0,0,0]);assert.deepEqual(r.rows.map(x=>x.hhHo),[1,0,0,0,0,0]);assert.deepEqual(r.rows.map(x=>x.hc),[1,0,1,0,1,0])}});
test('acyclic path algebra and Kronecker',()=>{const a=new Calculus(examples.a3).report(3);assert.equal(a.algebraDimension,6);assert.deepEqual(a.rows.map(x=>x.hhCo),[1,0,0,0]);assert.deepEqual(a.rows.map(x=>x.hhHo),[3,0,0,0]);assert.deepEqual(a.rows.map(x=>x.hc),[3,0,3,0]);assert.deepEqual(new Calculus(examples.kronecker).report(2).rows.map(x=>x.hhCo),[1,3,0])});
test('dual numbers dimensions and cyclic homology',()=>{for(const p of [0,2,3]){const r=new Calculus(examples.dual,p).report(5);assert.deepEqual(r.rows.map(x=>x.hhCo),p===2?[2,2,2,2,2,2]:[2,1,1,1,1,1]);assert.deepEqual(r.rows.map(x=>x.hhHo),p===2?[2,2,2,2,2,2]:[2,1,1,1,1,1]);if(p===0)assert.deepEqual(r.rows.map(x=>x.hc),[2,0,2,0,2,0])}});
test('radical square zero triangle characteristic dependence',()=>{const r=new Calculus(examples.triangle).report(6);assert.deepEqual(r.rows.map(x=>x.hhCo),[1,1,0,0,0,0,1]);assert.deepEqual(r.rows.map(x=>x.hhHo),[3,0,1,1,0,0,0]);const r2=new Calculus(examples.triangle,2).report(3);assert.deepEqual(r2.rows.map(x=>x.hhCo),[1,1,0,1])});
test('dual numbers: cup, bracket, cap and Connes on actual classes',()=>{const c=new Calculus(examples.dual),F=c.F;
 // HH0 basis [1, epsilon], HH1 co basis epsilon d/depsilon, HH2 co basis f(e,e)=1.
 assert.deepEqual(c.operation('cup',0,['0','1'],0,['0','1']).coefficients,['0','0']);
 assert.deepEqual(c.operation('cup',1,['1'],1,['1']).coefficients,['0']);
 assert.deepEqual(c.operation('cup',2,['1'],2,['1']).coefficients,['1']);
 assert.deepEqual(c.operation('bracket',1,['1'],0,['0','1']).coefficients,['0','1']);
 assert.deepEqual(c.operation('bracket',1,['1'],2,['1']).coefficients,['-2']);
 assert.deepEqual(c.operation('connes',0,['0','1']).coefficients,['1']);
 assert.deepEqual(c.operation('cap',1,['1'],1,['1']).coefficients,['0','1']);
 assert.deepEqual(c.operation('connes',2,['1']).coefficients,['3']);
});
test('characteristic two has a nonzero square of the degree-one derivative',()=>{const c=new Calculus(examples.dual,2);assert.deepEqual(c.operation('cup',1,['1','0'],1,['1','0']).coefficients,['1','0']);assert.deepEqual(c.operation('bracket',1,['1','0'],0,['0','1']).coefficients,['1','0'])});

import {structure,ribbon,cohomologyFamilies,familyDimension,homologyFormula} from '../src/structure.js';
test('ribbon graphs recover known surfaces and AAG data',()=>{for(const [name,aag,g] of [['field',[[2,0,1]],0],['a3',[[4,2,1]],0],['dual',[[0,1,1],[1,0,1]],0],['triangle',[[0,3,1],[3,0,1]],0],['kronecker',[[1,1,2]],0]]){const r=ribbon(new Calculus(examples[name]).A);assert.deepEqual(r.aag.map(x=>[...x.pair,x.multiplicity]).sort(),aag.sort());assert.equal(r.genus,g)}});
test('paper all-degree formulas agree with both resolutions and the cyclic total complex',()=>{
 const qs=Object.values(examples).map(x=>structuredClone(x));
 // Enumerate all quadratic relation subsets for small two-vertex quivers,
 // including attached loops, two-cycles, and mixed zero/nonzero compositions.
 for(const endpoints of [[[0,0],[0,1]],[[0,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,1],[1,0],[1,1]]]){
  const vertices=[{id:'v0',label:'0'},{id:'v1',label:'1'}],arrows=endpoints.map(([s,t],i)=>({id:'a'+i,label:'a'+i,source:'v'+s,target:'v'+t})),pairs=[];for(const a of arrows)for(const b of arrows)if(a.target===b.source)pairs.push([a.id,b.id]);
  for(let bits=0;bits<2**pairs.length;bits++){const q={vertices,arrows,relations:pairs.filter((_,i)=>bits&(1<<i))};if(!validate(q).length)qs.push(q)}
 }
 for(const q of qs)for(const p of [0,2,3]){const c=new Calculus(q,p),r=c.report(2),families=cohomologyFamilies(c.A,p);ribbon(c.A);for(const row of r.rows){const f=homologyFormula(c.A,p,row.degree);assert.equal(f.hh,row.hhHo,JSON.stringify(q));assert.equal(f.hc,row.hc,JSON.stringify(q));assert.equal(familyDimension(families,row.degree),row.hhCo,JSON.stringify(q))}}
});
test('all-degree formulas agree at higher multiples, including modular Connes zeros',()=>{for(const q of [examples.dual,examples.triangle])for(const p of [0,2,3,5]){const c=new Calculus(q,p),families=cohomologyFamilies(c.A,p);for(let n=0;n<=12;n++){const f=homologyFormula(c.A,p,n);assert.equal(familyDimension(families,n),c.group('co',n,'bardzell').basis.length);assert.equal(f.hh,c.group('ho',n,'bardzell').basis.length);assert.equal(f.hc,c.cyclic(n).basis.length)}}});
test('materialized degree 128 includes the adjacent differential',()=>{const c=new Calculus(examples.dual);assert.equal(c.group('co',128,'bardzell').basis.length,1);assert.throws(()=>c.group('co',129),/128/)});
test('disconnected semisimple algebras retain all component units',()=>{const q={vertices:[{id:'a',label:'a'},{id:'b',label:'b'}],arrows:[],relations:[]};const c=new Calculus(q);assert.deepEqual(c.report(2).rows.map(r=>r.hhCo),[2,0,0]);const rb=ribbon(c.A);assert.equal(rb.components,2);assert.equal(rb.genus,0);assert.deepEqual(rb.aag,[{pair:[2,0],multiplicity:2}])});
