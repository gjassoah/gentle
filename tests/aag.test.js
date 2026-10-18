// The AAG invariant against the values stated by Avella-Alaminos and Geiss, J. Pure Appl. Algebra 212 (2008)
// 228–243 [AG08]. AG08 writes paths right to left: its relation α₆α₅ is the pair [α₅, α₆] in travel order.
import test from 'node:test';import assert from 'node:assert/strict';
import {algebra,validate} from '../src/engine.js';import {ribbon} from '../src/structure.js';
const Q=(vs,arrows,rels)=>({name:'',vertices:vs.map(id=>({id,label:id,x:0,y:0})),arrows:arrows.map(([id,s,t])=>({id,label:id,source:s,target:t})),relations:rels});
const phi=q=>{assert.deepEqual(validate(q),[]);return ribbon(algebra(q)).aag.flatMap(a=>Array(a.multiplicity).fill(a.pair.join(','))).sort()};

test('AG08 Example 7, p. 233: φ = [(3,2), (2,4), (2,3)]',()=>{
 const q=Q(['a','b','c','d','e','f','g','h'],[['a1','a','e'],['a2','e','f'],['a3','f','g'],['a4','f','a'],['a5','a','b'],['a6','b','c'],['a7','c','h'],['a8','e','d'],['a9','g','h']],[['a5','a6'],['a1','a8'],['a4','a1'],['a2','a4']]);
 assert.deepEqual(phi(q),['2,3','2,4','3,2']);
});
test('AG08 Remark 18, pp. 242–243: both algebras have φ = [(3,5)]',()=>{
 assert.deepEqual(phi(Q(['1','2','3','4'],[['a','1','2'],['b','1','2'],['c','2','3'],['d','2','4'],['e','3','4']],[['a','c'],['b','d'],['c','e']])),['3,5']);
 assert.deepEqual(phi(Q(['1','2','3','4'],[['a','1','2'],['d1','2','4'],['d2','2','4'],['f','4','3'],['g','3','1']],[['g','a'],['a','d1'],['f','g'],['d2','f']])),['3,5']);
});
test('AG08 §7, p. 242: trees give [(n+1, n−1)] and Ã_{p,q} gives [(p,p), (q,q)]',()=>{
 for(const n of [1,2,4,6])assert.deepEqual(phi(Q(Array.from({length:n},(_,i)=>'v'+i),Array.from({length:n-1},(_,i)=>['a'+i,'v'+i,'v'+(i+1)]),[])),[`${n+1},${n-1}`]);
 for(const [p,q] of [[1,1],[2,1],[3,2]]){
  const as=[];for(let i=0;i<p;i++)as.push(['x'+i,'v'+i,'v'+(i+1)]);for(let j=0;j<q;j++)as.push(['y'+j,j===0?'v0':'w'+j,j===q-1?'v'+p:'w'+(j+1)]);
  const vs=[...Array.from({length:p+1},(_,i)=>'v'+i),...Array.from({length:q-1},(_,j)=>'w'+(j+1))];
  assert.deepEqual(phi(Q(vs,as,[])),[`${p},${p}`,`${q},${q}`].sort());
 }
});
