// Run against the disposable Chromium profile used by tools/verify.sh.
// This test is syntax-checked, rather than launched, in restricted sandboxes.
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {examples} from '../src/examples.js';
import {texEscape} from '../src/export.js';
import {parse} from '../src/presentation.js';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.onopen=resolve);
let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id){const p=pending.get(x.id);pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result)}else if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails.exception?.description||x.params.exceptionDetails.text)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Timed out: '+expression)};
const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
const change=(s,value)=>evaluate(`document.querySelector(${JSON.stringify(s)}).value=${JSON.stringify(value)};document.querySelector(${JSON.stringify(s)}).dispatchEvent(new Event('change'))`);
const session=()=>evaluate(`JSON.parse(localStorage.getItem('gentle-session-v2'))`);
const current=async()=>{const s=await session();return s.algebras.find(a=>a.id===s.activeId)};
const downloads='/tmp/gentle-convention-'+Date.now();mkdirSync(downloads,{recursive:true});
await send('Runtime.enable');await send('Page.enable');await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
await send('Page.navigate',{url:process.env.CONVENTION_TEST_URL||'http://127.0.0.1:5173/'});await waitFor(`!!document.querySelector('#convention')`);
const initial={format:'gentle-session-v2',activeId:'triangle',algebras:[['triangle',examples.triangle],['dual',examples.dual]].map(([id,quiver])=>({id,quiver,characteristic:'0',degree:3}))};
await evaluate(`localStorage.removeItem('gentle-convention');localStorage.removeItem('gentle-workspace-v1');localStorage.setItem('gentle-session-v2',${JSON.stringify(JSON.stringify(initial))})`);
await send('Page.reload');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
assert.equal(await evaluate(`document.querySelector('#convention').value`),'left');
assert.match(await evaluate(`document.querySelector('#relations').textContent`),/β·α\s*=\s*0/);
await click('#edit-text');const leftText=await evaluate(`document.querySelector('#presentation').value`);
assert.match(leftText,/^convention: left\n/);assert.match(leftText,/β\s+α\s*=\s*0/);await click('#cancel-text');

// A name edit supplies a real undo checkpoint. Display switches may not add or remove it.
await change('#name','Convention checkpoint');
const storedBefore=await session(),historyBefore=await evaluate(`[document.querySelector('#undo').disabled,document.querySelector('#redo').disabled]`);
await evaluate(`window.conventionPosts=[];window.originalWorkerPostMessage=Worker.prototype.postMessage;Worker.prototype.postMessage=function(message,...rest){window.conventionPosts.push(message.type);return window.originalWorkerPostMessage.call(this,message,...rest)}`);
await change('#convention','right');
assert.match(await evaluate(`document.querySelector('#relations').textContent`),/α·β\s*=\s*0/);
await click('#edit-text');const rightText=await evaluate(`document.querySelector('#presentation').value`);
assert.match(rightText,/^convention: right\n/);assert.match(rightText,/α\s+β\s*=\s*0/);await click('#cancel-text');
await change('#convention','left');
assert.deepEqual(await session(),storedBefore);
assert.deepEqual(await evaluate(`[document.querySelector('#undo').disabled,document.querySelector('#redo').disabled]`),historyBefore);
assert.deepEqual(await evaluate('window.conventionPosts'),[],'changing convention must never send a worker request');
assert.match(await evaluate(`document.querySelector('#toast').textContent`),/left modules|right to left/i);
assert.equal(await evaluate(`document.querySelector('#toast').getAttribute('aria-live')`),'polite');

// The standalone report must state the selected convention and reverse the relation products.
for(const [choice,relation,description] of [['left','β·α',/left modules|right.to.left/i],['right','α·β',/right modules|left.to.right/i]]){
 await change('#convention',choice);await click('#export');await click('#export-tex');
 const file=downloads+'/gentle-calculus.tex';
 for(let i=0;i<100&&!existsSync(file);i++)await new Promise(resolve=>setTimeout(resolve,100));
 assert.ok(existsSync(file));const latex=readFileSync(file,'utf8');
 assert.match(latex,description);assert.ok(latex.split('\n').find(line=>line.includes('Zero relations:'))?.includes(texEscape(relation)));
 rmSync(file);await click('#close-modal');
}
assert.deepEqual(await evaluate('window.conventionPosts'),[],'report export must use the existing calculation');

