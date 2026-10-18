import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards,helpHtml} from '../src/cards-data.js';
import {cardLocations,cardSummary,cardBody,cardHTML,unavailableReason,preferredLocation,informationCards} from '../src/cards.js';

const cardById=new Map(cards.map(card=>[card.id,card]));
const complete={algebraId:'a',view:'overview',operation:'cup',convention:'left',valid:true,current:true,formulaOnly:false,derived:true};
const uncomputed={...complete,current:false,derived:false};

test('every approved card maps to an interface location and a resolving Help entry',()=>{
 assert.equal(cards.length,32);assert.equal(cardById.size,32);
 const ids=new Set(cardLocations.flatMap(location=>location.ids));assert.deepEqual([...ids].sort(),[...cardById.keys()].sort());
 const links=[...helpHtml.matchAll(/data-help-card="([^"]+)"/g)].map(match=>match[1]);assert.equal(links.length,32);assert.deepEqual(links.slice().sort(),[...ids].sort());
 for(const location of cardLocations){assert.ok(location.selector||location.heading);assert.ok(['workspace','overview','cohomology','homology','cyclic','operations','lie','higher','structure','all','surface','derived'].includes(location.view));for(const id of location.ids)assert.ok(cardById.has(id))}
 for(const card of cards){assert.ok(card.sourceText);assert.ok(card.sourceHtml);assert.ok(card.leftHtml);assert.ok(card.rightHtml);assert.ok(card.applicationHtml)}
});

