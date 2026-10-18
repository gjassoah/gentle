import {field} from './linear.js';

// This is the only display boundary for path words, representatives and
// convention-dependent formulas. All input data use travel order. Nothing here
// builds an algebra, a differential, a quotient or a cohomology operation.
export const DEFAULT_CONVENTION='left';
export const normalizeConvention=value=>value==='right'?'right':'left';
// These formulas involve class coordinates or surface invariants, on which
// signed reversal acts as the identity. Keeping this boundary explicit lets
// renderers share notation without suggesting a second computational model.
export const invariantFormula=body=>String(body);
export const invariantMarkup=Object.freeze({
 algebraPresentation:'$A = kQ/I$',
 homologyFamilies:'There is one degree-zero idempotent class per vertex, killed by $B$. For each complete circuit $C$ represented by a primitive cycle of length $r$, and every $k ≥ 1$ with $(−1)^((kr+1)r) = 1$ in $k$, there are classes $x_(C,k)$ in degree $kr−1$ and $y_(C,k)$ in degree $kr$. Their Connes differential is $B(x_(C,k)) = k y_(C,k)$ and $B(y_(C,k)) = 0$. These are all the homology classes. Use $k$ modulo the chosen characteristic.',
 deRhamCyclic:'The de Rham classes are the vertex classes, together with $x_(C,k)$ and $y_(C,k)$ when $k$ vanishes in the field. Cyclic homology in degree $n$ is $coker B_(n−1)$ plus the direct sum of $H^(dR)_(n−2j)$ for $j ≥ 1$; terms in negative degrees vanish.',
 surfaceEuler:'$|G₀| − |G₁| = 2c − 2g − b$',
 derivedQuadratic:'$q(γ) = w(γ)/2 + 1$ mod $2$',
 apsBoundary:'Boundary windings use the APS convention $w = n−m$, opposite to the winding convention of CSSS26, §7. Unmarked boundaries represent punctures.',
 exceptionalRing:'$k[c,t]/(c²)$, with $|c| = 0$ and $|t| = 1$. The arrow-scaling derivation is $c·t$.',
 ringDescription:'The free unital graded-commutative algebra on these generators, modulo every quadratic monomial except the products listed below, and modulo the listed equalities. Products involving the unit retain their usual values.'
});
const unmark=value=>value.replaceAll('$','');
export const invariantFormulas=Object.freeze(Object.fromEntries(Object.entries(invariantMarkup).map(([key,value])=>[key,unmark(value)])));
// Class coordinates are invariant under transport. Both MathML and textual
// renderers use these signed, nonzero terms rather than changing coordinates.
export const coordinateTerms=coefficients=>coefficients.flatMap((value,index)=>{
 const coefficient=String(value);return coefficient==='0'?[]:[{index,negative:coefficient.startsWith('-'),coefficient:coefficient.startsWith('-')?coefficient.slice(1):coefficient}];
});

// On C_k inside CC_N the extra sign is (-1)^j, j=(N-k)/2. Since
// bT=-Tb and BT=TB, S_(N,k)=(-1)^j T_k satisfies DS_N=-S_(N-1)D.
export function transportSign(degree,summand=null){
 if(!Number.isInteger(degree)||degree<0)throw Error('A transport degree must be a nonnegative integer.');
 const k=summand??degree;
 if(!Number.isInteger(k)||k<0||k>degree||(degree-k)%2)throw Error('Invalid cyclic summand degree.');
 return (k*(k-1)/2+(degree-k)/2)%2?-1:1;
}

