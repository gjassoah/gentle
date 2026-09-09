#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {Calculus,ENGINE_VERSION} from '../src/engine.js';

function parse(argv){const out={characteristic:0,degree:1};for(let i=0;i<argv.length;i++){const key=argv[i];if(key==='--input')out.input=argv[++i];else if(key==='--case')out.caseName=argv[++i];else if(key==='--characteristic')out.characteristic=Number(argv[++i]);else if(key==='--degree')out.degree=Number(argv[++i]);else if(key==='--output')out.output=argv[++i];else throw Error('Unknown argument '+key)}return out}
const options=parse(process.argv.slice(2));
if(!Number.isInteger(options.degree)||options.degree<0||options.degree>3)throw Error('Certificate prototype supports degrees 0 through 3.');
let presentation;
if(options.input)presentation=JSON.parse(readFileSync(options.input,'utf8'));
else {const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));presentation=cases.find(q=>q.name===(options.caseName||'dual numbers'));if(!presentation)throw Error('Unknown curated case.');}
const calculus=new Calculus(presentation,options.characteristic),degree=options.degree,F=calculus.F;
const path=i=>{const p=calculus.A.paths[i];return {source:p.s,target:p.e,arrows:p.a}};
const basis=n=>calculus.space('ho',n).items.map(({t,p})=>({tensor:t.map(path),leading:path(p)}));
const rowMajor=(columns,rows)=>({rows,columns:columns.length,entries:Array.from({length:rows},(_,i)=>columns.map(column=>F.str(column[i])))});
const bN=calculus.differential('ho',degree),bNext=calculus.differential('ho',degree+1),group=calculus.group('ho',degree);
let commit='unavailable',dirty=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())}catch{}
const certificate={
 schema:'gentle-hh-homology-certificate-v1',
 metadata:{engine:ENGINE_VERSION,git_commit:commit,worktree_dirty:dirty,generated_at:new Date().toISOString()},
 algebra:presentation,
 characteristic:options.characteristic,
 degree,
 bases:{c_next:basis(degree+1),c:basis(degree),c_previous:basis(degree-1)},
 matrices:{b_next:rowMajor(bNext,calculus.space('ho',degree).items.length),b:rowMajor(bN,calculus.space('ho',degree-1).items.length)},
 claimed_dimension:group.basis.length,
 representatives:group.basis.map(vector=>vector.map(F.str))
};
const encoded=JSON.stringify(certificate,null,2)+'\n';
if(options.output)writeFileSync(options.output,encoded);else process.stdout.write(encoded);
