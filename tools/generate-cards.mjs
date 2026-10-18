import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {inline,markdown} from './markdown.mjs';
import {mathExpressions,texMathML} from './tex-mathml.mjs';

const plain=html=>html.replace(/<[^>]+>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[s]));
function normalizedLinks(text){
 return text.replace(/\]\((?:\.\.\/)+(?:docs\/)?METHODOLOGY\.md(#[^)]*)?\)/g,(_,anchor='')=>`](docs/METHODOLOGY.md${anchor})`)
  .replace(/\]\(\.\.\/\.\.\/validation\/([^)]*)\)/g,'](validation/$1)')
  .replace(/\]\(CARDS\.md#([a-z]\d+)\)/g,(_,id)=>`](#card-${id.toUpperCase()})`);
}
function protectMath(text){
 const expressions=[];let fenced=false;
 const body=text.replace(/\r/g,'').split('\n').map(line=>{
  if(line.startsWith('```')){fenced=!fenced;return line;}if(fenced)return line;
  // The two Unicode Lambda labels in the approved prose have the same MathML
  // typography as their TeX counterparts; no wording or numeric value changes.
  line=line.replace(/Λ([₁₂])/g,(_,index)=>`$\\Lambda_${index==='₁'?1:2}$`);
  const pieces=line.split('$');if(pieces.length%2===0)throw Error(`Unmatched $ in ${line}`);
  for(let i=1;i<pieces.length;i+=2){const index=expressions.length;expressions.push(texMathML(pieces[i]));pieces[i]=`\uE000${index}\uE001`;}
  return pieces.join('');
 }).join('\n');
 // Punctuation directly after an expression stays on its line.
 return {body,restore:html=>html.replace(/\uE000(\d+)\uE001([.,;:)]*)/g,(_,index,punctuation)=>punctuation?`<span class="math-run">${expressions[Number(index)]}${punctuation}</span>`:expressions[Number(index)])};
}
export function renderApprovedMarkdown(text,{fragment=false}={}){
 const {body,restore}=protectMath(normalizedLinks(text));
 return restore((fragment?inline:markdown)(body)).replace(/<a href="#card-([A-Z]\d+)">/g,'<a href="#card-$1" data-help-card="$1">');
}
function sourceLinks(id,source){
 // Add destinations to the source words already approved by the author. The
 // visible citation text and locators remain exactly the source document's.
 if(id==='D1')source=source.replace(/\bOPS\b/,'[OPS](https://arxiv.org/abs/1801.09659)');
 if(id==='P2'||id==='P4')source=source.replace('Methods, Operations','[Methods, Operations](docs/METHODOLOGY.md#operations)');
 if(id==='D9')source=source.replace('docs/METHODOLOGY.md','[docs/METHODOLOGY.md](docs/METHODOLOGY.md#complete-derived-invariant)');
 return renderApprovedMarkdown(source,{fragment:true}).replace('<a href="https://arxiv.org/abs/1801.09659">','<a href="https://arxiv.org/abs/1801.09659" title="arXiv:1801.09659">');
}
export function parseCards(text){
 const headings=[...text.matchAll(/^### ([A-Z]\d+) — (.+)$/gm)],cards=[];
 if(headings.length!==32)throw Error(`Expected 32 approved cards, found ${headings.length}`);
 for(let i=0;i<headings.length;i++){
  const heading=headings[i],id=heading[1],end=headings[i+1]?.index??text.length;
  const block=text.slice(heading.index+heading[0].length,end).split('**Source passages**')[0].trim();
  const fields=block.match(/^\*\*Kind:\*\* (.+?)\. \*\*Shown:\*\* (.+?)\n\n\*\*Source:\*\* ([\s\S]+?)\n\n\*\*left\*\*\n\n([\s\S]+?)\n\n\*\*right\*\*\n\n([\s\S]+?)\n\n\*\*In this application:\*\* ([\s\S]+)$/);
  if(!fields)throw Error(`Cannot parse approved metadata or versions for ${id}`);
  const [,kind,shown,source,left,right,application]=fields;
  const group=[...text.slice(0,heading.index).matchAll(/^## (.+)$/gm)].at(-1)?.[1];
  const titleHtml=renderApprovedMarkdown(heading[2],{fragment:true}),sourceHtml=sourceLinks(id,source);
  cards.push({id,title:plain(titleHtml),titleHtml,kind,group,shown:shown.replace(/\.$/,''),shownHtml:renderApprovedMarkdown(shown.replace(/\.$/,''),{fragment:true}),sourceText:plain(sourceHtml),sourceHtml,leftHtml:renderApprovedMarkdown(left),rightHtml:renderApprovedMarkdown(right),applicationHtml:renderApprovedMarkdown(application,{fragment:true})});
 }
 if(new Set(cards.map(card=>card.id)).size!==cards.length)throw Error('Duplicate card identifier');
 return cards;
}
export function parseHelp(text,cards){
 const approved=text.split(/^## Integration note — excluded from Help text\s*$/m)[0].trim();
 const helpIndex=[];let group;
 for(const line of approved.split('\n')){
  if(line.startsWith('### '))group=line.slice(4);
  const row=line.match(/^\| \[([A-Z]\d+)\]\(CARDS\.md#([a-z]\d+)\) \| (.+) \| (.+) \|$/);
  if(!row)continue;
  const [,id,anchor,title,source]=row;
  if(id.toLowerCase()!==anchor||!cards.some(card=>card.id===id))throw Error(`Unresolved Help entry ${id}`);
  helpIndex.push({id,group,titleHtml:renderApprovedMarkdown(title,{fragment:true}),sourceHtml:renderApprovedMarkdown(source,{fragment:true})});
 }
 if(helpIndex.length!==cards.length||new Set(helpIndex.map(entry=>entry.id)).size!==cards.length)throw Error('Help must index every card exactly once');
 return {helpHtml:renderApprovedMarkdown(approved),helpIndex};
}
export async function generateCardData(){
 const [cardSource,helpSource]=await Promise.all([readFile('docs/cards/CARDS.md','utf8'),readFile('docs/cards/HELP.md','utf8')]);
 // Validate the entire source vocabulary, including verification material. Only
 // the approved statement fields and Help body enter the generated module.
 for(const source of [cardSource,helpSource])for(const expression of mathExpressions(source))texMathML(expression);
 const cards=parseCards(cardSource),{helpHtml,helpIndex}=parseHelp(helpSource,cards);
 return '// Generated by tools/generate-cards.mjs from the approved card and Help content.\n// Regenerate with npm run cards; verification passages are intentionally excluded.\n'+
  `export const cards = ${JSON.stringify(cards,null,2)};\n\nexport const helpHtml = ${JSON.stringify(helpHtml)};\n\nexport const helpIndex = ${JSON.stringify(helpIndex,null,2)};\n`;
}
export async function writeCardData({check=false}={}){
 const generated=await generateCardData(),path='src/cards-data.js';
 if(check){if(await readFile(path,'utf8')!==generated)throw Error(`${path} is stale; run npm run cards`);}
 else await writeFile(path,generated);
 return generated;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const check=process.argv.includes('--check');await writeCardData({check});console.log(check?'Card and Help data match the approved content.':'Card and Help data written to src/cards-data.js.');
}
