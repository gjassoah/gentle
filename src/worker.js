import {Calculus,ENGINE_VERSION} from './engine.js';
import {structure,ribbon,cohomologyFamilies,familyDimension,homologyFormula,ringPresentation} from './structure.js';
import {apply,reducer,quotient} from './linear.js';
import {derivedInvariant,compareDerived} from './derived.js';
let calculus;
function structuralData(characteristic){const s=structure(calculus.A);s.ribbon=ribbon(calculus.A);return {structure:s,ring:ringPresentation(calculus.A,characteristic),families:cohomologyFamilies(calculus.A,characteristic)}}
function formulaReport(degree,characteristic,limitation){const data=structuralData(characteristic),rows=[];for(let n=0;n<=degree;n++){const f=homologyFormula(calculus.A,characteristic,n);rows.push({degree:n,hhCo:familyDimension(data.families,n),hhHo:f.hh,hc:f.hc,deRham:f.deRham,connesRank:f.bRank,coBasis:null,hoBasis:null,cyBasis:null,coSize:'—',hoSize:'—',coBoundaryRank:'—',hoBoundaryRank:'—'})}return {...data,engine:ENGINE_VERSION,mode:'formulas',limitation,characteristic:String(calculus.F.p),maxDegree:degree,algebraDimension:calculus.A.paths.length,paths:calculus.A.paths.map(p=>p.label),rows,checks:['Gentle conditions and finite dimensionality','Prime characteristic validated','Ribbon half-edge pairing and surface Euler characteristic'],convention:'Dimensions use the paper’s complete-circuit formulas. Paths are written in left-to-right travel order. Bar representatives and their differential checks were not completed for this report.'}}
self.onmessage=({data})=>{const {id,type}=data;try{
 let result;
 if(type==='derived')result=derivedInvariant(data.quiver);
 else if(type==='compareDerived')result=compareDerived(data.left,data.right,data.leftCharacteristic,data.rightCharacteristic);
 else if(type==='init'){calculus=new Calculus(data.quiver,data.characteristic);result=true}
 else if(type==='compute'){
  if(!Number.isInteger(data.degree)||data.degree<0||data.degree>128)throw Error('Choose an integer degree from 0 to 128.');
  calculus=new Calculus(data.quiver,data.characteristic);
  try{result=calculus.report(data.degree,message=>self.postMessage({id,progress:message}))}catch(error){if(!/limit|exceeds/.test(error.message))throw error;calculus=new Calculus(data.quiver,data.characteristic);result=formulaReport(data.degree,data.characteristic,error.message)}
  if(result.mode!=='formulas'){
   Object.assign(result,structuralData(data.characteristic));result.mode='checked';
   for(const row of result.rows){const f=homologyFormula(calculus.A,data.characteristic,row.degree);if(f.hh!==row.hhHo||f.hc!==row.hc||familyDimension(result.families,row.degree)!==row.hhCo)throw Error('Paper formula cross-check failed in degree '+row.degree);row.deRham=f.deRham;row.connesRank=f.bRank}
   for(let n=0;n<data.degree;n++){
    const source=calculus.group('ho',n),target=calculus.group('ho',n+1),F=calculus.F;
    const B=source.basis.map(v=>target.project(apply(calculus.connes(n),v,calculus.space('ho',n+1).items.length,F)));
    const R=reducer(F);B.forEach(v=>R.add(v));if(R.pivots.length!==result.rows[n].connesRank)throw Error('Connes rank formula cross-check failed.');
    result.rows[n].connesMatrix=B.map(v=>v.map(F.str));
    const incoming=n?result.rows[n-1].connesMatrix.map(v=>v.map(F.from)):[],dr=quotient(B,incoming,source.basis.length,F);
    if(dr.basis.length!==result.rows[n].deRham)throw Error('de Rham formula cross-check failed.');result.rows[n].deRhamBasis=dr.basis.map(v=>v.map(F.str));
   }
   result.checks.push('All displayed dimensions agree with the paper’s circuit formulas','Connes ranks and de Rham bases agree where adjacent groups are displayed','Ribbon half-edge pairing and surface Euler characteristic');
  }
 }
 else if(!calculus)throw Error('Compute this algebra first.');
 else if(type==='operation')result=calculus.operation(data.operation,data.p,data.left,data.q,data.right);
 else if(type==='lieStructure')result=calculus.lieStructure();
 else if(type==='formula'){if(!Number.isSafeInteger(data.degree)||data.degree<0||data.degree>100000)throw Error('Choose a formula degree from 0 to 100000.');result={...homologyFormula(calculus.A,calculus.F.p,data.degree),co:familyDimension(cohomologyFamilies(calculus.A,calculus.F.p),data.degree),degree:data.degree}}
 else if(type==='group'){const g=calculus.group(data.kind,data.degree,data.model||'bar');result={degree:data.degree,kind:data.kind,dimension:g.basis.length,basis:calculus.describeBasis(data.kind,data.degree,data.model||'bar')}}
 else throw Error('Unknown computation.');
 self.postMessage({id,result});
 }catch(error){self.postMessage({id,error:error.message})}};
