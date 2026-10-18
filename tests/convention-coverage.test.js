import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Calculus,validate} from '../src/engine.js';
import {examples} from '../src/examples.js';
import {createConvention,normalizeConvention,invariantFormulas,invariantMarkup,checkMarkup} from '../src/convention.js';
import {parse,format} from '../src/presentation.js';
import {structure,ribbon,ringPresentation,cohomologyFamilies,surfaceComponents,ribbonFromQuiver} from '../src/structure.js';
import {derivedInvariant} from '../src/derived.js';
import {latexReport,latexDerivedReport,jsonExport,texEscape} from '../src/export.js';
import * as mathml from '../src/mathml.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const json=value=>JSON.parse(JSON.stringify(value));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Compile the real renderer declarations, without running browser startup or inventing a second renderer.
function declaration(name){
 const lines=app.split('\n'),start=lines.findIndex(line=>new RegExp(`^(?:(?:async )?function ${name}\\(|const ${name}=)`).test(line));
 assert.ok(start>=0,`renderer ${name} exists`);
 for(let end=start;end<lines.length;end++){
  const candidate=lines.slice(start,end+1).join('\n');
  try{new vm.Script(candidate);return candidate}catch(error){if(!(error instanceof SyntaxError))throw error}
 }
 throw Error('Cannot extract renderer '+name);
}
const rendererNames=['terms','tableRows','validationMark','renderSetup','renderOverview','renderBasis','coefficientCard','renderOperationResult','renderOperations','renderStructure','renderHigherResult','renderHigher','renderAllDegrees','renderSurface','branchName','derivedCards','renderLieResult','renderLie'];
const source=rendererNames.map(declaration).join('\n');
function fixture(original){
 const q=structuredClone(original);
 q.arrows.forEach((a,i)=>{a.label=`TEST_ARROW_${i}_LABEL`});
 const c=new Calculus(q),r=c.report(3);r.structure=structure(c.A);r.structure.ribbon=ribbon(c.A);r.families=cohomologyFamilies(c.A,0);r.ring=ringPresentation(c.A,0);r.mode='checked';
 r.lie=c.lieStructure();r.additionalGroups=[{degree:2,kind:'co',dimension:c.group('co',2,'bardzell').basis.length,basis:c.describeBasis('co',2,'bardzell')}];
 const operations=[];
 for(const row of r.rows)for(const [kind,basis] of [['co',row.coBasis],['ho',row.hoBasis]])if(basis.length){
  const result={degree:row.degree,kind,coefficients:basis.map((_,i)=>i?'0':'1'),representative:basis[0]};
  operations.push({type:kind==='co'?'cup':'cap',p:0,q:row.degree,left:['1'],right:['1'],result,outputBasis:{kind,degree:row.degree,dimension:basis.length,basis}});
 }
 return {q,c,r,operations,derived:derivedInvariant(q)};
}
function harness(f,name,tainted=false){
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',value:'',insertAdjacentHTML(_position,html){this.innerHTML+=html},setAttribute(){},removeAttribute(){}});return nodes.get(s)};
 let serial=0;
 // A converted path receives an opaque token. Any TEST_ARROW left in rendered HTML therefore
 // came from an unconverted source. This catches correct-looking but centralized-API-bypassing code.
 const taint=value=>typeof value==='string'&&value.includes('TEST_ARROW_')?`DISPLAY_VALUE_${++serial}`:Array.isArray(value)?value.map(taint):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,taint(v)])):value;
 const converted=createConvention(f.q,name,'0'),display=()=>!tainted?converted:new Proxy(converted,{get(target,key){const value=target[key];return typeof value==='function'?function(...args){return taint(value.apply(target,args))}:taint(value)}});
 const context=vm.createContext({...mathml,invariantFormulas,invariantMarkup,checkMarkup,cardInterface:{refresh(){}},validate,report:f.r,q:f.q,characteristic:'0',convention:name,operations:f.operations,op:{type:'cap',p:0,q:2},selectedDegree:0,tab:'cohomology',dirty:false,busy:false,undo:[],redo:[],derived:f.derived,display,esc,$:get,$$:()=>[],surfaceComponents,ribbonFromQuiver,currentSurface:()=>({ribbon:f.r.structure.ribbon,types:surfaceComponents(f.q)}),surfaceFigures:()=>'',mountSurfaceFigures(){},syncPresentation(){},selectView(){},runOperation(){},toast(){},setBusy(){},call(){throw Error('A display must not recompute')}});
 vm.runInContext(source,context);
 return {context,run(command){get('#result-output').innerHTML='';const result=vm.runInContext(command,context);return typeof result==='string'?result:get('#result-output').innerHTML},get};
}

