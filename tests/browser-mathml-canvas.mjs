import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
const VERSION=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.id){const p=pending.get(x.id);pending.delete(x.id);x.error?p.reject(Error(x.error.message)):p.resolve(x.result)}else if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails.exception?.description||x.params.exceptionDetails.text)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
const waitFor=async expr=>{for(let i=0;i<150;i++){if(await evaluate(expr))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expr)};
const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
const change=(s,value)=>evaluate(`document.querySelector(${JSON.stringify(s)}).value=${JSON.stringify(value)};document.querySelector(${JSON.stringify(s)}).dispatchEvent(new Event('change'))`);
const view=()=>evaluate(`(()=>{const v=document.querySelector('#quiver').viewBox.baseVal;return {x:v.x,y:v.y,width:v.width,height:v.height}})()`);
const current=()=>evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('gentle-session-v2'));return s.algebras.find(a=>a.id===s.activeId).quiver})()`);
const screen=(x,y)=>evaluate(`(()=>{const svg=document.querySelector('#quiver'),p=svg.createSVGPoint();p.x=${x};p.y=${y};const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}})()`);
const mouse=async(type,p,button='left',buttons=type==='mouseReleased'?0:button==='middle'?4:1)=>send('Input.dispatchMouseEvent',{type,...p,button,buttons,clickCount:type==='mouseMoved'?0:1});
const at=async(x,y)=>{const p=await screen(x,y);await mouse('mousePressed',p);await mouse('mouseReleased',p)};
const drag=async(from,to,button='left')=>{await mouse('mousePressed',from,button);await mouse('mouseMoved',to,button);await mouse('mouseReleased',to,button)};
const key=async(key,code=key)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code})};
const downloads='/tmp/gentle-job03-download-'+Date.now();mkdirSync(downloads);
await send('Runtime.enable');await send('Page.enable');await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:5173/'});await waitFor(`!!document.querySelector('#algebra-tabs')`);
await evaluate(`localStorage.removeItem('gentle-session-v2');localStorage.removeItem('gentle-workspace-v1')`);await send('Page.reload');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
assert.equal(await evaluate(`document.querySelectorAll('#result-output thead th math').length`),4);
for(const [tab,symbol,script] of [['cohomology','HH','msup'],['homology','HH','msub'],['cyclic','HC','msub']]){assert.equal(await evaluate(`document.querySelector('[data-tab="${tab}"] math ${script} mi').textContent`),symbol);await click(`[data-tab="${tab}"]`);assert.ok(await evaluate(`!!document.querySelector('.notice math mo')`));assert.ok(await evaluate(`!!document.querySelector('.basis-label math')`));}
await change('#examples','dual');await click('#compute');await waitFor(`document.querySelector('#progress').textContent.includes('Complete')`);await click('[data-tab="operations"]');await change('#op-type','bracket');await change('#op-p','1');await evaluate(`document.querySelector('#right-0').value='0';document.querySelector('#right-1').value='1'`);await click('#run-operation');await waitFor(`!!document.querySelector('.formula math')`);
assert.deepEqual(await evaluate(`[...document.querySelector('.formula math msubsup').children].map(x=>x.textContent)`),['h','2','0']);assert.equal(await evaluate(`document.querySelector('.formula math').textContent`),'h20');
await click('[data-tab="lie"]');await click('#lie-query');await waitFor(`!!document.querySelector('#lie-result table')`);assert.ok(await evaluate(`!!document.querySelector('#lie-result td math')`));
await click('[data-tab="cyclic"]');assert.ok(await evaluate(`!!document.querySelector('#result-output details p math')`));await click('[data-tab="surface"]');assert.ok(await evaluate(`!!document.querySelector('.overview-bottom math msub')`));
await click('#new');await click('#zoom-reset');await click('[data-tool="vertex"]');await at(240,220);await at(560,220);await click('[data-tool="select"]');
const original=await current();await click('#zoom-in');let v=await view();assert.equal(v.width,640);
// A keyboard move is exactly ten drawing units and reversible at any scale.
await evaluate(`document.querySelector('[data-vertex]').focus()`);await key('ArrowRight');assert.equal((await current()).vertices[0].x,250);await click('#undo');assert.deepEqual(await current(),original);
await click('#zoom-reset');await click('#zoom-out');const from=await screen(240,220),to=await screen(320,260);await drag(from,to);let q=await current();assert.ok(Math.abs(q.vertices[0].x-320)<1e-4);assert.ok(Math.abs(q.vertices[0].y-260)<1e-4);await click('#undo');assert.deepEqual(await current(),original);
// Pan does not add an undo checkpoint or change the mathematical presentation.
await click('#zoom-reset');const before=await view(),empty=await screen(700,340);await drag(empty,{x:empty.x-100,y:empty.y-50});v=await view();assert.ok(v.x>before.x&&v.y>before.y);assert.deepEqual(await current(),original);
const middle=await screen(v.x+v.width/2,v.y+v.height/2);await drag(middle,{x:middle.x-40,y:middle.y},'middle');assert.ok((await view()).x>v.x);
await click('#zoom-reset');const wheelPoint=await screen(400,220);await send('Input.dispatchMouseEvent',{type:'mouseWheel',...wheelPoint,deltaX:0,deltaY:-120,modifiers:2});await waitFor(`document.querySelector('#quiver').viewBox.baseVal.width<800`);
// Actual two-touch events exercise pinch without creating/deleting/editing objects.
await click('#zoom-reset');const a=await screen(300,300),b=await screen(500,300);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:0},{...b,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x-40,y:a.y,id:0},{x:b.x+40,y:b.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok((await view()).width<800);assert.deepEqual(await current(),original);
// Expanded layout through JSON with/without provenance; text Apply preserves positions.
const large={name:'Expanded layout',vertices:[{id:'a',label:'a',x:1500,y:900},{id:'b',label:'b',x:2000,y:1000}],arrows:[{id:'ab',label:'α',source:'a',target:'b'}],relations:[]};
await send('DOM.enable');
async function importFile(path){const root=await send('DOM.getDocument'),n=await send('DOM.querySelector',{nodeId:root.root.nodeId,selector:'#file'});await send('DOM.setFileInputFiles',{nodeId:n.nodeId,files:[path]})}
for(const stamped of [false,true]){const path=downloads+`/input-${stamped}.json`;writeFileSync(path,JSON.stringify({format:'gentle-quiver-v1',quiver:large,...(stamped?{generator:{name:'gentle',version:'old',exported:'2026-01-01T00:00:00.000Z'}}:{})}));const count=await evaluate(`document.querySelectorAll('[data-algebra]').length`);await importFile(path);await waitFor(`document.querySelectorAll('[data-algebra]').length===${count+1}`);assert.deepEqual(await current(),large)}
await click('#zoom-fit');v=await view();assert.ok(v.x<1500&&v.x+v.width>2000&&v.y<900&&v.y+v.height>1000);await click('#zoom-reset');assert.deepEqual(await view(),{x:0,y:0,width:800,height:420});assert.deepEqual(await current(),large);
await click('#edit-text');
await evaluate(`document.querySelector('#presentation').value='name: Expanded layout\\nvertices: a, b, c\\nα: a -> b'`);await click('#apply-text');q=await current();assert.deepEqual(q.vertices.slice(0,2).map(v=>[v.x,v.y]),[[1500,900],[2000,1000]]);
await click('#arrange');assert.ok((await current()).vertices.every(v=>v.x>=30&&v.x<=2370&&v.y>=70&&v.y<=1220));
// Stamps on every JSON variant and both LaTeX reports.
await click('#compute');await waitFor(`document.querySelector('#progress').textContent.includes('Complete')`);await click('[data-tab="derived"]');await click('#compute-derived');await waitFor(`!!document.querySelector('#derived-json')`);await click('#derived-json');await click('#derived-tex');
await click('#export');for(const s of ['#export-session','#export-quiver','#export-results','#export-tex'])await click(s);await click('#close-modal');
for(const name of ['session','quiver','results','derived']){const file=downloads+`/gentle-${name}.json`;for(let i=0;i<50&&!existsSync(file);i++)await new Promise(r=>setTimeout(r,100));const data=JSON.parse(readFileSync(file,'utf8'));assert.equal(data.generator.name,'gentle');assert.equal(data.generator.version,VERSION);assert.equal(new Date(data.generator.exported).toISOString(),data.generator.exported)}
for(const name of ['calculus','derived']){const file=downloads+`/gentle-${name}.tex`;for(let i=0;i<50&&!existsSync(file);i++)await new Promise(r=>setTimeout(r,100));assert.match(readFileSync(file,'utf8'),new RegExp(`Generated by gentle ${VERSION.replaceAll('.','\\.')}; exported \\d{4}-\\d\\d-\\d\\dT`))}
for(const width of [390,768,1440]){await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<800});for(const theme of ['light','dark']){await click('#theme');await click(`[data-theme-choice="${theme}"]`);assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));assert.ok(await evaluate(`['#zoom-in','#zoom-out','#zoom-fit','#zoom-reset'].every(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return r.width>=24&&r.height>=24&&parseFloat(getComputedStyle(e).fontSize)>=13})`));}}
assert.deepEqual(errors,[]);console.log('MathML/canvas/export browser checks passed.');ws.close();
