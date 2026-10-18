import {coordinateTerms,invariantFormula} from './convention.js';
// Native MathML Core only. Every token, including labels, is escaped here.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Inline fences keep their text size, and a solidus is tight, as in TeX; stretchy fences take wide glyph variants.
// A vertical bar and a solidus are ordinary symbols without spacing in TeX.
const FENCES=new Set(['(',')','[',']','{','}','⟨','⟩']);
export const operatorAttributes=value=>FENCES.has(value)?' stretchy="false"':value==='|'||value==='‖'?' stretchy="false" lspace="0" rspace="0"':value==='/'?' lspace="0" rspace="0"':'';
const token=(tag,value)=>`<${tag}${tag==='mo'?operatorAttributes(String(value)):''}>${escape(value)}</${tag}>`;
const mi=value=>token('mi',value),mn=value=>token('mn',value),mo=value=>token('mo',value);
const row=(...items)=>`<mrow>${items.join('')}</mrow>`;
const sub=(base,index)=>`<msub>${base}${index}</msub>`;
const sup=(base,index)=>`<msup>${base}${index}</msup>`;
// A minus that starts a group or follows an opening fence, a separator or a relation is a sign, as in TeX.
export const prefixMinus=html=>html.replace(/(^|<mrow>|<msub>|<msup>|<msubsup>|<mfrac>|<mo[^>]*>[([,=<>≤≥∈∉≠→+−±]<\/mo>)<mo>−<\/mo>/g,'$1<mo form="prefix">−</mo>');
const math=body=>`<math xmlns="http://www.w3.org/1998/Math/MathML">${prefixMinus(invariantFormula(body))}</math>`;
function index(value){const s=String(value),sum=s.match(/^([a-zA-Z])([+−-])(\d+)$/);return /^\d+$/.test(s)?mn(s):sum?row(mi(sum[1]),mo(sum[2]==='-'?'−':sum[2]),mn(sum[3])):mi(s)}
function basis(kind,n,i){return kind==='co'?`<msubsup>${mi('h')}${index(i)}${index(n)}</msubsup>`:sub(mi(kind==='cyclic'?'c':'z'),row(index(n),mo(','),index(i)))}
function groupBody(kind,n,algebra=true){const base=mi(kind==='cyclic'?'HC':'HH'),script=kind==='dr'?`<msubsup>${mi('H')}${index(n)}${token('mtext','dR')}</msubsup>`:kind==='co'?sup(base,index(n)):sub(base,index(n));return row(script,algebra?row(mo('('),mi('A'),mo(')')):'')}
function scalarBody(value){const [a,b]=String(value).split('/');return b?`<mfrac>${mn(a)}${mn(b)}</mfrac>`:mn(a)}
function combination(cs,kind,n){const parts=[];coordinateTerms(cs).forEach(({index:i,negative,coefficient:c})=>{if(negative)parts.push(mo('−'));else if(parts.length)parts.push(mo('+'));parts.push(row(c==='1'?'':scalarBody(c),basis(kind,n,i+1)))});return row(...(parts.length?parts:[mn(0)]))}
export const className=(kind,n,i)=>math(basis(kind,n,i));
export const formula=(cs,kind,n)=>math(combination(cs,kind,n));
export const group=(kind,n,algebra=true)=>math(groupBody(kind,n,algebra));
export const groupIsomorphism=(kind,n,d)=>math(row(groupBody(kind,n),mo('≅'),sup(mi('k'),mn(d))));
export const zeroGroup=(kind,n)=>math(row(groupBody(kind,n),mo('='),mn(0)));
export const dimension=(kind,n='n')=>math(row(token('mtext','dim'),'<mspace width="0.22em"/>',groupBody(kind,n,false)));
export const connesRank=(n='n')=>math(row(token('mtext','rank'),'<mspace width="0.22em"/>',sub(mi('B'),index(n))));
export const connesEquation=(n,i,cs)=>math(row(mi('B'),mo('('),basis('ho',n,i),mo(')'),mo('='),combination(cs,'ho',n+1)));
export const connesMap=()=>math(row(mi('B'),mo(':'),groupBody('ho','n'),mo('→'),groupBody('ho','n+1')));
export const phi=(n,m,multiplicity)=>math(row(sub(mi('φ'),mi('A')),mo('('),index(n),mo(','),index(m),mo(')'),mo('='),mn(multiplicity)));
export const centerIdentity=(centerFirst=false)=>{const center=row(mi('Z'),mo('('),mi('A'),mo(')')),hh=groupBody('co',0);return math(row(centerFirst?center:hh,mo('='),centerFirst?hh:center))};
export const algebraName=()=>math(mi('A'));
export const dimensionOfAlgebra=()=>math(row(token('mtext','dim'),'<mspace width="0.22em"/>',mi('A')));
export const globalDimensionLabel=()=>math(row(token('mtext','gl.dim'),'<mspace width="0.22em"/>',mi('A')));
export const groundField=characteristic=>math(String(characteristic)==='0'?mi('ℚ'):sub(mi('𝔽'),mn(characteristic)));
export const deRhamDefinition=()=>math(row(groupBody('dr','n',false),mo('='),token('mtext','ker'),sub(mi('B'),mi('n')),mo('/'),token('mtext','im'),sub(mi('B'),index('n−1'))));
export const degreeHeader=()=>math(mi('n'));

// Interface formulas use a small, explicit notation grammar. Only application-
// authored expressions enter this parser; quiver labels use label()/pathBody().
const subscripts={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₚ':'p','ₙ':'n','₊':'+','ₖ':'k','₋':'−','₌':'=','ᵢ':'i'};
const superscripts={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'−','ᵖ':'p','ᑫ':'q'};
function expressionBody(input){
 const chars=Array.from(String(input));let at=0;
 const script=()=>{
  if(chars[at]==='('||chars[at]==='{'){const close=chars[at++]==='('?')':'}';return parse(close)}
  return atom();
 };
 const atom=()=>{
  const c=chars[at++];if(c===undefined)throw Error('Incomplete interface math expression.');
  if(c==='Σ'||c==='∑')return '<mo largeop="true" movablelimits="true">∑</mo>';
  if(c==='{')return parse('}');
  if(c==='('||c==='[')return row(mo(c),parse(c==='('?')':']'),mo(c==='('?')':']'));
  if(/[0-9]/.test(c)){let n=c;while(/[0-9]/.test(chars[at]||'')&&at<chars.length)n+=chars[at++];return mn(n)}
  if(/[A-Za-zℚ𝔽ℬΓγφΣ]/u.test(c)||/\p{Letter}/u.test(c)){
   let name=c;
   if(c==='H'&&['H','C'].includes(chars[at]))name+=chars[at++];
   else if(/[A-Za-z]/.test(c))for(const word of ['rank','coker','ker','dim','mod','Arf','gcd','char','dR'])if((c+chars.slice(at,at+word.length-1).join(''))===word){name=word;at+=word.length-1;break}
   return ['rank','coker','ker','dim','mod','Arf','gcd','char','dR'].includes(name)?token('mtext',name):mi(name);
  }
  return mo(c==='-'?'−':c);
 };
 const parse=close=>{
  const parts=[];
  while(at<chars.length&&chars[at]!==close){
   if(/\s/.test(chars[at])){at++;continue}
   let base=atom(),lo=null,hi=null;
   while(at<chars.length){
    if(chars[at]==='_'){at++;lo=script()}
    else if(chars[at]==='^'){at++;hi=script()}
    else if(subscripts[chars[at]]){let value='';while(subscripts[chars[at]])value+=subscripts[chars[at++]];lo=expressionBody(value)}
    else if(superscripts[chars[at]]){let value='';while(superscripts[chars[at]])value+=superscripts[chars[at++]];hi=expressionBody(value)}
    else break;
   }
   parts.push(lo&&hi?`<msubsup>${base}${lo}${hi}</msubsup>`:lo?sub(base,lo):hi?sup(base,hi):base);
  }
  if(close){if(chars[at]!==close)throw Error('Unclosed interface math expression.');at++}
  return row(...parts);
 };
 return parse();
}
export const expression=value=>math(expressionBody(value));
export const label=value=>math(mi(value));
export const number=value=>math(String(value)==='∞'?mo('∞'):String(value).startsWith('-')?row(mo('−'),scalarBody(String(value).slice(1))):scalarBody(value));
export const mathProse=value=>String(value).split('$').map((part,i)=>i%2?expression(part):escape(part)).join('');
const joinBodies=(values,separator)=>values.flatMap((value,i)=>i?[mo(separator),value]:[value]);
const pathBody=p=>`<mrow data-path-kind="${p.labels.length?'path':'idempotent'}">${p.labels.length?row(...joinBodies(p.labels.map(mi),'·')):sub(mi('e'),mi(p.vertexLabel))}</mrow>`;
export const pathMath=p=>math(pathBody(p));
export const relationMath=p=>math(row(pathBody(p),mo('='),mn(0)));
export const labelSequence=(values,separator='→')=>math(row(...joinBodies(values.map(mi),separator)));
export const numberSequence=(values,separator=',')=>math(row(...joinBodies(values.map(value=>expressionBody(value)),separator)));
const signedScalar=value=>String(value).startsWith('-')?row(mo('−'),scalarBody(String(value).slice(1))):scalarBody(value);
export const coordinates=values=>math(row(mo('('),...joinBodies(values.map(signedScalar),','),mo(')')));
export const familyType=type=>math(sub(mi('H'),token('mtext',type)));
export const familyDegrees=f=>f.step?expression(`${f.degree}+${f.step}j, j≥0`):number(f.degree);
function familyBody(f){
 const d=f.mathDisplay;
 if(!d)return mi(f.name);
 if(d.type==='text')return token('mtext',d.value);
 if(d.type==='symbol')return expressionBody(d.value);
 return row(mi(d.symbol),mo('('),pathBody(d.input),...(d.output?[mo('↦'),pathBody(d.output)]:[]),mo(')'));
}
export const familyName=f=>math(familyBody(f));
export function familyDescription(f){
 const d=f.mathDisplay;
 if(f.type==='II')return `${pathMath(d.input)} is a ${expression('ℬ')}-maximal cycle.`;
 if(f.type==='IV')return `Arrow-scaling derivation: ${math(row(pathBody(d.input),mo('↦'),pathBody(d.input)))}.`;
 if(f.type==='VI')return `A ${expression('Γ')}-maximal path parallel to a path in ${expression('ℬ')} with distinct end arrows.`;
 if(['VII','VIII'].includes(f.type))return `Circuit ${pathMath(d.circuit)}; one class in ${f.type==='VII'?`each positive multiple of ${number(f.step)}`:`each degree ${expression(`${f.step}k+1, k≥1`)}`}.`;
 return escape(f.description);
}
const factorBody=f=>f.path?row(mi('d'),mo('('),pathBody(f.path),mo(')')):expressionBody(f.name);
const productBody=factors=>row(...joinBodies(factors.map(factorBody),'·'));
export const ringProduct=factors=>math(productBody(factors));
export const ringEquality=sides=>math(row(...joinBodies(sides.map(productBody),'=')));
export function representativeMath(t){
 const coefficient=String(t.coefficient),signed=coefficient.startsWith('-'),magnitude=signed?coefficient.slice(1):coefficient;
 const scale=row(signed?mo('−'):'',magnitude==='1'?'':row(scalarBody(magnitude),mo('·')));
 const marked=(name,body)=>`<mrow class="${name}">${body}</mrow>`;
 if(t.form==='central-element')return math(marked('cochain-output',row(scale,pathBody(t.output))));
 const input=row(mo('['),...joinBodies(t.input.map(pathBody),'|'),mo(']'));
 const summand=t.summand===null||t.summand===undefined?'':row(sub(mi('C'),mn(t.summand)),mo(':'));
 return math(row(summand,t.kind==='co'?row(marked('cochain-input',input),mo('↦'),marked('cochain-output',row(scale,pathBody(t.output)))):row(scale,marked('chain-leading',pathBody(t.output)),input)));
}
export const edgeWalk=walk=>math(row(...joinBodies(walk.map(e=>row(mi(e.edge),mo('('),mn(e.from),mo('→'),mn(e.to),mo(')'))),',')));
export const matrixMath=matrix=>math(row(mo('('),`<mtable>${matrix.map(values=>`<mtr>${values.map(value=>`<mtd>${expressionBody(value)}</mtd>`).join('')}</mtr>`).join('')}</mtable>`,mo(')')));

export function signatureMath(signature){
 const entries=[['Genus',mn(signature.genus)],['Boundary pairs (marked points, winding)',row(...joinBodies(signature.boundaries.map(pair=>row(mo('('),...joinBodies(pair.map(signedScalar),','),mo(')'))),','))],['Classification branch',token('mtext',signature.branch)]];
 if('gcd' in signature)entries.push(['gcd',mn(signature.gcd)]);
 if('arf' in signature)entries.push(['Arf invariant',mn(signature.arf)]);
 return math(`<mtable>${entries.map(([name,value])=>`<mtr><mtd>${token('mtext',name)}</mtd><mtd>${value}</mtd></mtr>`).join('')}</mtable>`);
}
export const dimensionValue=(kind,n,value)=>math(row(token('mtext','dim'),'<mspace width="0.22em"/>',groupBody(kind,n,false),mo('='),mn(value)));
export const connesRankValue=(n,value)=>math(row(token('mtext','rank'),'<mspace width="0.22em"/>',sub(mi('B'),index(n)),mo('='),mn(value)));
