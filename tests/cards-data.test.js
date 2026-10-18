import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cards,helpHtml,helpIndex} from '../src/cards-data.js';
import {generateCardData,parseCards,parseHelp,renderApprovedMarkdown} from '../tools/generate-cards.mjs';

test('checked-in card data regenerate byte for byte from the approved sources',async()=>{
 assert.equal(await generateCardData(),await readFile(new URL('../src/cards-data.js',import.meta.url),'utf8'));
});

test('all 32 cards have both convention versions, locations, titles and sources',()=>{
 assert.equal(cards.length,32);assert.equal(new Set(cards.map(card=>card.id)).size,32);
 for(const card of cards){
  assert.match(card.id,/^[WOGPSDC]\d$/);assert.ok(card.kind);assert.ok(card.group);assert.ok(card.shown);
  for(const key of ['title','titleHtml','sourceText','sourceHtml','leftHtml','rightHtml','applicationHtml'])assert.ok(card[key],`${card.id}: ${key}`);
  assert.doesNotMatch(card.title,/[$\\_^]/);
  assert.match(card.leftHtml,/<math\b/);assert.match(card.rightHtml,/<math\b/);
  for(const key of ['leftHtml','rightHtml','applicationHtml','sourceHtml'])assert.doesNotMatch(card[key],/\$|Source passages|verification only|<script|<blockquote|<pre>/);
 }
 assert.ok(cards.filter(card=>card.leftHtml!==card.rightHtml).length>20);
});

test('publisher and Methods links retain the approved label and point to working locations',()=>{
 for(const [id,doi] of [['W1','10.1016/j.jalgebra.2026.04.058'],['D4','10.1016/j.jpaa.2007.05.014'],['D7','10.1007/s00029-022-00822-x']])assert.ok(cards.find(card=>card.id===id).sourceHtml.includes(`href="https://doi.org/${doi}"`));
 assert.match(cards.find(card=>card.id==='W3').sourceHtml,/<a href="methods.html#conventions">Methods, Conventions<\/a>/);
 for(const id of ['P2','P4'])assert.match(cards.find(card=>card.id===id).sourceHtml,/<a href="methods.html#operations">Methods, Operations<\/a>/);
 assert.match(cards.find(card=>card.id==='D9').sourceHtml,/<a href="methods.html#complete-derived-invariant">docs\/METHODOLOGY.md<\/a>/);
 assert.match(cards.find(card=>card.id==='D1').sourceHtml,/<a href="https:\/\/arxiv.org\/abs\/1801.09659" title="arXiv:1801.09659">OPS<\/a>/);
 const checks=cards.find(card=>card.id==='C1').sourceHtml;
 assert.match(checks,/<a href="methods.html#checks-and-limits">Methods, Checks and limits<\/a>/);
 assert.match(checks,/<a href="https:\/\/github.com\/gjassoah\/gentle\/blob\/main\/validation\/VALIDATION-REPORT.md">validation report<\/a>/);
});

test('Help preserves its manual tables and every index entry resolves to exactly one card',()=>{
 assert.equal(helpIndex.length,32);assert.deepEqual(helpIndex.map(entry=>entry.id),cards.map(card=>card.id));
 assert.equal((helpHtml.match(/data-help-card="/g)||[]).length,32);
 assert.equal((helpHtml.match(/<table>/g)||[]).length,13);
 for(const entry of helpIndex){assert.ok(entry.group);assert.ok(entry.titleHtml);assert.ok(entry.sourceHtml);assert.ok(helpHtml.includes(`href="#card-${entry.id}" data-help-card="${entry.id}"`));}
 assert.match(helpHtml,/<h2[^>]*>Part 1\. Using the calculator<\/h2>/);
 assert.match(helpHtml,/<h2[^>]*>Part 2\. Definitions and theorems<\/h2>/);
 assert.doesNotMatch(helpHtml,/Integration note|current header says Guide|CARDS\.md|\$|Source passages/);
 assert.match(helpHtml,/<pre><code class="language-text">convention: left\nname: A zero relation/);
});

test('MathML protection retains chain bars inside a single Markdown table cell',()=>{
 const html=renderApprovedMarkdown('| Formula | Meaning |\n|---|---|\n| $a_0[a_1|a_2]$ | A chain. |');
 assert.equal((html.match(/<td>/g)||[]).length,2);assert.match(html,/<mo stretchy="false" lspace="0" rspace="0">\|<\/mo>/);
 assert.doesNotMatch(html,/\uE000|\uE001/);
});

test('approved content parsing fails closed for missing cards or broken Help references',async()=>{
 const [cardSource,helpSource]=await Promise.all([readFile('docs/cards/CARDS.md','utf8'),readFile('docs/cards/HELP.md','utf8')]);
 assert.throws(()=>parseCards(cardSource.replace('### W1 —','### X1 —').replace('**left**','**other**')),/Cannot parse/);
 assert.throws(()=>parseCards(cardSource.replace('### W1 —','## W1 —')),/Expected 32/);
 assert.throws(()=>parseHelp(helpSource.replace('(CARDS.md#w1)','(CARDS.md#w9)'),cards),/Unresolved/);
 assert.throws(()=>parseHelp(helpSource.replace(/\| \[W1\].+\n/,''),cards),/every card/);
});

test('only approved display fields ship, and every new browser module is listed in the build',async()=>{
 const generated=await readFile('src/cards-data.js','utf8'),build=await readFile('tools/build.mjs','utf8');
 for(const excluded of ['Source passages','Content for author review','Appendix. Terminology map','One easily computes the winding numbers','The elements of $\\\\overline'])assert.ok(!generated.includes(excluded),excluded);
 for(const file of ['src/cards.js','src/cards-data.js'])assert.ok(build.includes(`'${file}'`));
 assert.match(build,/await writeCardData\(\)/);
});

test('shipped WOFF2 retains its MATH table and the complete font license accompanies it',async()=>{
 const font=await readFile('assets/fonts/latinmodern-math.woff2');
 assert.equal(font.subarray(0,4).toString(),'wOF2');
 // Read the WOFF2 directory: MATH is known-tag index 31, so its name need not
 // occur literally in the compressed bytes. No font decoder is needed here.
 let offset=48,mathLength=0;
 const base128=()=>{let value=0;for(let i=0;i<5;i++){const byte=font[offset++];value=value*128+(byte&127);if(!(byte&128))return value;}throw Error('Invalid WOFF2 table length');};
 for(let i=0;i<font.readUInt16BE(12);i++){
  const flags=font[offset++],tag=flags&63,version=flags>>6;
  if(tag===63)offset+=4;
  const length=base128();if(tag===31)mathLength=length;
  if((tag===10||tag===11)?version!==3:version!==0)base128();
 }
 assert.ok(mathLength>1000);
 assert.equal(font.length,391676);
 for(const file of ['GUST-FONT-LICENSE.txt','README-Latin-Modern-Math.txt'])assert.ok((await readFile(`assets/fonts/${file}`,'utf8')).length>200);
});
