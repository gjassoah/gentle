import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {themeControls} from '../src/theme.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source='https://github.com/gjassoah/gentle/blob/main/';
function linkURL(url){
 if(/^(?:docs\/)?METHODOLOGY\.md(?:#.*)?$/.test(url))return 'methods.html'+(url.includes('#')?url.slice(url.indexOf('#')):'');
 if(/^README\.md(?:#.*)?$/.test(url))return url;
 if(/^(?:https?:|mailto:|#)/i.test(url))return url;
 if(/^[a-z][a-z\d+.-]*:/i.test(url)||url.startsWith('//'))return '#';
 return source+url.replace(/^\.\//,'');
}
export function inline(text){
 // x_{…} and x^{…} give subscripts and superscripts, so that indices in formulas read as in print.
 const tokens=/(`+)([^`]*?)\1|\[([^\]]+)\]\(([^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|_\{([^{}]+)\}|\^\{([^{}]+)\}/g;let out='',last=0;
 for(const m of text.matchAll(tokens)){out+=esc(text.slice(last,m.index));out+=m[1]?`<code>${esc(m[2])}</code>`:m[3]?`<a href="${esc(linkURL(m[4]))}">${inline(m[3])}</a>`:m[5]?`<strong>${inline(m[5])}</strong>`:m[6]?`<em>${inline(m[6])}</em>`:m[7]?`<sub>${inline(m[7])}</sub>`:`<sup>${inline(m[8])}</sup>`;last=m.index+m[0].length}
 return out+esc(text.slice(last));
}
export function markdown(text){
 const lines=text.replace(/\r/g,'').split('\n'),out=[],ids=new Map();let i=0;
 const list=s=>s.match(/^\s*(?:(\d+)\.|([-+*]))\s+(.+)$/),cells=s=>s.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(s=>inline(s.trim().replace(/\\\|/g,'|'))),table=s=>/^\s*\|?\s*:?-{3,}:?\s*\|/.test(s);
 const boundary=n=>!lines[n]?.trim()||/^#{1,6} |^```/.test(lines[n])||list(lines[n])||table(lines[n+1]||'');
 while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue}
  if(line.startsWith('```')){const lang=line.slice(3).trim(),code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;out.push(`<pre><code${lang?` class="language-${esc(lang)}"`:''}>${esc(code.join('\n'))}</code></pre>`);continue}
  const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){const base=heading[2].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-'),n=ids.get(base)||0;ids.set(base,n+1);out.push(`<h${heading[1].length} id="${esc(base+(n?`-${n}`:''))}">${inline(heading[2])}</h${heading[1].length}>`);i++;continue}
  if(table(lines[i+1]||'')){const headers=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(`<tr>${cells(lines[i++]).map(x=>`<td>${x}</td>`).join('')}</tr>`);out.push(`<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);continue}
  const item=list(line);if(item){const ordered=!!item[1],tag=ordered?'ol':'ul',items=[];while(i<lines.length){const m=list(lines[i]);if(!m||!!m[1]!==ordered)break;let content=m[3];i++;while(i<lines.length&&lines[i].trim()&&!boundary(i)){content+=' '+lines[i++].trim()}items.push(`<li>${inline(content)}</li>`)}out.push(`<${tag}${ordered&&item[1]!=='1'?` start="${item[1]}"`:''}>${items.join('')}</${tag}>`);continue}
  const p=[line];i++;while(i<lines.length&&!boundary(i))p.push(lines[i++]);out.push(`<p>${inline(p.join(' '))}</p>`);
 }
 return out.join('\n');
}
export async function writeDocs(directory='.'){
 await mkdir(directory,{recursive:true});
 // Remove the obsolete generated page from repeated builds and local docs runs.
 await rm(`${directory}/about.html`,{force:true});
 for(const [file,input,title,description] of [['methods.html','docs/METHODOLOGY.md','Methods & scope · gentle','Mathematical methods, conventions, coverage and limitations of the gentle invariant calculator.']]){
  const body=markdown(await readFile(input,'utf8'));
  await writeFile(`${directory}/${file}`,`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${description}"><meta name="theme-color" content="#f4f6f7" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#12181c" media="(prefers-color-scheme: dark)"><title>${esc(title)}</title><link rel="stylesheet" href="src/style.css"></head><body><header class="topbar"><a class="brand" href="./">gentle <span class="brand-sub">Back to the calculator</span></a><div class="header-actions">${themeControls}</div></header><main class="document-page">${body}</main><script type="module">import {initTheme} from './src/theme.js';initTheme();</script></body></html>\n`);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await writeDocs();console.log('Documentation written to methods.html.');}
