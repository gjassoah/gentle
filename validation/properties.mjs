#!/usr/bin/env node
import {Calculus,validate} from '../src/engine.js';
import {structure,ribbon,cohomologyFamilies,familyDimension,homologyFormula,ringPresentation} from '../src/structure.js';
import {derivedInvariant} from '../src/derived.js';

function argumentsOf(argv){const out={level:process.env.VALIDATION_LEVEL||'quick',json:false};for(let i=0;i<argv.length;i++){if(argv[i]==='--level')out.level=argv[++i];else if(argv[i]==='--count')out.count=Number(argv[++i]);else if(argv[i]==='--seed')out.seed=Number(argv[++i]);else if(argv[i]==='--json')out.json=true;else throw Error('Unknown argument '+argv[i])}return out}
const options=argumentsOf(process.argv.slice(2));
const count=options.count??(options.level==='extended'?300:100),initialSeed=options.seed??0x5eed1234;
if(!Number.isInteger(count)||count<1||count>500)throw Error('Property count must be between 1 and 500.');
let state=initialSeed>>>0;const random=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n};
const shuffle=items=>{const out=items.slice();for(let i=out.length-1;i>0;i--){const j=random(i+1);[out[i],out[j]]=[out[j],out[i]]}return out};

function fromThreads(threads){
 const vertices=[...new Set(threads.flat())].map(id=>({id:'v'+id,label:String(id)})),arrows=[],allowed=new Set();
 for(const thread of threads){let last=null;for(let i=1;i<thread.length;i++){const id='a'+arrows.length;arrows.push({id,label:id,source:'v'+thread[i-1],target:'v'+thread[i]});if(last!==null)allowed.add(last+','+id);last=id}}
 return {vertices,arrows,relations:arrows.flatMap(a=>arrows.filter(b=>a.target===b.source&&!allowed.has(a.id+','+b.id)).map(b=>[a.id,b.id]))};
}

function generatedPresentation(){
 const edgeCount=2+random(4),half=Array.from({length:edgeCount},(_,i)=>[i,i]).flat();
 for(let i=half.length-1;i>0;i--){const j=random(i+1);[half[i],half[j]]=[half[j],half[i]]}
 const threads=[[]];for(const h of half){if(threads.at(-1).length&&random(4)===0)threads.push([]);threads.at(-1).push(h)}
 return fromThreads(threads);
}

function canonicalAag(value){return value.map(x=>({pair:x.pair,multiplicity:x.multiplicity})).sort((a,b)=>a.pair[0]-b.pair[0]||a.pair[1]-b.pair[1]||a.multiplicity-b.multiplicity)}
function signature(q,characteristic){
 const c=new Calculus(q,characteristic),report=c.report(2),s=structure(c.A),r=ribbon(c.A),families=cohomologyFamilies(c.A,characteristic);
 const formula=[];for(let degree=0;degree<=3;degree++){const h=homologyFormula(c.A,characteristic,degree);formula.push([familyDimension(families,degree),h.hh,h.hc])}
 // Ring relation strings use a spanning-forest-dependent derivation basis, so
 // compare only basis-independent component and generator-degree data here.
 const ring=ringPresentation(c.A,characteristic).map(component=>[component.exceptional,component.generators.map(g=>[g.type||'exceptional',g.degree]).sort()]).sort();
 const lie=c.lieStructure();
 return JSON.stringify({
  algebraDimension:c.A.paths.length,
  report:report.rows.map(row=>[row.hhCo,row.hhHo,row.hc]),
  formula,
  structure:[s.components,s.euler,s.cycleRank,s.globalDimension,s.cycles.map(x=>x.length).sort((a,b)=>a-b)],
  ribbon:[r.genus,r.components,canonicalAag(r.aag)],
  ring,
  lie:[lie.dimension,lie.centerDimension,lie.derived,lie.solvable],
  derived:derivedInvariant(q).signature
 });
}

function rename(q){
 const vertexOrder=shuffle(q.vertices),arrowOrder=shuffle(q.arrows),vertexMap=new Map(vertexOrder.map((v,i)=>[v.id,'vertex-'+i])),arrowMap=new Map(arrowOrder.map((a,i)=>[a.id,'arrow-'+i]));
 return {vertices:vertexOrder.map((v,i)=>({...v,id:vertexMap.get(v.id),label:'V '+i})),arrows:arrowOrder.map((a,i)=>({...a,id:arrowMap.get(a.id),label:'A '+i,source:vertexMap.get(a.source),target:vertexMap.get(a.target)})),relations:shuffle(q.relations).map(([a,b])=>[arrowMap.get(a),arrowMap.get(b)])};
}
const variants=q=>[
 rename(q),
 {...q,arrows:q.arrows.slice().reverse()},
 {...q,relations:q.relations.slice().reverse()},
 {...q,vertices:q.vertices.slice().reverse()},
 JSON.parse(JSON.stringify(q))
];

const started=performance.now(),characteristics=[0,2,3,5],failures=[];let checks=0;
for(let sample=0;sample<count;sample++){
 const q=generatedPresentation(),characteristic=characteristics[random(characteristics.length)];
 try{
  const errors=validate(q);if(errors.length)throw Error('generator produced invalid presentation: '+errors.join(' '));
  const expected=signature(q,characteristic);
  for(const [variantIndex,variant] of variants(q).entries()){
   checks++;
   const actual=signature(variant,characteristic);
   if(actual!==expected){const error=Error(`metamorphic mismatch in variant ${variantIndex}`);error.variant=variant;error.expected=JSON.parse(expected);error.actual=JSON.parse(actual);throw error}
  }
 }catch(error){failures.push({initial_seed:initialSeed,sample,state,characteristic,error:error.message,presentation:q,...(error.variant?{transformed_presentation:error.variant,expected:error.expected,actual:error.actual}:{})});break}
}
const result={suite:'metamorphic/property',level:options.level,seed:initialSeed,generated_examples:count,transformations_per_example:5,metamorphic_comparisons:checks,characteristics,materialized_degrees:[0,2],formula_degrees:[0,3],properties:['vertex relabelling','arrow relabelling','arrow input order','relation input order','serialization round-trip','connected-component/vertex order','HH/HC and formula dimensions','ribbon/AAG and APS signatures','ring generator degrees','HH1 Lie invariants','d^2 = 0','b^2 = 0','B^2 = 0','bB + Bb = 0','cyclic differential square-zero'],failures,runtime_seconds:Number(((performance.now()-started)/1000).toFixed(3))};
process.stdout.write(JSON.stringify(result,null,options.json?0:2)+'\n');
if(failures.length)process.exitCode=1;