test('every path-bearing interface renderer consumes conversion output in both settings',()=>{
 for(const original of Object.values(examples))for(const choice of ['left','right']){
  const f=fixture(original),h=harness(f,choice,true);
  const panels=['renderOverview()','renderStructure()','renderAllDegrees()','renderSurface()','renderHigher()','renderOperations()','renderLie()','derivedCards(derived)'];
  for(const kind of ['cohomology','homology','cyclic'])for(let degree=0;degree<=3;degree++)panels.push(`tab=${JSON.stringify(kind)};selectedDegree=${degree};renderBasis()`);
  for(const panel of panels){
   const html=h.run(panel);
   assert.ok(html.length,`${original.name}, ${choice}, ${panel} renders`);
   assert.ok(!html.includes('TEST_ARROW_'),`${original.name}, ${choice}, ${panel} bypasses the central path conversion`);
  }
  h.run('renderSetup()');
  assert.ok(!h.get('#relations').innerHTML.includes('TEST_ARROW_'),'relation products use conversion');
  // The renderer must still present real path labels outside the taint run.
  if(f.q.arrows.length)assert.match(harness(f,choice).run('renderStructure()'),/TEST_ARROW_/);
 }
});

test('surface paths, cyclic orders and edge walks render exactly the selected converted sequences',()=>{
 for(const original of [examples.aps1,examples.aps2,examples.triangle,examples.a3])for(const choice of ['left','right']){
  const f=fixture(original),h=harness(f,choice),conversion=createConvention(f.q,choice),rb=conversion.ribbon(f.r.structure.ribbon),d=conversion.derived(f.derived);
  const html=h.run('renderSurface()');
  for(const t of rb.threads)assert.ok(html.includes(`<td>${mathml.pathMath(t.pathDisplay)}</td><td>${mathml.labelSequence(t.visits)}</td>`));
  for(const b of rb.boundaries)assert.ok(html.includes(`<td>${mathml.labelSequence(b.edgeWalk)}</td>`));
  const derived=h.run('derivedCards(derived)');
  for(const c of d.components)for(const curve of c.curves)assert.ok(derived.includes(`<td>${mathml.edgeWalk(curve.walk)}</td>`));
 }
});

test('coverage rejects a renderer that reads paths directly from the stored report',()=>{
 const h=harness(fixture(examples.a3),'left',true);
 assert.doesNotMatch(h.run('renderStructure()'),/TEST_ARROW_/);
 const bypass=declaration('renderStructure').replace('display().report(report)','report');
 assert.notEqual(bypass,declaration('renderStructure'));
 assert.throws(()=>h.run(bypass+'\nrenderStructure()'),/Cannot read properties of undefined/,'raw reports lack the converted path records required by the renderer');
});

test('the real setting handler persists only the preference and rerenders without computation or history changes',()=>{
 const f=fixture(examples.triangle),h=harness(f,'left'),c=h.context,stored=[],announcements=[];
 const forbidden=()=>{throw Error('Convention switch attempted to compute, save or alter history')};
 Object.assign(c,{normalizeConvention,parse,format,textEditing:false,CONVENTION_KEY:'gentle-convention',syncResultTabs(){},localStorage:{setItem:(...args)=>stored.push(args)},toast:message=>announcements.push(message),checkpoint:forbidden,invalidate:forbidden,save:forbidden,worker:{postMessage:forbidden},tab:'structure'});
 c.display=()=>createConvention(f.q,c.convention,'0');c.undo.push({quiver:structuredClone(f.q)});
 const before=JSON.stringify({q:c.q,report:c.report,operations:c.operations,undo:c.undo,redo:c.redo});
 const handler=app.match(/\$\('#convention'\)\.onchange=\(\)=>\{[\s\S]*?^\};/m)?.[0];
 assert.ok(handler,'the setting handler exists');vm.runInContext(declaration('renderResults')+'\n'+handler,c);
 for(const choice of ['right','left']){
  h.get('#convention').value=choice;h.get('#convention').onchange();
  assert.equal(c.convention,choice);assert.deepEqual(stored.at(-1),['gentle-convention',choice]);
  assert.equal(JSON.stringify({q:c.q,report:c.report,operations:c.operations,undo:c.undo,redo:c.redo}),before);
  assert.match(announcements.at(-1),choice==='left'?/left modules/:/right modules/);
 }
 // An open valid draft is rewritten, while an invalid draft retains its old interpretation.
 c.textEditing=true;h.get('#presentation').value=format(f.q,'left');h.get('#convention').value='right';h.get('#convention').onchange();
 assert.match(h.get('#presentation').value,/^convention: right\n/);
 const normalized=parse(h.get('#presentation').value,'left').quiver;
 const relationLabels=q=>q.relations.map(r=>r.map(id=>q.arrows.find(a=>a.id===id).label));
 assert.deepEqual(relationLabels(normalized),relationLabels(f.q));
 h.get('#presentation').value='unknown broken statement';h.get('#convention').value='left';h.get('#convention').onchange();
 assert.equal(h.get('#presentation').value,'convention: right\nunknown broken statement');
 assert.match(h.get('#presentation-errors').textContent,/^Line 2: Malformed line\./);
 h.get('#convention').value='right';h.get('#convention').onchange();
 assert.equal(h.get('#presentation').value,'convention: right\nunknown broken statement');
 assert.match(h.get('#presentation-errors').textContent,/^Line 2: Malformed line\./);
 assert.equal(JSON.stringify({q:c.q,report:c.report,operations:c.operations,undo:c.undo,redo:c.redo}),before);
});

