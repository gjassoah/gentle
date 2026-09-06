import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {surfaceSVG,surfaceLayout,surfaceAssetPath,SURFACE_PRESET} from '../src/surface-diagram.js';
import {surfaceComponents} from '../src/structure.js';
import {examples} from '../src/examples.js';
test('standard surface diagrams contain exactly the required handles, curves, boundaries and punctures',()=>{
 for(const [g,b,p] of [[0,0,0],[0,1,0],[0,1,1],[1,1,0],[2,2,2],[8,8,8],[12,1,19]]){
  const svg=surfaceSVG(g,b,p);
  for(const [attribute,count] of [['handle',g],['boundary',b],['puncture',p]])assert.equal((svg.match(new RegExp(`data-${attribute}=`, 'g'))||[]).length,count);
  assert.equal((svg.match(/data-curve="alpha"/g)||[]).length,g);assert.equal((svg.match(/data-curve="beta"/g)||[]).length,g);
  assert.ok(!/NaN|undefined|Infinity/.test(svg));assert.match(svg,/Marked points are omitted/);
 }
 assert.throws(()=>surfaceSVG(-1,1,0),/integers/);assert.throws(()=>surfaceSVG(0,1.5,0),/integers/);
});
test('surface parameters distinguish ordinary boundaries, punctures and disconnected components',()=>{
 assert.deepEqual(surfaceComponents(examples.dual),[{genus:0,boundaries:1,punctures:1,vertices:['1']}]);
 assert.deepEqual(surfaceComponents(examples.aps1),[{genus:1,boundaries:1,punctures:0,vertices:['1','2','3']}]);
 const q=structuredClone(examples.aps1);q.vertices.push({id:'isolated',label:'isolated'});
 assert.equal(surfaceComponents(q).length,2);assert.equal(surfaceComponents(q)[1].genus,0);
});
test('pre-generated assets and manifest agree with the generator',()=>{
 const manifest=JSON.parse(readFileSync('assets/surfaces/manifest.json','utf8'));
 assert.equal(manifest.count,(manifest.genus+1)*(manifest.boundaries+1)*(manifest.punctures+1));
 assert.deepEqual(manifest.themes,['light','dark']);assert.equal(manifest.imageCount,2*manifest.count);
 for(const theme of ['light','dark'])for(const [g,b,p] of [[0,0,0],[0,1,1],[2,2,2],[SURFACE_PRESET.genus,SURFACE_PRESET.boundaries,SURFACE_PRESET.punctures]])assert.equal(readFileSync(surfaceAssetPath(g,b,p,theme),'utf8'),surfaceSVG(g,b,p,theme));
 assert.ok(surfaceLayout(8,8,8).width>surfaceLayout(2,2,2).width);
});
test('genus-zero features are centered between mirrored caps, and themes use app colors',()=>{
 const {width,rightStart,rightWidth}=surfaceLayout(0,2,3);
 assert.equal(rightStart,90);assert.equal(rightStart+rightWidth,width-90);
 assert.equal(rightStart+rightWidth/2,width/2);
 assert.match(surfaceSVG(0,1,1),/C 62.386 280 40 262.091 40 240 C 40 217.909 62.386 200 90 200 Z/);
 assert.match(surfaceSVG(2,2,2),/C 93.726 325 40 286.944 40 240 C 40 193.056 93.726 155 160 155 Z/);
 assert.match(surfaceSVG(0,1,1,'light'),/#b4cdbb/);
 assert.match(surfaceSVG(0,1,1,'dark'),/#1d2521/);
 assert.ok(!surfaceSVG(2,2,2,'dark').includes('fill="#fff"'));
});
