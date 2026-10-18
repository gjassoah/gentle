// Run by tools/verify.sh --full against a disposable Chromium profile and dist/.
// Syntax only is checked when browser execution is unavailable in the sandbox.
import assert from 'node:assert/strict';
import {cards} from '../src/cards-data.js';
import {cardLocations} from '../src/cards.js';
import {examples} from '../src/examples.js';
const pages=await(await fetch('http://127.0.0.1:9222/json')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.onopen=resolve);
let sequence=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const message=JSON.parse(e.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(Error(message.error.message)):p.resolve(message.result)}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Timed out: '+expression)};
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const change=(selector,value)=>evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)};document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change'))`);
// Native activation of a focused control needs the key code and, for Enter, the text of the key.
const KEYS={Enter:[13,'\r'],Tab:[9,''],Escape:[27,''],' ':[32,' ']};
const key=async(key,modifiers=0)=>{const [code,text]=KEYS[key]||[0,''];await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code,text,modifiers});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code,modifiers})};
const mainGroup=view=>['cohomology','homology','cyclic'].includes(view)?'groups':['operations','lie','higher'].includes(view)?'operations':['structure','all'].includes(view)?'structure':['surface','derived'].includes(view)?'surface':'overview';
async function view(name){await click(`[data-group="${mainGroup(name)}"]`);await click(`[data-tab="${name}"]`)}
await send('Runtime.enable');await send('Page.enable');
await send('Page.navigate',{url:process.env.CARDS_TEST_URL||'http://127.0.0.1:5173/'});await waitFor(`!!document.querySelector('#algebra-tabs [data-algebra]')&&!!document.querySelector('[data-card="W1"]')`);
const initial={format:'gentle-session-v2',activeId:'cards-test',algebras:[{id:'cards-test',quiver:examples.triangle,characteristic:'0',degree:3}]};
await evaluate(`localStorage.clear();localStorage.setItem('gentle-session-v2',${JSON.stringify(JSON.stringify(initial))})`);
await send('Page.reload');await waitFor(`document.querySelector('#progress')?.textContent.includes('Complete')`);
await waitFor(`!!document.querySelector('[data-card="W1"]')`);
assert.equal(await evaluate(`document.querySelector('#help').textContent`),'Help');
assert.deepEqual(await evaluate(`[...document.querySelectorAll('.header-actions > button,.header-actions > .theme-picker > button')].map(x=>x.textContent)`),['Help','Export','Theme']);
assert.equal(await evaluate(`document.querySelectorAll('.information-card[open]').length`),0);
await evaluate(`document.querySelector('[data-card="W2"] > summary').focus()`);await key('Enter');
await waitFor(`document.querySelector('[data-card="W2"]').open`);
const left=await evaluate(`document.querySelector('[data-card="W2"] .card-statement').innerHTML`);
await evaluate(`window.cardsWorkerPosts=[];const send=Worker.prototype.postMessage;Worker.prototype.postMessage=function(message,...args){window.cardsWorkerPosts.push(message.type);return send.call(this,message,...args)};window.retainedCard=document.querySelector('[data-card="W2"]')`);
await change('#convention','right');
assert.equal(await evaluate(`document.querySelector('[data-card="W2"]').open`),true);
assert.equal(await evaluate(`document.querySelector('[data-card="W2"]')===window.retainedCard`),true);
assert.notEqual(await evaluate(`document.querySelector('[data-card="W2"] .card-statement').innerHTML`),left);
assert.deepEqual(await evaluate('window.cardsWorkerPosts'),[]);

// Every declared placement must find its real heading, including all operation
// choices and the headings created by an independent derived computation.
await view('derived');await click('#compute-derived');await waitFor(`!!document.querySelector('#derived-json')`);
const seen=new Set();
for(const location of cardLocations){
  if(location.view!=='workspace')await view(location.view);
  if(location.operation)await change('#op-type',location.operation);
  for(const id of location.ids){
    const scope=location.view==='workspace'?'.setup-panel':'#result-output';
    await waitFor(`!!document.querySelector('${scope} [data-card="${id}"]')`);seen.add(id);
  }
}
assert.deepEqual([...seen].sort(),cards.map(card=>card.id).sort());