// Display objects can pass through several renderers. Retain their source
// without putting duplicate raw data or display flags into JSON exports.
const sources=new WeakMap();
const source=value=>value&&typeof value==='object'?(sources.get(value)||value):value;
const displayed=(value,raw)=>{sources.set(value,source(raw));return value};
const pathNotation=labels=>labels.some(label=>/[|\[\]↦·()"\\<>]/.test(label))?`path(${labels.map(s=>JSON.stringify(s)).join(', ')})`:labels.join('·');

export function createConvention(q,choice=DEFAULT_CONVENTION,characteristic='0'){
 const name=normalizeConvention(choice),left=name==='left';
 const arrows=new Map((q?.arrows||[]).map(a=>[a.id,a])),vertices=new Map((q?.vertices||[]).map(v=>[v.id,v]));
 let F;
 const sequence=values=>left?values.slice().reverse():values.slice();
 const arrow=id=>arrows.get(id)?.label??String(id);
 const path=(ids,vertex)=>ids.length?pathNotation(sequence(ids).map(arrow)):`e(${vertices.get(vertex)?.label??vertex??''})`;
 const pathDisplay=(ids,vertex)=>({labels:sequence(ids).map(arrow),vertexLabel:vertices.get(vertex)?.label??vertex??''});
 const relation=ids=>path(ids);
 const zeroRelation=ids=>`${relation(ids)} = 0`;
 const record=p=>{
  p=source(p);
  if(!p||!Array.isArray(p.arrows))throw Error('Path display requires structured arrow identifiers.');
  const notation=path(p.arrows,p.vertex);
  return displayed({...p,...pathDisplay(p.arrows,p.vertex),arrows:sequence(p.arrows),label:notation,notation,type:p.arrows.length?'path':'idempotent'},p);
 };
 const scalar=(coefficient,sign)=>{
  if(sign===1)return String(coefficient);
  F??=field(characteristic);return F.str(F.neg(F.from(coefficient)));
 };
 const representative=items=>{
  if(items===null||items===undefined)return items;
  const raw=source(items);
  return displayed(raw.map(value=>{
   const t=source(value);
   if(!t.output||!Array.isArray(t.input))throw Error('Representative display requires structured path records.');
   const coefficient=scalar(t.coefficient,left?transportSign(t.degree,t.summand):1);
   const input=sequence(t.input).map(record),output=record(t.output),tensor=input.map(p=>p.notation).join(' | ');
   const prefix=t.summand===null||t.summand===undefined?'':`C_${t.summand}: `;
   const term=prefix+(t.form==='central-element'?output.notation:t.kind==='co'?`[${tensor}] ↦ ${output.notation}`:`${output.notation} [${tensor}]`);
   return displayed({...t,coefficient,input,output,term},t);
  }),raw);
 };
 const basis=items=>items===null||items===undefined?items:displayed(source(items).map(representative),items);
 const group=value=>{
  if(!value)return value;const raw=source(value);
  return displayed({...raw,...('basis' in raw?{basis:basis(raw.basis)}:{}),...('representative' in raw?{representative:representative(raw.representative)}:{})},raw);
 };
 const family=value=>{
  const f=source(value),d=f.display||{};let title=f.name,description=f.description,mathDisplay={type:'symbol',value:f.name};
  if(f.type==='II'){const a=record(d.path).notation;title=`c(${a})`;description=`${a} is a ℬ-maximal cycle.`;mathDisplay={symbol:'c',input:record(d.path)}}
  if(f.type==='IV'){const a=path([d.arrow]);title=`d(${a})`;description=`Arrow-scaling derivation: ${a} ↦ ${a}.`;mathDisplay={symbol:'d',input:pathDisplay([d.arrow])}}
  if(f.type==='I')mathDisplay={type:'text',value:f.name};
  if(f.type==='VI'){title=`u(${record(d.input).notation} ↦ ${record(d.output).notation})`;description='A Γ-maximal path parallel to a path in ℬ with distinct end arrows.';mathDisplay={symbol:'u',input:record(d.input),output:record(d.output)}}
  if(f.type==='VII')description=`Circuit ${path(d.circuit)}; one class in each positive multiple of ${f.step}.`;
  if(f.type==='VIII')description=`Circuit ${path(d.circuit)}; one class in each degree ${f.step}k + 1, k ≥ 1.`;
  if(['VII','VIII'].includes(f.type))mathDisplay={type:'symbol',value:f.name.replace(/([a-z])(\d+)/,'$1_$2'),circuit:pathDisplay(d.circuit)};
  return displayed({...f,name:title,description,mathDisplay},f);
 };
 const families=values=>displayed(source(values).map(family),values);
 const factor=value=>value.arrow===undefined?value.name:`d(${path([value.arrow])})`;
 // These are cup products of transported classes, so their factor order does
 // not reverse; only path words in generator names are rewritten.
 const product=values=>values.map(factor).join('·');
 const mathFactors=values=>values.map(value=>value.arrow===undefined?{name:value.name.replace(/([a-z])(\d+)/,'$1_$2')}:{path:pathDisplay([value.arrow])});
 const ring=values=>displayed(source(values).map(value=>{
  const c=source(value);
  if(!c.productFactors||!c.equalityFactors)throw Error('Ring display requires structured product factors.');
  return displayed({...c,description:c.exceptional?invariantFormulas.exceptionalRing:invariantFormulas.ringDescription,generators:c.generators.map(family),mathProducts:c.productFactors.map(mathFactors),mathEqualities:c.equalityFactors.map(sides=>sides.map(mathFactors)),allowedProducts:c.productFactors.map(product),equalities:c.equalityFactors.map(sides=>sides.map(product).join(' = '))},c);
 }),values);
 const ribbon=value=>{
  if(!value)return value;const r=source(value);
  return displayed({...r,threads:r.threads.map(t=>({...t,pathDisplay:record(t.path),label:record(t.path).notation,visits:sequence(t.visits)})),boundaries:r.boundaries.map(b=>({...b,edgeWalk:sequence(b.edgeWalk)}))},r);
 };
 const structure=value=>{
  if(!value)return value;const s=source(value);
  if(!s.pathRecords||!s.permittedRecords||!s.forbiddenRecords)throw Error('Structural display requires structured path records.');
  return displayed({...s,chordDisplays:s.chordIds.map(id=>pathDisplay([id])),permittedDisplays:s.permittedRecords.map(record),forbiddenDisplays:s.forbiddenRecords.map(record),chords:s.chordIds.map(id=>path([id])),permitted:s.permittedRecords.map(p=>record(p).notation),forbidden:s.forbiddenRecords.map(p=>record(p).notation),forbiddenChains:s.forbiddenChainIds.map(ids=>sequence(ids).map(id=>path([id]))),cycles:s.cycles.map(c=>({...c,pathDisplay:pathDisplay(c.arrowIds),arrows:sequence(c.arrowIds).map(id=>path([id])),label:path(c.arrowIds)})),...(s.ribbon?{ribbon:ribbon(s.ribbon)}:{})},s);
 };
 const derived=value=>{
  if(!value)return value;const d=source(value);
  return displayed({...d,components:d.components.map(c=>({...c,curves:c.curves.map(curve=>({...curve,walk:left?curve.walk.slice().reverse().map(e=>({...e,from:e.to,to:e.from})):curve.walk.map(e=>({...e})),turns:left&&curve.turns.length?[...curve.turns.slice(0,-1).reverse(),curve.turns.at(-1)]:curve.turns.slice()}))}))},d);
 };
 const operation=value=>{
  if(!value)return value;const o=source(value);
  return displayed({...o,...(o.result?{result:group(o.result)}:{}),...(o.representative?{representative:representative(o.representative)}:{}),...(o.outputBasis?{outputBasis:group(o.outputBasis)}:{})},o);
 };
 const barOrder=left?'Bar factors are listed in written order; products are written from right to left.':'Bar factors and products are written in travel order, from left to right.';
 const contraction='I_f(a₀[a₁|…|aₙ]) = a₀ f(a₁,…,aₚ)[aₚ₊₁|…|aₙ]';
 const formulaMarkup={
  cup:`$(f ⌣ g)(a₁,…,a_(p+q)) = f(a₁,…,aₚ) g(a_(p+1),…,a_(p+q))$; $|f| = p$, $|g| = q$. ${barOrder}`,
  bracket:`$[f,g] = f ∘ g − (−1)^((p−1)(q−1)) g ∘ f$, where $(f ∘ g)(a₁,…,a_(p+q−1)) = Σ_(i=0)^(p−1) (−1)^((q−1)i) f(a₁,…,a_i,g(a_(i+1),…,a_(i+q)),a_(i+q+1),…,a_(p+q−1))$. ${barOrder}`,
  cap:(left?'$z ∩ f = (−1)^(p(n+p)) a₀ f(a₁,…,aₚ)[aₚ₊₁|…|aₙ]$, for $z = a₀[a₁|…|aₙ]$. On Bardzell pairs, $(a,x) ∩ (y,b) = (−1)^((n+p)p) (ab,z)$ if $x = yz$, and $0$ otherwise (CSSS26, p. 194, equation (44)); $|x| = n$, $|y| = p$.':'$f ∩ a₀[a₁|…|aₙ] = (−1)^(p(n+p)) a₀ f(a₁,…,aₚ)[aₚ₊₁|…|aₙ]$; $|f| = p$.')+` ${barOrder}`,
  lie:`$L_f = I_f B − (−1)^p B I_f$, where $${contraction}$ is the unsigned contraction. $L_f: HHₙ(A) → HHₙ₋ₚ₊₁(A)$. ${barOrder}`,
  connes:'$B: HHₙ(A) → HHₙ₊₁(A)$; $B² = 0$.'
 };
 const formulas=Object.fromEntries(Object.entries(formulaMarkup).map(([key,value])=>[key,unmark(value)]));
 const descriptionMarkup=(left?'Paths are written from right to left (left modules, as in CSSS26, p. 141). Representatives use signed reversal $Tₙ = (−1)^(n(n−1)/2)$, reversing the bar factors and each path word. In $Cₖ ⊂ CCₙ$ the sign is $(−1)^((n−k)/2+k(k−1)/2)$. Class coordinates refer to the transported bases.':'Paths are written in travel order, from left to right (right modules). Representatives use the $E$-relative normalized bar resolution. Class coordinates refer to the displayed bases.')+` ${barOrder}`;
 const description=unmark(descriptionMarkup);
 const matrixDescription='Rows are sources and columns are targets, in the input vertex order; this path-count orientation is unchanged by the writing convention.';
 const report=value=>{
  if(!value)return value;const r=source(value),s=r.structure;
  if(r.paths&&!s?.pathRecords)throw Error('Report path display requires structure.pathRecords.');
  return displayed({...r,convention:description,...(r.paths?{pathDisplays:s.pathRecords.map(record),paths:s.pathRecords.map(p=>record(p).notation)}:{}),...(s?{structure:structure(s)}:{}),...(r.families?{families:families(r.families)}:{}),...(r.ring?{ring:ring(r.ring)}:{}),...(r.rows?{rows:r.rows.map(row=>({...row,coBasis:basis(row.coBasis),hoBasis:basis(row.hoBasis),cyBasis:basis(row.cyBasis)}))}:{}),...(r.additionalGroups?{additionalGroups:r.additionalGroups.map(group)}:{}),...(r.derived?{derived:derived(r.derived)}:{})},r);
 };
 return {name,left,capRightAction:left,sequence,ordered:sequence,path,pathDisplay,relation,zeroRelation,record,representative,basis,group,family,families,ring,ribbon,structure,derived,operation,report,formulas,formulaMarkup,invariants:invariantFormulas,invariantMarkup,description,descriptionMarkup,matrixDescription};
}

// Known invariant check statements carry authored formula delimiters only at the
// display boundary. The engine's checks and exported source values stay textual.
export function checkMarkup(value){
 return invariantFormula(value).replace(/B² = 0|bB \+ Bb = 0|2g \+ b \+ p − 1|2g|4 − 4g − 2\(b\+p\)/g,formula=>`$${formula}$`);
}
