import test from 'node:test';
import assert from 'node:assert/strict';
import {className,formula,groupIsomorphism,dimension,connesRank,connesEquation,phi,group} from '../src/mathml.js';
const text=s=>s.replace(/<[^>]+>/g,'');
test('class scripts distinguish cohomology, homology and cyclic classes',()=>{assert.match(className('co',12,3),/<msubsup><mi>h<\/mi><mn>3<\/mn><mn>12<\/mn>/);for(const [kind,symbol] of [['ho','z'],['cyclic','c']]){assert.match(className(kind,12,3),new RegExp(`<msub><mi>${symbol}</mi><mrow><mn>12</mn><mo>,</mo><mn>3</mn>`))}});
test('linear combinations keep exact signs, fractions, zeros and basis indices',()=>{assert.equal(text(formula(['0','1','-1','-3/5','2'],'co',7)),'h27−h37−35h47+2h57');assert.equal(text(formula(['-1'],'ho',4)),'−z4,1');assert.equal(text(formula(['0','0'],'co',0)),'0');assert.match(formula(['2/13'],'cyclic',8),/<mfrac><mn>2<\/mn><mn>13<\/mn><\/mfrac>/);assert.doesNotMatch(formula(['1','-1'],'co',3),/<mn>1<\/mn><msubsup>/)});
test('group isomorphisms, dimensions, Connes and phi use native MathML',()=>{assert.equal(text(groupIsomorphism('co',3,12)),'HH3(A)≅k12');assert.equal(text(dimension('ho')),'dimHHn');assert.equal(text(connesRank()),'rankBn');assert.equal(text(connesEquation(2,4,['-1'])),'B(z2,4)=−z3,1');assert.equal(text(phi(2,5,3)),'φA(2,5)=3');assert.match(dimension('dr'),/<msubsup><mi>H<\/mi>/)});
test('all token inputs escape markup and user labels',()=>{const evil='</mi><script>"&';for(const output of [className('co',evil,evil),formula([evil],'ho',evil),group('co',evil),phi(evil,evil,evil)]){assert.ok(output.startsWith('<math xmlns="http://www.w3.org/1998/Math/MathML">'));assert.ok(!output.includes('<script>'));assert.ok(output.includes('&lt;'));assert.ok(output.includes('&amp;'))}});

