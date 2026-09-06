import {mkdir,copyFile,cp} from 'node:fs/promises';
const files=['index.html','README.md','METHODOLOGY.md','src/app.js','src/style.css','src/linear.js','src/engine.js','src/structure.js','src/worker.js','src/export.js','src/examples.js','src/derived.js','src/surface-diagram.js'];
await mkdir('dist/src',{recursive:true});
await Promise.all(files.map(path=>copyFile(path,`dist/${path}`)));
await cp('assets','dist/assets',{recursive:true});
console.log('Static application written to dist/. Upload its contents to your static host.');
