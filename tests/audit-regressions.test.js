// Regressions for the findings of the independent audit against CSSS26.
import test from 'node:test';import assert from 'node:assert/strict';
import {Calculus,algebra} from '../src/engine.js';
import {structure,cohomologyFamilies,ringPresentation} from '../src/structure.js';
const messages=[];globalThis.self={postMessage:x=>messages.push(x)};await import('../src/worker.js');
function call(data){messages.length=0;self.onmessage({data:{id:1,...data}});return messages.at(-1)}
const field={name:'k',vertices:[{id:'v',label:'v',x:0,y:0}],arrows:[],relations:[]};

test('A1: a group request returns the dimension and the basis of the same group',()=>{
 assert.ok(!call({type:'init',quiver:field,characteristic:0}).error);
 // HC_2(k) = k by CSSS26 Theorem 4.14 and Proposition 4.12, while HH_2(k) = 0.
 const hc=call({type:'group',kind:'cyclic',degree:2});assert.ok(!hc.error,hc.error);assert.equal(hc.result.dimension,1);assert.equal(hc.result.basis.length,1);
 const hh=call({type:'group',kind:'ho',degree:2});assert.equal(hh.result.dimension,0);assert.equal(hh.result.basis.length,0);
 assert.match(call({type:'group',kind:'not-a-group',degree:1}).error,/Unknown group kind/);
 assert.match(call({type:'group',kind:'cyclic',degree:1,model:'bardzell'}).error,/bar model only/);
 assert.match(call({type:'group',kind:'co',degree:1,model:'koszul'}).error,/Unknown resolution/);
});

test('A1: an unknown operation is rejected instead of computing another one',()=>{
 const dual={name:'dual',vertices:[{id:'v',label:'1',x:0,y:0}],arrows:[{id:'e',label:'ε',source:'v',target:'v'}],relations:[['e','e']]};
 const c=new Calculus(dual,0);assert.throws(()=>c.operation('cupp',0,['0','1'],1,['1']),/Unknown operation "cupp"/);
 assert.throws(()=>c.group('cyclic',1),/Unknown group kind/);
});

test('A2: ring and family names identify their paths even when labels contain separators',()=>{
 // Two independent maximal closed permitted paths whose labels both join to z·x·y.
 const V=['v','w','x'].map(id=>({id,label:id,x:0,y:0})),labels=['x·y','z','y','z·x'],ends=[['v','w'],['w','v'],['v','x'],['x','v']];
 const q={name:'collision',vertices:V,arrows:ends.map(([s,t],i)=>({id:'a'+i,label:labels[i],source:s,target:t})),relations:[['a0','a1'],['a1','a2'],['a2','a3'],['a3','a0']]};
 assert.equal(new Calculus(q,0).group('co',0).basis.length,3);
 const central=cohomologyFamilies(algebra(q),0).filter(f=>f.type==='II').map(f=>f.name);
 assert.equal(central.length,2);assert.equal(new Set(central).size,2);
 assert.deepEqual(central.sort(),['c(path("z", "x·y"))','c(path("z·x", "y"))']);
 const names=ringPresentation(algebra(q),0).flatMap(c=>c.generators.map(g=>g.name));assert.equal(new Set(names).size,names.length);
});

test('A3: an isolated vertex is a maximal permitted and a maximal forbidden path',()=>{
 const s=structure(algebra(field));assert.deepEqual(s.permitted,['e(v)']);assert.deepEqual(s.forbidden,['e(v)']);assert.equal(s.globalDimension,0);
 const a2={name:'A2 and a point',vertices:['1','2','3'].map(id=>({id,label:id,x:0,y:0})),arrows:[{id:'a',label:'a',source:'1',target:'2'}],relations:[]};
 const t=structure(algebra(a2));assert.deepEqual(t.permitted,['a','e(3)']);assert.deepEqual(t.forbidden,['a','e(3)']);
});
