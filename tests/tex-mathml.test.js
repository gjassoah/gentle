import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mathExpressions,supportedCommands,texMathML} from '../tools/tex-mathml.mjs';

const sources=['CARDS','HELP'].map(name=>[name,readFileSync(new URL(`../docs/cards/${name}.md`,import.meta.url),'utf8')]);
const body=tex=>texMathML(tex).replace(/^<math[^>]*>|<\/math>$/g,'');
const visible=tex=>body(tex).replace(/<[^>]+>/g,'');

test('TeX vocabulary is exactly the command inventory in the two approved documents',()=>{
 const commands=new Set(sources.flatMap(([,source])=>mathExpressions(source)).flatMap(expression=>[...expression.matchAll(/\\([A-Za-z]+|.)/g)].map(match=>match[1])));
 assert.deepEqual([...commands].sort(),supportedCommands);
});

for(const [name,source] of sources)test(`every formula in ${name}.md converts to native MathML Core`,()=>{
 const expressions=mathExpressions(source);assert.ok(expressions.length>(name==='CARDS'?1200:30));
 const coreTags=new Set(['math','mrow','mi','mn','mo','mtext','mspace','msub','msup','msubsup','mfrac','mover']);
 for(const expression of expressions){
  const html=texMathML(expression);
  assert.match(html,/^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
  for(const match of html.matchAll(/<\/?([a-z]+)/g))assert.ok(coreTags.has(match[1]),`${expression}: ${match[1]}`);
  assert.doesNotMatch(html,/[\\_^]|\$/);
 }
});

test('groups and combined scripts retain their mathematical structure',()=>{
 assert.equal(body('a_{i+1}'),'<msub><mi>a</mi><mrow><mi>i</mi><mo>+</mo><mn>1</mn></mrow></msub>');
 assert.equal(body('C_n^m'),'<msubsup><mi>C</mi><mi>n</mi><mrow><mi>m</mi></mrow></msubsup>');
 assert.equal(body('C^m_n'),body('C_n^m'));
 assert.equal(body("C'_q"),'<msubsup><mi>C</mi><mi>q</mi><mrow><mo>′</mo></mrow></msubsup>');
 assert.match(body("w^{\\Delta'^*}"),/<msup><mi>Δ<\/mi><mrow><mo>′<\/mo><mo>\*<\/mo><\/mrow><\/msup>/);
 assert.equal(body('x^12'),'<mrow><msup><mi>x</mi><mrow><mn>1</mn></mrow></msup><mn>2</mn></mrow>');
 assert.match(body('(-1)^{n(n-1)/2}'),/<msup><mo stretchy="false">\)<\/mo><mrow><mrow><mi>n<\/mi><mo stretchy="false">\(<\/mo><mi>n<\/mi><mo>−<\/mo><mn>1<\/mn><mo stretchy="false">\)<\/mo><mo lspace="0" rspace="0">\/<\/mo><mn>2<\/mn>/);
});

test('fractions, sums, overbars and modular notation preserve their arguments',()=>{
 assert.equal(body('\\frac12'),'<mfrac><mn>1</mn><mn>2</mn></mfrac>');
 assert.equal(body('\\frac{m}{r}'),'<mfrac><mi>m</mi><mi>r</mi></mfrac>');
 assert.match(body('\\frac{w(\\alpha_i)}2'),/^<mfrac><mrow><mi>w<\/mi><mo stretchy="false">\(<\/mo><msub><mi>α<\/mi><mi>i<\/mi><\/msub><mo stretchy="false">\)<\/mo><\/mrow><mn>2<\/mn><\/mfrac>$/);
 assert.match(body('\\sum_{i=0}^{r-1}x_i'),/<msubsup><mo largeop="true" movablelimits="true">∑<\/mo>/);
 assert.match(body('\\overline{\\mathcal C}^{\\mathrm{basic}}'),/^<msup><mover accent="true"><mi>𝒞<\/mi><mo>¯<\/mo><\/mover><mrow><mi mathvariant="normal">basic<\/mi><\/mrow><\/msup>$/);
 assert.match(body('\\bar\\Sigma'),/^<mover accent="true"><mi>Σ<\/mi><mo>¯<\/mo><\/mover>$/);
 assert.equal(visible('x=2\\pmod4'),'x=2(mod4)');
});

test('mathematical alphabets and upright names use Core-compatible tokens',()=>{
 assert.equal(body('\\mathbb{k}'),'<mi>𝕜</mi>');
 assert.equal(visible('\\mathbb Q\\mathbb F\\mathbb Z\\mathcal B\\mathcal G'),'ℚ𝔽ℤℬ𝒢');
 assert.equal(body('H_{\\mathrm {VIII}}'),'<msub><mi>H</mi><mi mathvariant="normal">VIII</mi></msub>');
 assert.equal(body('\\operatorname{gl.dim}'),'<mi mathvariant="normal">gl.dim</mi>');
 assert.equal(visible('\\deg_c+\\dim A+\\ker b+\\gcd(0,0)+\\max\\{m\\}'),'degc+dimA+kerb+gcd(0,0)+max{m}');
 assert.equal(body('\\text{ in }'),'<mtext> in </mtext>');
 assert.equal(body('\\quad\\ '),'<mrow><mspace width="1em"/><mspace width="0.25em"/></mrow>');
});

test('all symbol commands are exercised',()=>{
 assert.equal(visible('\\alpha\\beta\\gamma\\delta\\eta\\rho\\sigma\\varepsilon\\phi\\ell\\partial'),'αβγδηρσεϕℓ∂');
 assert.equal(visible('\\Gamma\\Delta\\Lambda\\Pi\\Sigma'),'ΓΔΛΠΣ');
 assert.equal(visible('\\in\\notin\\le\\leq\\ge\\geq\\ne\\cong'),'∈∉≤≤≥≥≠≅');
 assert.equal(visible('\\sum\\bigoplus\\otimes\\oplus\\odot\\cup\\cap\\smile'),'∑⨁⊗⊕⊙∪∩⌣');
 assert.equal(visible('\\to\\mapsto\\langle\\rangle\\lvert\\rvert\\parallel'),'→↦⟨⟩||∥');
 assert.equal(visible('\\cdot\\cdots\\ldots\\circ\\bullet\\varnothing\\setminus\\{\\}'),'⋅⋯…∘•∅∖{}');
});

test('unapproved commands and malformed syntax fail instead of being rendered literally',()=>{
 for(const expression of ['', '\\sqrt{x}','\\left(x\\right)','x_{1','x}','x^','_i','x^1^2','x_i_j','\\frac1','\\mathcal{word}','\\unknown','x&y','\\text{\\alpha}'])assert.throws(()=>texMathML(expression),expression);
 assert.equal(body('\\text{<&"\'}'),'<mtext>&lt;&amp;&quot;&#39;</mtext>');
});

test('formula extraction excludes fenced presentation examples and rejects an unmatched delimiter',()=>{
 assert.deepEqual(mathExpressions('Text $a_1$ and $b$.\n```text\n$raw\n```\n$c$'),['a_1','b','c']);
 assert.throws(()=>mathExpressions('Unclosed $x'));
});

test('a minus after an opening fence, a separator or a relation is a sign; between terms it is binary',()=>{
 assert.match(texMathML('(-1)^n'),/<mo stretchy="false">\(<\/mo><mo form="prefix">−<\/mo><mn>1<\/mn>/);
 assert.match(texMathML('a=-b'),/<mo>=<\/mo><mo form="prefix">−<\/mo>/);
 assert.match(texMathML('a-b'),/<mi>a<\/mi><mo>−<\/mo><mi>b<\/mi>/);
});