// Explicit text headers take precedence over the preference; stored arrows and relations remain in travel order.
await change('#convention','left');const quiverBefore=(await current()).quiver;
await click('#edit-text');await evaluate(`document.querySelector('#presentation').value=${JSON.stringify(rightText)}`);await click('#apply-text');
const applied=(await current()).quiver;
const labelled=q=>({name:q.name,vertices:q.vertices.map(({label,x,y})=>({label,x,y})),arrows:q.arrows.map(a=>({label:a.label,source:q.vertices.find(v=>v.id===a.source).label,target:q.vertices.find(v=>v.id===a.target).label})),relations:q.relations.map(r=>r.map(id=>q.arrows.find(a=>a.id===id).label))});
assert.deepEqual(labelled(applied),labelled(quiverBefore));
assert.deepEqual(applied.arrows.map(a=>a.id),parse(rightText,'left').quiver.arrows.map(a=>a.id),'text application retains the parser\'s canonical ids');
assert.equal(await evaluate(`document.querySelector('#convention').value`),'left');
await click('#undo');assert.equal((await current()).quiver.name,'Convention checkpoint');

await click('[data-algebra="dual"]');await click('#compute');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
await click('[data-tab="cohomology"]');await change('#basis-degree','2');
const negative=await evaluate(`document.querySelector('.basis-card .representative').textContent`);
assert.match(negative,/−|-/, 'degree-two transport has the negative sign');
await change('#convention','right');
const positive=await evaluate(`document.querySelector('.basis-card .representative').textContent`);
assert.doesNotMatch(positive,/−|-/);assert.notEqual(negative,positive);
await click('[data-tab="operations"]');await change('#op-type','cap');
assert.ok(await evaluate(`!!document.querySelector('.operation-grid .result-card h3 math msup')`),'right-module cap starts with a cochain');
await change('#convention','left');
assert.ok(await evaluate(`!!document.querySelector('.operation-grid .result-card h3 math msub')`),'left-module cap starts with a chain');
assert.ok(await evaluate(`!!(document.querySelector('#op-q').compareDocumentPosition(document.querySelector('#op-p')) & Node.DOCUMENT_POSITION_FOLLOWING)`),'left cap displays chain degree before cochain degree');
assert.match(await evaluate(`document.querySelector('#result-output').textContent`),/z\s*∩\s*f/);
assert.match(await evaluate(`document.querySelector('#result-output').textContent`),/44/);
await click('#run-operation');await waitFor(`!!document.querySelector('.operation-result')`);
const resultBefore=await evaluate(`document.querySelector('.operation-result .formula').textContent`);
const postsBefore=await evaluate('window.conventionPosts.length');
await change('#convention','right');
assert.equal(await evaluate(`document.querySelector('.operation-result .formula').textContent`),resultBefore);
assert.equal(await evaluate('window.conventionPosts.length'),postsBefore);

// Native labelled select, usable targets and persistence in both supported themes and narrow layouts.
for(const width of [390,768,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<800});for(const theme of ['light','dark']){
 await click('#theme');await click(`[data-theme-choice="${theme}"]`);
 assert.ok(await evaluate(`(()=>{const e=document.querySelector('#convention'),r=e.getBoundingClientRect();return !!document.querySelector('label[for="convention"]')&&r.width>=24&&r.height>=24&&parseFloat(getComputedStyle(e).fontSize)>=13})()`));
 assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`overflow ${width} ${theme}`);
}}
await send('Page.reload');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
assert.equal(await evaluate(`document.querySelector('#convention').value`),'right');
assert.deepEqual(errors,[]);console.log('Module-convention browser checks passed: relations, text headers, signed representatives, cap action, exports, persistence, unchanged data/history and no recomputation.');ws.close();
