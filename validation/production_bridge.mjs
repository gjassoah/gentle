// JSON-lines-free batch bridge between validation Python and production JS.
// Input: {requests:[{request_id,presentation,characteristic,maxDegree}]}
// Product requests exchange canonical paths, never internal coordinate indices.
import {readFileSync} from 'node:fs';
import {Calculus} from '../src/engine.js';

const input=JSON.parse(readFileSync(0,'utf8'));
if(!Array.isArray(input.requests))throw Error('Expected a requests list.');

const ownKeys=(value,keys,context)=>{
 if(value===null||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error(`Invalid ${context} object.`);
};
const pathKey=path=>JSON.stringify([path.source,path.target,path.arrows]);
const itemKey=term=>JSON.stringify([term.input.map(pathKey),pathKey(term.output)]);
const pathValue=path=>({source:path.s,target:path.e,arrows:path.a.slice()});
const degreeOf=({operation,p,q})=>operation==='cup'?p+q:operation==='cap'?q-p:p+q-1;
const kindOf=operation=>operation==='cap'?'ho':'co';

function productContext(calculus){
 const paths=calculus.A.paths.map(pathValue),knownPaths=new Set(paths.map(pathKey)),spaces=new Map();
 const space=(kind,degree)=>{
  const key=`${kind}:${degree}`;
  if(!spaces.has(key)){
   const terms=calculus.space(kind,degree).items.map(item=>({input:item.t.map(i=>paths[i]),output:paths[item.p]}));
   spaces.set(key,{terms,index:new Map(terms.map((term,i)=>[itemKey(term),i]))});
  }
  return spaces.get(key);
 };
 const readPath=path=>{
  ownKeys(path,['source','target','arrows'],'canonical path');
  if(typeof path.source!=='string'||typeof path.target!=='string'||!Array.isArray(path.arrows)||path.arrows.some(id=>typeof id!=='string')||!knownPaths.has(pathKey(path)))throw Error('Unknown canonical path.');
 };
 const readVector=(terms,kind,degree)=>{
  if(!Array.isArray(terms))throw Error('Expected a canonical term list.');
  const target=space(kind,degree),seen=new Set(),vector=target.terms.map(()=>calculus.F.z);
  for(const term of terms){
   ownKeys(term,['input','output','coefficient'],'canonical term');
   if(!Array.isArray(term.input)||term.input.length!==degree)throw Error('Canonical tensor degree mismatch.');
   term.input.forEach(path=>{readPath(path);if(!path.arrows.length)throw Error('Normalized tensors cannot contain idempotents.');});
   readPath(term.output);
   const key=itemKey(term),index=target.index.get(key);
   if(index===undefined)throw Error('Canonical term does not belong to the requested space.');
   if(seen.has(key))throw Error('Duplicate canonical term.');
   seen.add(key);
   if(typeof term.coefficient!=='string'||!/^[-+]?\d+(?:\/[-+]?\d+)?$/.test(term.coefficient))throw Error('Expected an exact rational coefficient string.');
   const denominator=BigInt(term.coefficient.split('/')[1]??'1');
   if(denominator===0n||(calculus.F.p!==0n&&denominator%calculus.F.p===0n))throw Error('Coefficient denominator is not invertible in the field.');
   vector[index]=calculus.F.from(term.coefficient);
  }
  return vector;
 };
 const writeVector=(vector,kind,degree)=>{
  const target=space(kind,degree);
  if(vector.length!==target.terms.length)throw Error('Product returned a vector with the wrong dimension.');
  return vector.flatMap((coefficient,i)=>calculus.F.isZero(coefficient)?[]:[{...target.terms[i],coefficient:calculus.F.str(coefficient)}])
   .sort((a,b)=>itemKey(a)<itemKey(b)?-1:itemKey(a)>itemKey(b)?1:0);
 };
 return {readVector,writeVector};
}

// Elimination uses the selected exact field, independently of the production
// quotient's reduction machinery. Each accepted column contributes one rank.
function spanReducer(F,dimension){
 const pivots=new Map();
 return {get rank(){return pivots.size;},add(column){
  if(column.length!==dimension)throw Error('Product coordinate dimension mismatch.');
  const v=column.slice();
  for(let i=0;i<dimension;i++){
   if(F.isZero(v[i]))continue;
   if(pivots.has(i)){
    const old=pivots.get(i),factor=v[i];
    for(let j=i;j<dimension;j++)v[j]=F.add(v[j],F.neg(F.mul(factor,old[j])));
   }else{
    const factor=v[i];
    for(let j=i;j<dimension;j++)v[j]=F.div(v[j],factor);
    pivots.set(i,v);return true;
   }
  }
  return false;
 }};
}

function productRequest(request,calculus){
 ownKeys(request,['request_id','presentation','characteristic','type','cases'],'product request');
 if(![0,2,3,5].includes(request.characteristic))throw Error('Unsupported product characteristic.');
 if(!Array.isArray(request.cases))throw Error('Expected product cases.');
 const ids=new Set(),context=productContext(calculus),spans=new Map(),ranks=request.type==='productRanks';
 const cases=request.cases.map(spec=>{
  ownKeys(spec,ranks?['case_id','operation','p','q']:['case_id','operation','p','q','left','right'],'product case');
  if(typeof spec.case_id!=='string'||ids.has(spec.case_id))throw Error('Product case IDs must be distinct strings.');
  ids.add(spec.case_id);
  if(!(ranks?['cup','bracket','cap']:['cup','insertion','bracket','cap']).includes(spec.operation))throw Error('Unknown product operation.');
  for(const degree of [spec.p,spec.q])if(!Number.isInteger(degree)||degree<0||degree>3)throw Error('Invalid product input degree.');
  const degree=degreeOf(spec),kind=kindOf(spec.operation),{p,q,operation,case_id}=spec;
  if(degree>3||(ranks&&degree<0))throw Error('Invalid product output degree.');
  const row={case_id,operation,p,q,degree,kind};
  if(!ranks){
   const f=context.readVector(spec.left,'co',p),g=context.readVector(spec.right,kindOf(operation),q);
   return {...row,terms:context.writeVector(calculus[operation](p,f,q,g),kind,degree)};
  }
  const left=calculus.group('co',p),right=calculus.group(kindOf(operation),q),target=calculus.group(kind,degree),reduction=spanReducer(calculus.F,target.basis.length);
  const key=`${operation}:${degree}`;
  if(!spans.has(key))spans.set(key,{operation,degree,kind,reduction:spanReducer(calculus.F,target.basis.length)});
  const aggregate=spans.get(key).reduction;
  for(const f of left.basis)for(const g of right.basis){
   const coordinates=target.project(calculus[operation](p,f,q,g));
   reduction.add(coordinates);aggregate.add(coordinates);
  }
  return {...row,left_dimension:left.basis.length,right_dimension:right.basis.length,target_dimension:target.basis.length,rank:reduction.rank};
 });
 const result={request_id:request.request_id,type:request.type,characteristic:Number(calculus.F.p),algebra_dimension:calculus.A.paths.length,cases};
 if(ranks)result.spans=[...spans.values()].sort((a,b)=>a.operation<b.operation?-1:a.operation>b.operation?1:a.degree-b.degree)
  .map(({operation,degree,kind,reduction})=>({operation,degree,kind,dimension:reduction.rank}));
 return result;
}

const ids=new Set();
const results=input.requests.map(request=>{
 if(request===null||typeof request!=='object'||Array.isArray(request))throw Error('Invalid request.');
 const {request_id,presentation,characteristic,maxDegree=3,type}=request;
 if(typeof request_id!=='string'||ids.has(request_id))throw Error('Request IDs must be distinct strings.');
 ids.add(request_id);
 if(!Number.isInteger(characteristic)||!Number.isInteger(maxDegree)||maxDegree<0||maxDegree>3)throw Error('Invalid bridge field or degree.');
 const calculus=new Calculus(presentation,characteristic);
 if(type==='productValues'||type==='productRanks')return productRequest(request,calculus);
 if(type!==undefined)throw Error('Unknown bridge request type.');
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