test('interface expressions build nested scripts, preserve grouping and omit plain script notation',async()=>{
 const {expression,mathProse}=await import('../src/mathml.js');
 const exponent=expression('(−1)^((p−1)(q−1))');
 assert.match(exponent,/<msup><mrow><mo stretchy="false">\(<\/mo><mrow><mo form="prefix">−<\/mo><mn>1<\/mn>/);
 assert.equal(text(exponent),'(−1)(p−1)(q−1)');
 const dr=expression('H^(dR)_(n−2j)');
 assert.match(dr,/<msubsup><mi>H<\/mi><mrow>.*<mtext>dR<\/mtext>/);
 assert.equal(text(dr),'Hn−2jdR');
 assert.doesNotMatch(mathProse('Sign $(−1)^(n(n−1)/2)$ and summand $C_k$.'),/[\^_]/);
 assert.throws(()=>expression('x^(n+1'),/Unclosed/);
 assert.throws(()=>expression('x^'),/Incomplete/);
});

test('all convention and invariant formulas render in MathML with no visible ASCII scripts',async()=>{
 const {createConvention,invariantMarkup}=await import('../src/convention.js');
 const {mathProse}=await import('../src/mathml.js');
 for(const choice of ['left','right']){
  const d=createConvention(null,choice);
  for(const source of [d.descriptionMarkup,...Object.values(d.formulaMarkup),...Object.values(invariantMarkup)]){
   const html=mathProse(source);
   assert.doesNotMatch(html,/\^|_\{|_\(/);
   if(source.includes('$'))assert.match(html,/<math /);
   assert.equal((html.match(/<math /g)||[]).length,(html.match(/<\/math>/g)||[]).length);
  }
 }
});

test('structured path labels are escaped as tokens and idempotents stay distinct from arrow labels',async()=>{
 const {createConvention}=await import('../src/convention.js');
 const {pathMath,relationMath}=await import('../src/mathml.js');
 const q={vertices:[{id:'v',label:'1'}],arrows:[{id:'a',label:'e(1)'},{id:'b',label:'a_2^3<&'}]};
 const left=createConvention(q,'left'),right=createConvention(q,'right');
 assert.match(pathMath(left.pathDisplay([],'v')),/<msub><mi>e<\/mi><mi>1<\/mi>/);
 assert.match(pathMath(left.pathDisplay(['a'])),/<mi>e\(1\)<\/mi>/);
 assert.match(pathMath(left.pathDisplay(['a','b'])),/<mi>a_2\^3&lt;&amp;<\/mi><mo>·<\/mo><mi>e\(1\)<\/mi>/);
 assert.match(pathMath(right.pathDisplay(['a','b'])),/<mi>e\(1\)<\/mi><mo>·<\/mo><mi>a_2\^3&lt;&amp;<\/mi>/);
 assert.match(relationMath(left.pathDisplay(['a','b'])),/<mo>=<\/mo><mn>0<\/mn>/);
});

test('representatives render transported signs, exact fractions, bar factors and cyclic summands',async()=>{
 const {createConvention}=await import('../src/convention.js');
 const {representativeMath,coordinates}=await import('../src/mathml.js');
 const q={vertices:[{id:'v',label:'1'}],arrows:[{id:'a',label:'α'},{id:'b',label:'β'}]},path={arrows:['a','b'],vertex:'v'};
 const t={kind:'co',degree:2,summand:null,coefficient:'3/5',input:[path,{arrows:['a'],vertex:'v'}],output:path};
 const left=createConvention(q,'left').representative([t])[0],right=createConvention(q,'right').representative([t])[0];
 assert.equal(left.coefficient,'-3/5');assert.equal(right.coefficient,'3/5');
 const html=representativeMath(left);assert.match(html,/<mo form="prefix">−<\/mo><mrow><mfrac><mn>3<\/mn><mn>5<\/mn>/);
 assert.match(html,/class="cochain-input"/);assert.match(html,/class="cochain-output"/);
 assert.match(representativeMath({...left,kind:'cyclic',summand:2}),/<msub><mi>C<\/mi><mn>2<\/mn>/);
 assert.match(coordinates(['-3/5','0']),/<mfrac><mn>3<\/mn><mn>5<\/mn>/);
});

test('the Gerstenhaber insertion summation is a scripted large operator',async()=>{
 const {createConvention}=await import('../src/convention.js');
 const {mathProse}=await import('../src/mathml.js');
 const html=mathProse(createConvention(null).formulaMarkup.bracket);
 assert.match(html,/<msubsup><mo largeop="true" movablelimits="true">∑<\/mo><mrow><mi>i<\/mi><mo>=<\/mo><mn>0<\/mn><\/mrow><mrow><mi>p<\/mi><mo>−<\/mo><mn>1<\/mn>/);
});

test('derived signature tables retain every canonical tuple and branch field',async()=>{
 const {signatureMath}=await import('../src/mathml.js');
 const signature={genus:2,boundaries:[[0,-2],[3,1]],branch:'arf',arf:1},snapshot=structuredClone(signature);
 const html=signatureMath(signature);
 assert.match(html,/<mtext>Genus<\/mtext><\/mtd><mtd><mn>2<\/mn>/);
 assert.match(html,/<mn>0<\/mn><mo>,<\/mo><mrow><mo form="prefix">−<\/mo><mn>2<\/mn>/);
 assert.match(html,/<mn>3<\/mn><mo>,<\/mo><mn>1<\/mn>/);
 assert.match(html,/<mtext>arf<\/mtext>/);assert.match(html,/<mtext>Arf invariant<\/mtext><\/mtd><mtd><mn>1<\/mn>/);
 assert.deepEqual(signature,snapshot);
 assert.match(signatureMath({genus:1,boundaries:[[1,-2]],branch:'genus-one',gcd:0}),/<mtext>gcd<\/mtext><\/mtd><mtd><mn>0<\/mn>/);
});

test('check formulas are marked only at the convention display boundary',async()=>{
 const {checkMarkup}=await import('../src/convention.js');
 const {mathProse}=await import('../src/mathml.js');
 const raw='B² = 0 and bB + Bb = 0 on computed chain spaces',html=mathProse(checkMarkup(raw));
 assert.equal(raw,'B² = 0 and bB + Bb = 0 on computed chain spaces');
 assert.match(html,/<msup><mi>B<\/mi><mrow><mn>2<\/mn>/);
 assert.equal((html.match(/<math /g)||[]).length,2);
 for(const value of ['Ribbon homology rank = 2g + b + p − 1','Intersection rank = 2g','APS boundary winding sum = 4 − 4g − 2(b+p)'])assert.match(mathProse(checkMarkup(value)),/<math /);
});
