import {derivedInvariant} from '../src/derived.js';
import {examples} from '../src/examples.js';
import {Calculus} from '../src/engine.js';
import {addScaled} from '../src/linear.js';

function fromThreads(threads){
 const vertices=[...new Set(threads.flat())].map(id=>({id:String(id),label:String(id)})),arrows=[],allowed=new Set();
 for(const thread of threads){let last;for(let i=1;i<thread.length;i++){const id='a'+arrows.length;arrows.push({id,label:id,source:String(thread[i-1]),target:String(thread[i])});if(last)allowed.add(last+','+id);last=id}}
 return {vertices,arrows,relations:arrows.flatMap(a=>arrows.filter(b=>a.target===b.source&&!allowed.has(a.id+','+b.id)).map(b=>[a.id,b.id]))};
}

const aps=derivedInvariant(examples.aps1).components[0];
const arf=derivedInvariant(fromThreads([[0,1,2,3,4],[0,1,2,3,4]])).components[0];
const calculus=new Calculus(examples.dual),F=calculus.F,f=calculus.group('co',1).basis[0],g=calculus.group('co',2).basis[0];
const correctBracket=calculus.group('co',2).project(calculus.bracket(1,f,2,g)).map(F.str);
const wrongBracket=calculus.insertion(1,f,2,g);addScaled(wrongBracket,calculus.insertion(2,g,1,f),F.o,F);
const twoCycle={vertices:[{id:'v0',label:'0'},{id:'v1',label:'1'}],arrows:[{id:'a',label:'a',source:'v0',target:'v1'},{id:'b',label:'b',source:'v1',target:'v0'}],relations:[['a','b'],['b','a']]};
const capCalculus=new Calculus(twoCycle),capF=capCalculus.F,capCochain=capCalculus.group('co',1).basis[0],capChain=capCalculus.group('ho',2).basis[0];
const capWitness={n:2,signed:capCalculus.group('ho',1).project(capCalculus.cap(1,capCochain,2,capChain)).map(capF.str),unsigned:capCalculus.group('ho',1).project(capCalculus.contraction(1,capCochain,2,capChain)).map(capF.str)};
process.stdout.write(JSON.stringify({aps:{signature:aps.signature,boundaries:aps.boundaries},arf:{arf:arf.arf,curves:arf.curves,intersection:arf.intersection},bracket:{correct:correctBracket,wrong:calculus.group('co',2).project(wrongBracket).map(F.str)},cap:capWitness}));
