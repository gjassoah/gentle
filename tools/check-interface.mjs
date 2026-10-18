import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {markdown,writeDocs} from './markdown.mjs';
import {initTheme} from '../src/theme.js';
// Check the emitted document, including escaping and relative documentation links.
const html=markdown('# A heading\n\nA **bold** and *italic* [method](docs/METHODOLOGY.md) with `<b>`.\n\n```sh\n<tag> & value\n```\n\n- first\n- second\n\n1. one\n2. two\n\n| Name | Value |\n|---|---|\n| a | `b` |');
for(const expected of ['<h1 id="a-heading">','<strong>bold</strong>','<em>italic</em>','href="methods.html"','<code>&lt;b&gt;</code>','&lt;tag&gt; &amp; value','<ul><li>first</li><li>second</li></ul>','<ol><li>one</li><li>two</li></ol>','<th scope="col">Name</th>','<td><code>b</code></td>'])assert.ok(html.includes(expected),expected);
assert.ok(markdown('[unsafe](javascript:alert) <script>').includes('href="#"'));
assert.ok(markdown('[source](src/app.js)').includes('https://github.com/gjassoah/gentle/blob/main/src/app.js'));
const directory=await mkdtemp(join(tmpdir(),'gentle-doc-check-'));
await writeFile(`${directory}/about.html`,'stale generated page');
await writeDocs(directory);
assert.deepEqual(await readdir(directory),['methods.html']);
assert.ok(markdown('[readme](README.md#features)').includes('href="README.md#features"'));
for(const name of ['methods']){const page=await readFile(`${directory}/${name}.html`,'utf8');for(const expected of ['<html lang="en">','name="description"','<title>','href="src/style.css"','href="./"','./src/theme.js','data-theme-choice="system"'])assert.ok(page.includes(expected),`${name}: ${expected}`);assert.ok(!/href="(?:docs\/METHODOLOGY|README)\.md"/.test(page))}
await rm(directory,{recursive:true});
const index=await readFile('index.html','utf8');
assert.equal((index.match(/<h1\b/g)||[]).length,1);
assert.match(index,/<h1 class="calculator-title"><a class="brand" href="\.\/">gentle<span class="brand-sub">invariant calculator for gentle algebras<\/span><\/a><\/h1>/);
assert.ok(!/brand-mark|rel="icon"|about\.html|workspace-heading/.test(index));
assert.match(index,/<div class="setup-body"><div class="field-row"><label for="name">Name<\/label><input id="name"/);
const workspace=index.slice(index.indexOf('<div class="algebra-tabs-row">'),index.indexOf('<div class="editor-grid">'));
for(const id of ['algebra-tabs','new','duplicate-algebra','algebra-close','examples','import','copy-link','save-state'])assert.ok(workspace.includes(`id="${id}"`),id);
assert.match(index,/<section class="panel results-section"[^>]*><div class="panel-heading results-heading">/);
assert.equal((index.match(/role="tab" data-group=/g)||[]).length,5);
const footer=index.slice(index.indexOf('<footer>'),index.indexOf('</footer>'));
assert.deepEqual([...footer.matchAll(/<a href="([^"]+)"/g)].map(m=>m[1]),['https://github.com/gjassoah/gentle','methods.html']);
// Exercise the same theme controller used by the app and methods document.
function themeHarness(saved,{blocked=false,dark=false}={}){
 const events={},attrs={},root={dataset:{},style:{}},choices=['system','light','dark'].map(value=>({dataset:{themeChoice:value},setAttribute(key,value){this[key]=value},focus(){active=this},closest(s){return s==='.theme-picker'?picker:this}}));let active=null,stored=saved,changed=0;
 const picker={},button={setAttribute(key,value){attrs[key]=value},focus(){active=this},closest(){return picker}},options={hidden:true,querySelector(s){return choices.find(b=>s.includes(`"${b.dataset.themeChoice}"`))}},media={matches:dark,addEventListener(type,callback){this.change=callback}};
 globalThis.document={documentElement:root,querySelector(s){return s==='#theme'?button:options},querySelectorAll(){return choices},addEventListener(type,callback){events[type]=callback}};
 globalThis.matchMedia=()=>media;globalThis.localStorage={getItem(){if(blocked)throw Error('blocked');return stored},setItem(key,value){if(blocked)throw Error('blocked');assert.equal(key,'gentle-theme');stored=value}};
 initTheme(()=>changed++);
 return {root,button,options,media,choices,get active(){return active},get stored(){return stored},get changed(){return changed},events,choose(value){options.onclick({target:choices.find(b=>b.dataset.themeChoice===value)})}};
}
for(const saved of [null,'unrecognised']){const h=themeHarness(saved,{dark:true});assert.equal(h.root.dataset.theme,'dark');assert.equal(h.choices[0]['aria-pressed'],'true');h.media.matches=false;h.media.change();assert.equal(h.root.dataset.theme,'light')}
for(const blocked of [false,true]){
 const h=themeHarness(null,{blocked});h.button.onclick();assert.equal(h.options.hidden,false);assert.equal(h.active,h.choices[0]);h.choose('dark');assert.equal(h.root.dataset.theme,'dark');assert.equal(h.options.hidden,true);assert.equal(h.active,h.button);h.media.matches=false;h.media.change();assert.equal(h.root.dataset.theme,'dark');if(!blocked)assert.equal(h.stored,'dark');
 h.button.onclick();h.events.keydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(h.options.hidden,true);assert.equal(h.active,h.button);
 for(const type of ['focusin','click']){h.button.onclick();h.events[type]({target:{closest(){return null}}});assert.equal(h.options.hidden,true);assert.equal(h.active,h.button)}
 h.button.onclick();h.choose('system');h.media.matches=true;h.media.change();assert.equal(h.root.dataset.theme,'dark');h.media.matches=false;h.media.change();assert.equal(h.root.dataset.theme,'light');
}
console.log('Interface checks passed: Markdown, generated documentation links and shared theme state/focus/live changes with available or blocked storage.');
