// JSON-lines-free batch bridge between validation Python and production JS.
// Input: {requests:[{request_id,presentation,characteristic,maxDegree}]}
// Output contains only basis-independent dimensions.
import {readFileSync} from 'node:fs';
import {Calculus} from '../src/engine.js';

const input=JSON.parse(readFileSync(0,'utf8'));
if(!Array.isArray(input.requests))throw Error('Expected a requests list.');
const ids=new Set();
const results=input.requests.map(({request_id,presentation,characteristic,maxDegree=3})=>{
 if(typeof request_id!=='string'||ids.has(request_id))throw Error('Request IDs must be distinct strings.');
 ids.add(request_id);
 if(!Number.isInteger(characteristic)||!Number.isInteger(maxDegree)||maxDegree<0||maxDegree>3)throw Error('Invalid bridge field or degree.');
 const calculus=new Calculus(presentation,characteristic);
 const rows=[];
 for(let degree=0;degree<=maxDegree;degree++)rows.push({
  degree,
  hh_homology:calculus.group('ho',degree).basis.length,
  hh_cohomology:calculus.group('co',degree).basis.length,
  cyclic_homology:calculus.cyclic(degree).basis.length
 });
 return {request_id,characteristic:Number(calculus.F.p),max_degree:maxDegree,algebra_dimension:calculus.A.paths.length,rows};
});
process.stdout.write(JSON.stringify({results}));