test('all declared card headings and selectors occur in the interface source',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),index=readFileSync(new URL('../index.html',import.meta.url),'utf8'),source=app+'\n'+index;
 for(const location of cardLocations){
  if(location.heading){assert.ok(source.includes(`>${location.heading}<`),`${location.view}: ${location.heading}`);continue}
  for(const [,id] of location.selector.matchAll(/#([\w-]+)/g))assert.ok(source.includes(`id="${id}"`),`${location.view}: #${id}`);
  for(const [,name] of location.selector.matchAll(/\.([\w-]+)/g))assert.ok(new RegExp(`class="[^"\n]*\\b${name}\\b`).test(source),`${location.view}: .${name}`);
  for(const [,value] of location.selector.matchAll(/\[for="([^"]+)"\]/g))assert.ok(index.includes(`for="${value}"`),`label for ${value}`);
 }
});

test('summaries show compact kinds and sources while bodies retain complete citations',()=>{
 assert.equal(cardSummary(cardById.get('W1')),'Definition · after CSSS26, Definition 2.1, pp. 141–142');
 assert.equal(cardSummary(cardById.get('S1')),'Definition · after CSSS26, §3.1, pp. 145, 147');
 assert.equal(cardSummary(cardById.get('G4')),'Construction · standard and after CSSS26, Proposition 4.11, p. 175');
 assert.equal(cardSummary(cardById.get('G1')),'Standard definition');
 assert.equal(cardSummary(cardById.get('W4')),'Standard convention');
 assert.equal(cardSummary(cardById.get('D9')),'Procedure · Methods');
 for(const card of cards){
  assert.ok(cardSummary(card).length>0);
  for(const convention of ['left','right']){
   const body=cardBody(card,convention),html=cardHTML(card.id,convention);
   assert.ok(body.includes(card[convention+'Html']));assert.ok(body.includes(card.sourceHtml));assert.ok(body.includes(card.applicationHtml));assert.ok(html.includes(card.titleHtml));
   assert.match(html,new RegExp(`^<details class="information-card" data-card="${card.id}" data-card-convention="${convention}">`));
   assert.match(cardHTML(card.id,convention,{help:true}),/data-card-convention="(?:left|right)" open>/);
   assert.doesNotMatch(html,/Source passages|<script|onerror=/i);
  }
 }
 assert.notEqual(cardBody(cardById.get('W3'),'left'),cardBody(cardById.get('W3'),'right'));
 assert.throws(()=>cardHTML('missing','left'),/Unknown information card/);
 assert.throws(()=>preferredLocation('missing',complete),/Unknown information card/);
 assert.ok(cardHTML('W1','left" onmouseover="x').includes('data-card-convention="left&quot; onmouseover=&quot;x"'));
});

test('prerequisites distinguish workspace, surface, derived evidence and bar headings',()=>{
 const workspace=cardLocations.find(location=>location.ids.includes('W1'));
 assert.equal(unavailableReason(workspace,{...uncomputed,valid:false}),'');
 const surface=cardLocations.find(location=>location.ids.includes('D1'));
 assert.equal(unavailableReason(surface,uncomputed),'');assert.match(unavailableReason(surface,{...uncomputed,valid:false}),/valid finite-dimensional/);
 assert.equal(unavailableReason(preferredLocation('D7',uncomputed),uncomputed),'');
 assert.match(unavailableReason(preferredLocation('D6',uncomputed),uncomputed),/Compute derived invariant/);
 assert.match(unavailableReason(preferredLocation('O1',uncomputed),uncomputed),/Compute calculus/);
 const formulaOnly={...complete,formulaOnly:true};
 for(const id of ['G1','G2','G3','G4','P1','P2','P3','P4'])assert.match(unavailableReason(preferredLocation(id,formulaOnly),formulaOnly),/completed bar calculation/,id);
 for(const id of ['S1','S2','S3','S4','S5','P5','P6'])assert.equal(unavailableReason(preferredLocation(id,formulaOnly),formulaOnly),'',id);
 for(const id of cardById.keys())assert.equal(unavailableReason(preferredLocation(id,complete),complete),'',id);
 assert.equal(preferredLocation('W2',complete).view,'workspace');
 assert.equal(preferredLocation('P2',complete).operation,'cap');
 assert.equal(preferredLocation('D8',uncomputed).heading,'Compare with another algebra tab');
});

// A deliberately small DOM harness exercises the runtime's node ownership,
// disclosure state, tree placement and focus calls. It does not emulate browser
// layout, native keyboard handling, MathML rendering, or MutationObserver timing.
const decode=text=>text.replace(/&(amp|lt|gt|quot|#39);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[name]));
const dataName=key=>'data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
function simpleMatch(node,selector,scope){
 if(selector===':scope')return node===scope;
 if(node.tagName==='#TEXT')return false;
 const tag=selector.match(/^[a-zA-Z][\w-]*/)?.[0];if(tag&&node.tagName!==tag.toUpperCase())return false;
 for(const [,id] of selector.matchAll(/#([\w-]+)/g))if(node.id!==id)return false;
 for(const [,name] of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(name))return false;
 for(const [,key,value] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){if(!node.hasAttribute(key))return false;if(value!==undefined&&node.getAttribute(key)!==value)return false}
 return true;
}
function matches(node,selector,scope){
 const parts=selector.trim().replace(/\s*>\s*/g,' > ').split(/\s+/);
 function at(current,index){if(!current||!simpleMatch(current,parts[index],scope))return false;if(index===0)return true;if(parts[index-1]==='>')return at(current.parentElement,index-2);for(let parent=current.parentElement;parent;parent=parent.parentElement)if(at(parent,index-1))return true;return false}
 return at(node,parts.length-1);
}
class Element{
 constructor(tag,doc,text=''){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.attributes={};this.children=[];this.parentElement=null;this.text=text;this.dataset=new Proxy({},{get:(_,key)=>this.getAttribute(dataName(key))??undefined,set:(_,key,value)=>{this.setAttribute(dataName(key),value);return true}});this.classList={contains:name=>this.className.split(/\s+/).includes(name)};if(tag==='template')this.content=new Element('fragment',doc)}
 get className(){return this.attributes.class||''}set className(value){this.attributes.class=value}
 get id(){return this.attributes.id||''}set id(value){this.attributes.id=value}
 get open(){return this.hasAttribute('open')}set open(value){value?this.setAttribute('open',''):this.removeAttribute('open')}
 get disabled(){return this.hasAttribute('disabled')}set disabled(value){value?this.setAttribute('disabled',''):this.removeAttribute('disabled')}
 get nextElementSibling(){if(!this.parentElement)return null;const siblings=this.parentElement.children.filter(node=>node.tagName!=='#TEXT');return siblings[siblings.indexOf(this)+1]||null}
 get firstElementChild(){return this.children.find(node=>node.tagName!=='#TEXT')||null}
 get textContent(){return this.tagName==='#TEXT'?this.text:this.children.map(node=>node.textContent).join('')}
 set textContent(value){this.children.forEach(node=>node.parentElement=null);this.children=[];this.append(new Element('#text',this.ownerDocument,String(value)))}
 set innerHTML(value){const target=this.content||this;target.children.forEach(node=>node.parentElement=null);target.children=[];target.assignedHTML=value;parseHTML(value,target)}
 setAttribute(key,value){this.attributes[key]=String(value)}getAttribute(key){return this.attributes[key]??null}hasAttribute(key){return Object.hasOwn(this.attributes,key)}removeAttribute(key){delete this.attributes[key]}
 append(node){node.remove();node.parentElement=this;this.children.push(node)}prepend(node){node.remove();node.parentElement=this;this.children.unshift(node)}
 after(node){assert.ok(this.parentElement);node.remove();node.parentElement=this.parentElement;this.parentElement.children.splice(this.parentElement.children.indexOf(this)+1,0,node)}
 remove(){if(this.parentElement){const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null}}
 querySelectorAll(selector){const selectors=selector.split(',').map(s=>s.trim()),found=[];function visit(node){for(const child of node.children){if(selectors.some(s=>matches(child,s,this)))found.push(child);visit.call(this,child)}}visit.call(this,this);return found}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 closest(selector){for(let node=this;node;node=node.parentElement)if(matches(node,selector,this))return node;return null}
 focus(options){this.ownerDocument.activeElement=this;this.focusOptions=options}
 scrollIntoView(options){this.scrollOptions=options}
}
function parseHTML(html,root){
 const stack=[root],voids=new Set(['br','hr','img','input','meta','link']);
 for(const token of html.match(/<[^>]*>|[^<]+/g)||[]){
  if(token.startsWith('</')){stack.pop();continue}
  if(token.startsWith('<')){const name=token.match(/^<([\w-]+)/)?.[1];if(!name)continue;const node=new Element(name,root.ownerDocument);for(const match of token.slice(name.length+1,-1).matchAll(/([\w:-]+)(?:="([^"]*)"|'([^']*)')?/g))node.setAttribute(match[1],decode(match[2]??match[3]??''));stack.at(-1).append(node);if(!voids.has(name)&&!token.endsWith('/>'))stack.push(node)}else stack.at(-1).append(new Element('#text',root.ownerDocument,decode(token)));
 }
}
function fixture(overrides={}){
 const doc=new Element('#document');doc.ownerDocument=doc;doc.createElement=tag=>new Element(tag,doc);
 const observers=[];doc.defaultView={MutationObserver:class{constructor(callback){this.callback=callback;this.observations=0;observers.push(this)}disconnect(){this.target=null}observe(target,options){this.target=target;this.options=options;this.observations++}}};
 doc.innerHTML='<aside class="setup-panel"><div class="panel-heading"><h2>Algebra</h2></div><div class="setup-body"><label for="characteristic">Field characteristic</label><label for="convention">Paths</label><div class="relations-heading"><h3>Zero relations</h3></div></div></aside><div id="result-output"></div><div id="modal-body"></div>';
 const state={...complete,...overrides},output=doc.querySelector('#result-output'),navigations=[];let closes=0;
 function render(){
  const headings=cardLocations.filter(location=>location.view===state.view&&(!location.operation||location.operation===state.operation));
  output.innerHTML='';const seen=new Set();
  for(const location of headings){if(location.selector?.includes('derived-output'))continue;const key=location.selector||location.heading;if(seen.has(key))continue;seen.add(key);
   if(location.selector?.startsWith('#')){const id=location.selector.slice(1);const term=['center-heading','global-dimension-heading','circuits-heading'].includes(id);const shell=doc.createElement(term?'dl':'section');shell.innerHTML=term?`<dt id="${id}">Heading</dt><dd>Value</dd>`:`<h3 id="${id}">Heading</h3>`;output.append(shell)}
   else if(location.selector==='.calculus-checks > summary'){const details=doc.createElement('details');details.className='calculus-checks';details.innerHTML='<summary>Checks for this calculation</summary>';output.append(details)}
   else if(location.heading){const shell=doc.createElement('section');shell.innerHTML=`<h3>${location.heading}</h3>`;output.append(shell)}
  }
 }
 render();const api=informationCards({document:doc,state:()=>state,closeHelp:()=>closes++,navigate:location=>{navigations.push(location);state.view=location.view;if(location.operation)state.operation=location.operation;render()}});
 return {doc,state,output,api,observers,navigations,render,get closes(){return closes}};
}

test('refresh is idempotent, places disclosures in definition bodies, and retains open nodes on Paths changes',()=>{
 const f=fixture(),center=f.output.querySelector('#center-heading'),group=center.nextElementSibling.querySelector(':scope > .information-card-group');assert.ok(group);assert.equal(group.parentElement.tagName,'DD');
 const card=group.querySelector('[data-card="O1"]');assert.equal(card.open,false);card.open=true;const count=f.doc.querySelectorAll('.information-card').length;
 f.api.refresh();f.api.refresh();assert.equal(f.doc.querySelectorAll('.information-card').length,count);assert.equal(group.querySelector('[data-card="O1"]'),card);
 f.state.convention='right';f.api.refresh();assert.equal(card.open,true);assert.equal(card.dataset.cardConvention,'right');assert.equal(card.querySelector('.information-card-body').assignedHTML,`<h4>${cardById.get('O1').titleHtml}</h4>${cardBody(cardById.get('O1'),'right')}`);
 f.render();f.observers[0].callback();assert.equal(f.output.querySelector('[data-card="O1"]'),card);assert.equal(card.open,true);assert.equal(f.observers[0].target,f.output);assert.deepEqual(f.observers[0].options,{childList:true,subtree:true});
 f.state.algebraId='another';f.api.refresh();assert.notEqual(f.output.querySelector('[data-card="O1"]'),card);assert.equal(f.output.querySelector('[data-card="O1"]').open,false);
});

test('showWhere selects the required operation without computing and focuses the open card',()=>{
 const f=fixture();f.api.showWhere('P2');assert.equal(f.closes,1);assert.equal(f.navigations.length,1);assert.equal(f.navigations[0].view,'operations');assert.equal(f.navigations[0].operation,'cap');
 const card=f.output.querySelector('[data-card="P2"]');assert.ok(card.open);assert.equal(f.doc.activeElement,card.querySelector('summary'));assert.deepEqual(card.scrollOptions,{block:'center',behavior:'auto'});
 f.state.current=false;f.api.showWhere('P1');assert.equal(f.closes,1);assert.equal(f.navigations.length,1);
 f.api.showWhere('W1');assert.equal(f.closes,2);assert.equal(f.doc.activeElement.closest('.information-card').dataset.card,'W1');
 f.state.current=true;f.api.showWhere('C1');assert.ok(f.output.querySelector('.calculus-checks').open);assert.ok(f.output.querySelector('[data-card="C1"]').open);
});

test('Help selection preserves the index, announces expansion and updates an open card in place',()=>{
 const f=fixture(),body=f.doc.querySelector('#modal-body');f.api.help(body);assert.equal(body.querySelectorAll('[data-help-card]').length,32);
 function choose(id){const link=body.querySelector(`[data-help-card="${id}"]`);let prevented=false;body.onclick({target:link,preventDefault:()=>{prevented=true}});assert.ok(prevented);return link}
 const link=choose('W3'),card=body.querySelector('[data-card="W3"]');assert.ok(card.open);assert.equal(link.getAttribute('aria-expanded'),'true');assert.equal(link.getAttribute('aria-controls'),'help-card-W3');assert.equal(f.doc.activeElement,card.querySelector('summary'));assert.equal(body.querySelectorAll('[data-help-card]').length,32);
 f.state.convention='right';f.api.refresh();assert.equal(body.querySelector('[data-card="W3"]'),card);assert.ok(card.open);assert.equal(card.dataset.cardConvention,'right');assert.equal(card.querySelector('.information-card-body').assignedHTML,`<h4>${cardById.get('W3').titleHtml}</h4>${cardBody(cardById.get('W3'),'right')}`);
 const next=choose('P2');assert.equal(body.querySelectorAll('.help-card-row').length,1);assert.equal(link.getAttribute('aria-expanded'),'false');assert.equal(link.hasAttribute('aria-controls'),false);assert.equal(next.getAttribute('aria-expanded'),'true');body.querySelector('[data-show-card="P2"]').onclick();assert.equal(f.navigations.at(-1).operation,'cap');
 f.state.current=false;choose('P1');const button=body.querySelector('[data-show-card="P1"]');assert.ok(button.disabled);assert.match(button.textContent,/Compute calculus/);
 f.state.current=true;f.api.refresh();assert.equal(button.disabled,false);assert.equal(button.textContent,'Show where it is used');
});


test('cards sharing a heading form one group and retain independent disclosure state',()=>{
 const f=fixture({view:'all'}),ring=f.output.querySelectorAll('h3').find(heading=>heading.textContent==='Full cohomology ring presentation'),group=ring.nextElementSibling;
 assert.ok(group.classList.contains('information-card-group'));assert.deepEqual(group.querySelectorAll('.information-card').map(card=>card.dataset.card),['S4','S5']);
 group.querySelector('[data-card="S4"]').open=true;f.api.refresh();assert.equal(ring.nextElementSibling,group);assert.equal(group.querySelector('[data-card="S4"]').open,true);assert.equal(group.querySelector('[data-card="S5"]').open,false);
});
