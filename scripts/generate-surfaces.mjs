import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {surfaceSVG,SURFACE_PRESET,SURFACE_DIAGRAM_VERSION} from '../src/surface-diagram.js';

// npm run surfaces -- --genus 12 --boundaries 12 --punctures 12
// SVGs are resolution-independent and require no rasterization dependency.
const options={...SURFACE_PRESET,output:'assets/surfaces'};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i].replace(/^--/,'');if(!Object.hasOwn(options,key)||process.argv[i+1]===undefined)throw Error('Use --genus N --boundaries N --punctures N --output DIRECTORY.');options[key]=key==='output'?process.argv[i+1]:Number(process.argv[i+1])}
if(!['genus','boundaries','punctures'].every(k=>Number.isInteger(options[k])&&options[k]>=0&&options[k]<=100))throw Error('Range maxima must be integers between 0 and 100.');
const count=(options.genus+1)*(options.boundaries+1)*(options.punctures+1);
if(count*2>20000)throw Error('Generate at most 20000 themed images per run; reduce the range.');
const directory=resolve(options.output);await mkdir(directory,{recursive:true});
for(let g=0;g<=options.genus;g++)for(let b=0;b<=options.boundaries;b++)for(let p=0;p<=options.punctures;p++)for(const theme of ['light','dark'])await writeFile(`${directory}/g${g}-b${b}-p${p}${theme==='dark'?'-dark':''}.svg`,surfaceSVG(g,b,p,theme));
await writeFile(`${directory}/manifest.json`,JSON.stringify({version:SURFACE_DIAGRAM_VERSION,genus:options.genus,boundaries:options.boundaries,punctures:options.punctures,count,imageCount:count*2,themes:['light','dark']},null,2)+'\n');
console.log(`Generated ${count*2} static SVG images (${count} surfaces, light and dark) in ${directory}.`);