test('reports and JSON cover all rendered path, family, ring and representative fields',()=>{
 for(const original of Object.values(examples))for(const choice of ['left','right']){
  const f=fixture(original),snapshot=structuredClone({q:f.q,r:f.r,operations:f.operations,derived:f.derived}),conversion=createConvention(f.q,choice),shown=conversion.report(f.r);
  const latex=latexReport(f.q,{...f.r,derived:f.derived},f.operations,null,choice);
  for(const path of shown.paths)assert.ok(latex.includes(texEscape(path)),`${choice}: exported path ${path}`);
  for(const s of [...shown.structure.permitted,...shown.structure.forbidden,...shown.structure.cycles.map(c=>c.label),...shown.families.flatMap(f=>[f.name,f.description]),...shown.ring.flatMap(r=>[r.description,...r.generators.map(g=>g.name),...r.allowedProducts,...r.equalities])])assert.ok(latex.includes(texEscape(s)),`${choice}: exported structure ${s}`);
  for(const row of shown.rows)for(const basis of [row.coBasis,row.hoBasis,row.cyBasis])for(const terms of basis)for(const term of terms)assert.ok(latex.includes(`$${term.coefficient.includes('/')?`\\frac{${term.coefficient.split('/').join('}{')}}`:term.coefficient}$\\quad ${texEscape(term.term)}`),`${choice}: exported representative ${term.term}`);
  const data={format:'gentle-results-v1',quiver:f.q,report:f.r,operations:f.operations,derived:f.derived},parsed=JSON.parse(jsonExport(data,null,choice));
  assert.deepEqual(parsed.quiver,json(f.q));assert.deepEqual(parsed.report,json(f.r));assert.deepEqual(parsed.operations,json(f.operations));assert.deepEqual(parsed.derived,json(f.derived));assert.equal(parsed.convention,choice);
  assert.deepEqual(parsed.displayed.report,json(shown));
  assert.deepEqual(parsed.displayed.operations,json(f.operations.map(o=>conversion.operation(o))));
  assert.deepEqual(parsed.displayed.derived,json(conversion.derived(f.derived)));
  const derivedLatex=latexDerivedReport(f.q,f.derived,null,null,choice);
  for(const c of conversion.derived(f.derived).components)for(const curve of c.curves)assert.ok(derivedLatex.includes(curve.walk.map(e=>`${texEscape(e.edge)} (${e.from} to ${e.to})`).join(', ')));
  assert.deepEqual(f.q,snapshot.q);assert.deepEqual(f.r,snapshot.r);assert.deepEqual(f.operations,snapshot.operations);assert.deepEqual(f.derived,snapshot.derived);
 }
});

test('dynamic mathematical renderers use MathML for all convention-dependent formulas and labels',()=>{
 for(const choice of ['left','right']){
  const f=fixture(examples.triangle),h=harness(f,choice),d=createConvention(f.q,choice);
  const structureHTML=h.run('renderStructure()');
  for(const p of d.report(f.r).pathDisplays)assert.ok(structureHTML.includes(mathml.pathMath(p)));
  const formulas=h.run('renderAllDegrees()');
  for(const family of d.families(f.r.families))assert.ok(formulas.includes(mathml.familyName(family)));
  for(const type of ['cup','bracket','cap','connes','lie']){
   const html=h.run(`op.type=${JSON.stringify(type)};renderOperations()`);
   assert.ok(html.includes(mathml.mathProse(d.formulaMarkup[type])));
   assert.doesNotMatch(html.replace(/<[^>]+>/g,''),/\^\(|\^\{|_\{|\^/);
  }
  const representative=h.run('terms(report.rows.find(row=>row.degree>0&&row.coBasis.length).coBasis[0])');
  assert.match(representative,/<math /);
  assert.match(representative,/class="cochain-input"/);
 }
});

test('quiver graphical labels use escaped native MathML without changing hit targets',()=>{
 const context=vm.createContext({...mathml});vm.runInContext(declaration('diagramLabel'),context);
 const html=vm.runInContext(`diagramLabel('<script>&_label',100,80,2)`,context);
 assert.match(html,/<foreignObject /);assert.match(html,/<math /);
 assert.match(html,/<mi>&lt;script&gt;&amp;_label<\/mi>/);assert.doesNotMatch(html,/<script>/);
 const drawing=declaration('draw');assert.match(drawing,/diagramLabel\(a.label,g.x,g.y,scale\)/);assert.match(drawing,/diagramLabel\(v.label,0,0,scale\)/);
 assert.match(drawing,/class="edge-hit"/);assert.match(drawing,/tabindex="0" role="button" aria-label="Vertex/);
});
