// Uses the same disposable Chromium profile / CDP setup as the other browser checks.
import assert from 'node:assert/strict';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.onopen=resolve);
let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id){const p=pending.get(x.id);pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result)}else if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails.exception?.description||x.params.exceptionDetails.text)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Timed out: '+expression)};
const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
const tabs=()=>evaluate(`document.querySelectorAll('[data-algebra]').length`);
const saved=()=>evaluate(`JSON.parse(localStorage.getItem('gentle-session-v2'))`);
const current=async()=>{const s=await saved();return s.algebras.find(a=>a.id===s.activeId)};
const setText=async value=>{await evaluate(`document.querySelector('#presentation').focus();document.querySelector('#presentation').select()`);await send('Input.insertText',{text:value})};
await send('Runtime.enable');await send('Page.enable');
await send('Page.navigate',{url:'http://127.0.0.1:5173/'});await waitFor(`document.querySelector('#edit-text')&&!!localStorage.getItem('gentle-session-v2')`);
// Replace only the disposable browser test workspace.
await evaluate(`localStorage.removeItem('gentle-session-v2');localStorage.removeItem('gentle-workspace-v1')`);
await send('Page.reload');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
const before=await current();
await click('#edit-text');assert.match(await evaluate(`document.querySelector('#presentation').value`),/α: 1 -> 2/);
await setText('name: Typed algebra α\nvertices: 1, 2, 4\nα: 1 → 2');await click('#apply-text');
let a=await current();assert.equal(a.quiver.name,'Typed algebra α');assert.equal(a.quiver.vertices.length,3);assert.equal(a.quiver.arrows.length,1);
for(const label of ['1','2']){const old=before.quiver.vertices.find(v=>v.label===label),v=a.quiver.vertices.find(v=>v.label===label);assert.deepEqual([v.x,v.y],[old.x,old.y])}
await click('#undo');assert.deepEqual((await current()).quiver,before.quiver);await click('#redo');assert.equal((await current()).quiver.name,'Typed algebra α');
await click('#edit-text');await setText('a: 1 -> 2\na b = 0');await click('#apply-text');assert.match(await evaluate(`document.querySelector('#presentation-errors').textContent`),/Line 2: Unknown arrow/);assert.equal((await current()).quiver.name,'Typed algebra α');assert.equal(await evaluate(`document.querySelector('#presentation').getAttribute('aria-invalid')`),'true');
await click('#cancel-text');await click('#edit-text');assert.match(await evaluate(`document.querySelector('#presentation').value`),/name: Typed algebra α/);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});assert.equal(await evaluate(`document.querySelector('#presentation-editor').hidden`),true);
// Gentle validation and computation use their existing controls.
await click('#edit-text');await setText('name: Invalid cycle\na: 1 -> 1');await click('#apply-text');assert.equal(await evaluate(`document.querySelector('#compute').disabled`),true);assert.match(await evaluate(`document.querySelector('#validation').textContent`),/infinite-dimensional/);assert.equal(await evaluate(`document.querySelector('#validation svg').getAttribute('aria-hidden')`),'true');await click('#undo');
await click('#compute');await waitFor(`document.querySelector('#progress').textContent.includes('Complete')`);
await evaluate(`document.querySelector('#characteristic').value='2';document.querySelector('#characteristic').dispatchEvent(new Event('change'));document.querySelector('#max-degree').value='5';document.querySelector('#max-degree').dispatchEvent(new Event('change'))`);
// Intercept the clipboard API, exercising both Copy link controls without OS permissions.
await evaluate(`window.copiedLink=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedLink=text}}})`);
await click('#copy-link');await waitFor(`!!window.copiedLink`);const link=await evaluate('window.copiedLink');assert.match(link,/#a=[A-Za-z0-9_-]+$/);
await click('#export');await evaluate('window.copiedLink=null');await click('#export-link');await waitFor(`!!window.copiedLink`);assert.equal(await evaluate('window.copiedLink'),link);await click('#close-modal');
a=await current();const count=await tabs();
await send('Page.navigate',{url:link});await waitFor(`document.querySelectorAll('[data-algebra]').length===${count+1}&&location.hash===''`);
const linked=await current();assert.deepEqual(linked.quiver,a.quiver);assert.equal(linked.characteristic,'2');assert.equal(linked.degree,5);assert.ok((await saved()).algebras.some(x=>x.id===a.id));assert.match(await evaluate(`document.querySelector('#toast').textContent`),/opened in a new tab/);
const validSession=await saved();
for(const fragment of ['#a=bad!', '#a='+'A'.repeat(16000)]){await send('Page.navigate',{url:'http://127.0.0.1:5173/'+fragment});await waitFor(`document.querySelector('#toast')?.textContent.includes('Could not open algebra link')`);assert.equal(await evaluate('location.hash'),'');assert.deepEqual(await saved(),validSession)}
// The link gate must preserve a full forty-tab workspace.
await evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('gentle-session-v2'));s.algebras=Array.from({length:40},(_,i)=>({...s.algebras[0],id:'tab-'+i}));s.activeId='tab-0';localStorage.setItem('gentle-session-v2',JSON.stringify(s))})()`);
// A fresh load, so that the app reads the saved forty-tab session; a fragment change alone does not reload.
await send('Page.navigate',{url:'about:blank'});await send('Page.navigate',{url:link});await waitFor(`document.querySelector('#toast')?.textContent.includes('40 algebra tabs')`);assert.equal(await tabs(),40);assert.equal(await evaluate('location.hash'),'');
// New controls remain readable and fit the viewport in both themes at every breakpoint.
for(const width of [390,768,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<800});for(const theme of ['light','dark']){await click('#theme');await click(`[data-theme-choice="${theme}"]`);await click('#edit-text');assert.ok(await evaluate(`(()=>{const field=document.querySelector('#characteristic').closest('.field-row').getBoundingClientRect(),button=document.querySelector('#edit-text').getBoundingClientRect();return button.top-field.bottom>=12})()`),'text editor button has space above it');assert.ok(await evaluate(`(()=>{const s=document.querySelector('#save-state'),r=s.getBoundingClientRect();return getComputedStyle(s).display!=='none'&&r.width>0})()`),'save-state remains visible');assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`overflow at ${width} ${theme}`);assert.ok(await evaluate(`['#copy-link','#edit-text','#apply-text','#cancel-text','#presentation'].every(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return r.width>=24&&r.height>=24&&parseFloat(getComputedStyle(e).fontSize)>=13})`));await click('#cancel-text')}}
assert.deepEqual(errors,[]);console.log('Presentation/link browser checks passed: text, errors, cancel, undo, positions, computation, clipboard, linked tabs, malformed/oversized links, session preservation, forty-tab limit, themes and viewport sizes.');ws.close();
