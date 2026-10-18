import {writeDocs} from './markdown.mjs';
import {writeCardData} from './generate-cards.mjs';
import {mkdir,copyFile,cp,readFile,readdir,writeFile} from 'node:fs/promises';
const files=['index.html','src/app.js','src/style.css','src/linear.js','src/engine.js','src/structure.js','src/worker.js','src/export.js','src/examples.js','src/derived.js','src/surface-diagram.js','src/presentation.js','src/share.js','src/theme.js','src/mathml.js','src/canvas.js','src/convention.js','src/cards.js','src/cards-data.js'];
await mkdir('dist/src',{recursive:true});
const app=await readFile('src/app.js','utf8'),pkg=JSON.parse(await readFile('package.json','utf8'));
if(app.match(/const VERSION='([^']+)'/)?.[1]!==pkg.version)throw Error('App and package versions differ');

await writeCardData();
await writeDocs('dist');
await Promise.all(files.map(path=>copyFile(path,`dist/${path}`)));
// The published site keeps METHODOLOGY.md and README.md at its root.
await copyFile('docs/METHODOLOGY.md','dist/METHODOLOGY.md');
await writeFile('dist/README.md',(await readFile('README.md','utf8')).replaceAll('docs/METHODOLOGY.md','METHODOLOGY.md'));
await cp('assets','dist/assets',{recursive:true});
// Browsers may keep modules cached across a release; tag every relative module import in dist/ with the
// version so that a new app.js never runs against old modules. The source files are not changed.
for(const path of ['dist/methods.html',...(await readdir('dist/src')).filter(f=>f.endsWith('.js')).map(f=>'dist/src/'+f)]){
 const text=await readFile(path,'utf8');
 await writeFile(path,text.replace(/((?:\bfrom|\bimport\(|new URL\()\s*)(['"])(\.\/(?:src\/)?[^'"?]+\.js)\2/g,(_,head,quote,spec)=>`${head}${quote}${spec}?v=${pkg.version}${quote}`));
}
// Every module the pages load must ship in dist/ with a .js extension: the server sends .mjs files as
// application/octet-stream, which browsers refuse for module scripts.
for(const page of ['dist/index.html','dist/methods.html',...(await readdir('dist/src')).filter(f=>f.endsWith('.js')).map(f=>'dist/src/'+f)]){
 const text=await readFile(page,'utf8'),base=page.slice(0,page.lastIndexOf('/')+1);
 for(const [,spec] of text.matchAll(/(?:from|import\(|new URL\(|src=)\s*['"](\.{1,2}\/[^'"?]+)/g)){
  if(spec.endsWith('.mjs'))throw Error(`${page} loads ${spec}; use a .js module`);
  if(spec.endsWith('.js'))await readFile(new URL(spec,'file://'+process.cwd()+'/'+base)).catch(()=>{throw Error(`${page} loads ${spec}, which is missing from dist/`)});
 }
}
console.log('Static application written to dist/. Upload its contents to a static host.');
