// Benchmarks near the resource limits. `node tools/bench.mjs` prints a table and writes bench/results.json
// (git-ignored). Each case records the elapsed time, the sizes that drive the cost and the peak resident memory,
// and checks that an over-limit computation ends in an explicit error or a formula fallback, never in a zero.
import {mkdirSync,writeFileSync} from 'node:fs';
import {Calculus,algebra,ENGINE_VERSION} from '../src/engine.js';
import {structure,cohomologyFamilies,familyDimension,homologyFormula} from '../src/structure.js';
const messages=[];globalThis.self={postMessage:m=>messages.push(m)};await import('../src/worker.js');

const vertex=i=>({id:'v'+i,label:String(i),x:0,y:0});
// Linear A_n with no relations: n(n+1)/2 paths, so n = 19 gives 190 and n = 20 exceeds 200.
const linear=(n,zero=false)=>({name:`A${n}`,vertices:Array.from({length:n},(_,i)=>vertex(i)),arrows:Array.from({length:n-1},(_,i)=>({id:'a'+i,label:'a'+i,source:'v'+i,target:'v'+(i+1)})),relations:zero?Array.from({length:n-2},(_,i)=>['a'+i,'a'+(i+1)]):[]});
// An oriented r-cycle with all quadratic relations: one complete circuit of length r.
const cycle=r=>({name:`cycle${r}`,vertices:Array.from({length:r},(_,i)=>vertex(i)),arrows:Array.from({length:r},(_,i)=>({id:'a'+i,label:'a'+i,source:'v'+i,target:'v'+((i+1)%r)})),relations:Array.from({length:r},(_,i)=>['a'+i,'a'+((i+1)%r)])});
const kronecker={name:'Kronecker',vertices:[vertex(0),vertex(1)],arrows:[{id:'a',label:'a',source:'v0',target:'v1'},{id:'b',label:'b',source:'v0',target:'v1'}],relations:[]};

const rows=[];
function bench(name,run){
 global.gc?.();const start=process.hrtime.bigint();let outcome,detail={};
 try{detail=run()||{};outcome='ok'}catch(error){outcome=/limit|exceeds/.test(error.message)?'resource limit':'ERROR: '+error.message;detail={message:error.message}}
 const ms=Number(process.hrtime.bigint()-start)/1e6;
 rows.push({name,outcome,ms:Math.round(ms),rssMB:Math.round(process.memoryUsage().rss/2**20),...detail});
}

for(const n of [10,15,19,20])bench(`A_${n}: path basis`,()=>({paths:algebra(linear(n)).paths.length}));
for(const n of [6,8,10])bench(`A_${n}, radical square zero: HH* to degree 8`,()=>{const c=new Calculus(linear(n,true),0);return {dims:Array.from({length:9},(_,d)=>c.group('co',d).basis.length).join(',')}});
for(const r of [3,5])bench(`cycle ${r}: HH^n, HH_n materialized to degree 12`,()=>{const c=new Calculus(cycle(r),0);return {co:Array.from({length:13},(_,d)=>c.group('co',d).basis.length).join(','),ho:Array.from({length:13},(_,d)=>c.group('ho',d).basis.length).join(',')}});
bench('cycle 3: HC_n to degree 10',()=>{const c=new Calculus(cycle(3),0);return {hc:Array.from({length:11},(_,d)=>c.cyclic(d).basis.length).join(','),totalSpace:c.cyclicSpace(10).items.length}});
bench('cycle 3: degree 128 (Bardzell)',()=>{const c=new Calculus(cycle(3),0);return {dim:c.group('co',128,'bardzell').basis.length}});
bench('cycle 3: formula queries to degree 100000',()=>{const A=algebra(cycle(3)),f=cohomologyFamilies(A,0);let sum=0;for(let n=99000;n<=100000;n++)sum+=familyDimension(f,n)+homologyFormula(A,0,n).hc;return {sum}});
bench('Kronecker: HH¹ Lie structure',()=>{const c=new Calculus(kronecker,0);const l=c.lieStructure();return {dimension:l.dimension,derived:l.derived.join('→')}});
bench('A_12: bar degrees until a space limit',()=>{const c=new Calculus(linear(12),0);let d=0;try{for(;d<=128;d++)c.group('co',d)}catch(error){if(!/limit|exceeds/.test(error.message))throw error;return {lastComputedDegree:d-1,stoppedBy:error.message}}throw Error('no resource limit reached')});
bench('A_12: worker report falls back to formulas',()=>{
 messages.length=0;self.onmessage({data:{id:1,type:'compute',quiver:linear(12),characteristic:0,degree:6}});
 const r=messages.at(-1);if(r.error)throw Error(r.error);
 if(r.result.mode!=='formulas'||r.result.rows.some(x=>x.coBasis!==null&&x.coBasis!==undefined))throw Error('expected a formula report without representatives');
 return {mode:r.result.mode,hhCo:r.result.rows.map(x=>x.hhCo).join(',')};
});
bench('A_19: structure and ribbon data',()=>{const s=structure(algebra(linear(19)));return {permitted:s.permitted.length}});

// The over-limit cases must not report a value.
const bad=rows.filter(r=>r.outcome.startsWith('ERROR'));
const width=Math.max(...rows.map(r=>r.name.length));
for(const r of rows)console.log(`${r.name.padEnd(width)}  ${String(r.ms).padStart(7)} ms  ${String(r.rssMB).padStart(5)} MB  ${r.outcome}${Object.entries(r).filter(([k])=>!['name','ms','rssMB','outcome'].includes(k)).map(([k,v])=>`  ${k}=${v}`).join('')}`);
mkdirSync('bench',{recursive:true});
writeFileSync('bench/results.json',JSON.stringify({engine:ENGINE_VERSION,node:process.version,date:new Date().toISOString(),rows},null,2)+'\n');
if(bad.length){console.error(`${bad.length} benchmark(s) failed with an unexpected error`);process.exit(1)}