// Enter, Tab and Escape exercise native details, links and modal focus. Help
// navigation selects a view and a card without posting a worker request.
await evaluate(`document.querySelector('#help').focus()`);await key('Enter');
await waitFor(`document.querySelector('#modal').open`);
assert.equal(await evaluate(`document.querySelector('#modal-title').textContent`),'Help');
assert.equal(await evaluate(`document.querySelectorAll('#modal-body [data-help-card]').length`),32);
await key('Tab');assert.equal(await evaluate(`document.querySelector('#modal').contains(document.activeElement)`),true);
await key('Tab',8);assert.equal(await evaluate(`document.querySelector('#modal').contains(document.activeElement)`),true);
await evaluate(`window.dialogStops=[...document.querySelectorAll('#modal button:not([disabled]),#modal [href],#modal summary')].filter(x=>x.getClientRects().length);window.dialogStops.at(-1).focus()`);
await key('Tab');assert.equal(await evaluate(`document.activeElement===window.dialogStops[0]`),true,'Tab wraps inside the dialog');
await key('Tab',8);assert.equal(await evaluate(`document.activeElement===window.dialogStops.at(-1)`),true,'Shift+Tab wraps inside the dialog');
await evaluate(`document.querySelector('#modal-body [data-help-card="S1"]').focus()`);await key('Enter');
await waitFor(`!!document.querySelector('#modal-body [data-show-card="S1"]')`);
assert.equal(await evaluate(`document.querySelector('#modal-body [data-card="S1"]').dataset.cardConvention`),'right');
await evaluate(`window.cardsWorkerPosts=[];document.querySelector('[data-show-card="S1"]').focus()`);await key('Enter');
assert.equal(await evaluate(`document.querySelector('#modal').open`),false);
assert.equal(await evaluate(`document.querySelector('#result-output [data-card="S1"]').open`),true);
assert.equal(await evaluate(`document.activeElement.closest('[data-card]')?.dataset.card`),'S1');
assert.deepEqual(await evaluate('window.cardsWorkerPosts'),[]);
await evaluate(`document.querySelector('#help').focus()`);await key('Enter');await key('Escape');
assert.equal(await evaluate(`document.querySelector('#modal').open`),false);
assert.equal(await evaluate('document.activeElement.id'),'help');

for(const theme of ['light','dark']){
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('#theme');await click(`[data-theme-choice="${theme}"]`);await click('#help');
  for(const id of cards.map(card=>card.id)){
    await click(`[data-help-card="${id}"]`);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`page overflow ${theme} ${id}`);
    assert.ok(await evaluate(`document.querySelector('#modal-body').scrollWidth<=document.querySelector('#modal-body').clientWidth+1`),`Help overflow ${theme} ${id}`);
  }
  assert.ok(await evaluate(`(()=>{const s=document.querySelector('#modal-body summary'),r=s.getBoundingClientRect();return parseFloat(getComputedStyle(s).fontSize)>=13&&r.height>=24})()`));
  await key('Escape');
}
await evaluate(`document.fonts.load('16px "Latin Modern Math"')`);
assert.ok(await evaluate(`document.fonts.check('16px "Latin Modern Math"')`));
await click('#new');await change('#examples','triangle');await click('#help');await click('[data-help-card="G2"]');
assert.equal(await evaluate(`document.querySelector('[data-show-card="G2"]').disabled`),true);
assert.match(await evaluate(`document.querySelector('[data-show-card="G2"]').textContent`),/Compute calculus/);
await click('[data-help-card="D6"]');assert.match(await evaluate(`document.querySelector('[data-show-card="D6"]').textContent`),/Compute derived invariant/);
await key('Escape');await send('Page.reload');await waitFor(`!!document.querySelector('[data-card="W1"]')`);
assert.equal(await evaluate(`document.querySelectorAll('.information-card[open]').length`),0,'open cards are not persisted');
assert.deepEqual(errors,[]);console.log('Card browser checks: all placements, both conventions, Help navigation, keyboard focus, font, themes, mobile overflow and prerequisites.');ws.close();
