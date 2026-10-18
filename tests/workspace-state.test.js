import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the application's state transitions with DOM/rendering stubs. This tests
// the handlers wired by app.js without introducing a browser-only test dependency.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const names=['hasTabSpace','addAlgebra','reopenAlgebra','snapshot','checkpoint','invalidate','computationPresentation','restore','history','currentComparison'];
const functions=names.map(name=>{const line=source.split('\n').find(line=>line.startsWith(`function ${name}(`));assert.ok(line,`App function ${name} exists`);return line}).join('\n');
const degreeHandler=source.split('\n').find(line=>line.startsWith("$('#max-degree').onchange="));
assert.ok(degreeHandler);
const quiver=()=>({name:'A',vertices:[{id:'v',label:'1',x:120,y:140}],arrows:[{id:'a',label:'α',source:'v',target:'v'}],relations:[['a','a']]});
function workspace(){
 const nodes={'#progress':{textContent:'Complete'},'#max-degree':{value:'3'}};
 const state={q:quiver(),characteristic:'0',degree:3,report:{id:'calculus'},dirty:false,derived:{id:'derived'},comparison:null,surfaceData:{id:'surface'},operations:[{type:'cup'}],worker:{id:'worker'},undo:[],redo:[],selected:{id:'v'},pending:{id:'a'},activeId:'active',switching:false,algebras:[{id:'active'}],closedAlgebras:[],messages:[],stops:0,renders:0,saves:0,draws:0,setups:0,switches:[],clone:structuredClone,$:s=>nodes[s],nodes};
 state.toast=message=>state.messages.push(message);
 state.stopWorker=()=>{state.stops++;state.worker=null};
 state.renderResults=()=>state.renders++;
 state.save=()=>state.saves++;
 state.draw=()=>state.draws++;
 state.renderSetup=()=>state.setups++;
 state.syncSettings=()=>{};
 state.capture=()=>{};
 state.blankState=(q,characteristic,degree)=>({id:'new',q,characteristic,degree});
 state.switchAlgebra=id=>state.switches.push(id);
 state.comparison={left:{id:'active',quiver:structuredClone(state.q),characteristic:'0'},right:{id:'other',quiver:structuredClone(state.q),characteristic:'0'},result:{equivalent:true}};
 state.algebras.push({id:'other',q:structuredClone(state.q),characteristic:'0'});
 vm.createContext(state);vm.runInContext(functions+'\n'+degreeHandler,state);
 return state;
}
function refs(s){return {report:s.report,derived:s.derived,comparison:s.comparison,surface:s.surfaceData,worker:s.worker,operations:s.operations}}
function run(s,code){return vm.runInContext(code,s)}

test('reopen and New tab share the 40-tab limit, message, and capacity boundary',()=>{
 const s=workspace();s.algebras=Array.from({length:40},(_,i)=>({id:String(i)}));const closed={id:'closed',q:quiver()};s.closedAlgebras=[closed];
 run(s,'reopenAlgebra()');assert.equal(s.algebras.length,40);assert.equal(s.closedAlgebras[0],closed);assert.equal(s.switches.length,0);
 run(s,'addAlgebra()');assert.equal(s.messages.length,2);assert.equal(s.messages[0],s.messages[1]);assert.match(s.messages[0],/40 algebra tabs/);
 s.algebras.pop();run(s,'reopenAlgebra()');assert.equal(s.algebras.length,40);assert.equal(s.algebras.at(-1),closed);assert.equal(s.closedAlgebras.length,0);assert.deepEqual(s.switches,['closed']);
 const fresh=workspace();fresh.algebras=Array.from({length:39},(_,i)=>({id:String(i)}));run(fresh,'addAlgebra()');assert.equal(fresh.algebras.length,40);assert.deepEqual(fresh.switches,['new']);
});

test('degree-only change and its undo/redo retain derived invariant and valid comparison',()=>{
 const s=workspace(),before=refs(s);s.nodes['#max-degree'].value='6';s.nodes['#max-degree'].onchange();
 for(const [expected,action] of [[6,null],[3,'history()'],[6,'history(false)']]){
  if(action)run(s,action);
  assert.equal(s.degree,expected);assert.equal(s.dirty,true);assert.equal(s.derived,before.derived);assert.equal(s.comparison,before.comparison);assert.equal(run(s,'currentComparison()'),before.comparison);assert.equal(s.surfaceData,before.surface);assert.equal(s.report,before.report);assert.equal(s.operations.length,0);
 }
 assert.equal(s.stops,1);
});

test('reselecting the same degree leaves a current report and history current',()=>{
 const s=workspace(),before=refs(s);s.nodes['#max-degree'].onchange();assert.equal(s.dirty,false);assert.equal(s.operations,before.operations);assert.equal(s.undo.length,0);assert.equal(s.stops,0);
});

for(const [label,edit] of [['name',s=>{s.q.name='Renamed'}],['vertex positions',s=>{s.q.vertices[0].x=400;s.q.vertices[0].y=300}]])test(`undo/redo of ${label} retains calculus, operation history and worker`,()=>{
 const s=workspace(),before=refs(s);run(s,'checkpoint()');edit(s);
 for(const action of ['history()','history(false)']){run(s,action);assert.equal(s.dirty,false);assert.equal(s.report,before.report);assert.equal(s.worker,before.worker);assert.equal(s.operations,before.operations);assert.equal(s.derived,before.derived);assert.equal(s.comparison,before.comparison)}
 assert.equal(s.stops,0);assert.equal(s.renders,2);assert.equal(s.draws,2);assert.equal(s.setups,2);
});

for(const [label,edit] of [['vertex label',s=>{s.q.vertices[0].label='changed'}],['arrow label',s=>{s.q.arrows[0].label='β'}],['arrow endpoint',s=>{s.q.arrows[0].target='other'}],['relation',s=>{s.q.relations=[]}],['field',s=>{s.characteristic='2'}]])test(`undo of a changed ${label} invalidates dependent results`,()=>{
 const s=workspace();run(s,'checkpoint()');edit(s);run(s,'history()');assert.equal(s.dirty,true);assert.equal(s.derived,null);assert.equal(s.comparison,null);assert.equal(s.surfaceData,null);assert.equal(s.worker,null);assert.equal(s.operations.length,0);
});

test('input ordering remains part of the calculus presentation identity',()=>{
 const s=workspace();s.q.vertices.push({id:'w',label:'2',x:240,y:140});run(s,'checkpoint()');s.q.vertices.reverse();run(s,'history()');assert.equal(s.dirty,true);assert.equal(s.derived,null);
});
