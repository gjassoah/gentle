// Build-time converter for the finite TeX vocabulary in docs/cards/{CARDS,HELP}.md.
// This is deliberately not a general TeX interpreter: unknown commands, characters,
// malformed groups and repeated scripts stop the build instead of changing notation.
import {operatorAttributes,prefixMinus} from '../src/mathml.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=(tag,value,attributes='')=>`<${tag}${tag==='mo'&&!attributes?operatorAttributes(String(value)):attributes}>${escape(value)}</${tag}>`;
const row=items=>items.length===1?items[0]:`<mrow>${items.join('')}</mrow>`;
const identifiers={Delta:'Δ',Gamma:'Γ',Lambda:'Λ',Pi:'Π',Sigma:'Σ',alpha:'α',beta:'β',delta:'δ',ell:'ℓ',eta:'η',gamma:'γ',phi:'ϕ',rho:'ρ',sigma:'σ',varepsilon:'ε',partial:'∂'};
const operators={bullet:'•',cap:'∩',cdot:'⋅',cdots:'⋯',circ:'∘',cong:'≅',cup:'∪',ge:'≥',geq:'≥',in:'∈',langle:'⟨',ldots:'…',le:'≤',leq:'≤',lvert:'|',mapsto:'↦',ne:'≠',notin:'∉',odot:'⊙',oplus:'⊕',otimes:'⊗',parallel:'∥',rangle:'⟩',rvert:'|',setminus:'∖',smile:'⌣',to:'→',varnothing:'∅','{':'{','}':'}'};
const largeOperators={sum:'∑',bigoplus:'⨁'};
const namedOperators=['deg','dim','gcd','ker','max'];
const specialCommands=['bar','frac','mathbb','mathcal','mathrm','operatorname','overline','pmod','quad','text',' '];
export const supportedCommands=Object.freeze([...Object.keys(identifiers),...Object.keys(operators),...Object.keys(largeOperators),...namedOperators,...specialCommands].sort());
const bbExceptions={C:'ℂ',H:'ℍ',N:'ℕ',P:'ℙ',Q:'ℚ',R:'ℝ',Z:'ℤ'};
const calExceptions={B:'ℬ',E:'ℰ',F:'ℱ',H:'ℋ',I:'ℐ',L:'ℒ',M:'ℳ',R:'ℛ'};
function alphabet(value,style){
 if(!/^[A-Za-z]$/.test(value))throw Error(`\\${style} requires one Latin letter`);
 const upper=value>='A'&&value<='Z';
 if(style==='mathbb')return bbExceptions[value]||String.fromCodePoint((upper?0x1d538:0x1d552)+value.charCodeAt(0)-(upper?65:97));
 if(!upper)throw Error('\\mathcal supports the capital letters used in the approved content');
 return calExceptions[value]||String.fromCodePoint(0x1d49c+value.charCodeAt(0)-65);
}
class Parser{
 constructor(source){this.source=source;this.position=0;}
 fail(message){throw Error(`${message} at position ${this.position} in $${this.source}$`);}
 skip(){while(/\s/.test(this.source[this.position]||'')&&this.position<this.source.length)this.position++;}
 sequence(group=false){
  const nodes=[];this.skip();
  while(this.position<this.source.length&&this.source[this.position]!=='}'){
   if(/[_^']/.test(this.source[this.position]))this.fail('Script has no base');
   const base=this.atom(),scripts={};let prime=false;this.skip();
   while(/[_^']/.test(this.source[this.position]||'')&&this.position<this.source.length){
    const mark=this.source[this.position++];
    if(mark==="'"){if(scripts.sup&&!prime)this.fail('Prime after an explicit superscript');scripts.sup=(scripts.sup||'')+token('mo','′');prime=true;}
    else{
     const name=mark==='_'?'sub':'sup';if(scripts[name]&&!(name==='sup'&&prime))this.fail('Repeated script');
     const value=this.argument();scripts[name]=(scripts[name]||'')+value;prime=false;
    }
    this.skip();
   }
   if(scripts.sub&&scripts.sup)nodes.push(`<msubsup>${base}${row([scripts.sub])}<mrow>${scripts.sup}</mrow></msubsup>`);
   else if(scripts.sub)nodes.push(`<msub>${base}${scripts.sub}</msub>`);
   else if(scripts.sup)nodes.push(`<msup>${base}<mrow>${scripts.sup}</mrow></msup>`);
   else nodes.push(base);
   this.skip();
  }
  if(group){if(this.source[this.position]!=='}')this.fail('Unclosed group');this.position++;}
  else if(this.source[this.position]==='}')this.fail('Unexpected closing brace');
  return row(nodes);
 }
 argument(){this.skip();if(this.position===this.source.length||/[_^'}]/.test(this.source[this.position]))this.fail('Missing argument');return this.atom(true);}
 rawArgument(){
  this.skip();if(this.source[this.position]!=='{'){
   const value=this.source[this.position++];if(!value||!/[A-Za-z]/.test(value))this.fail('Expected a letter or a braced argument');return value;
  }
  this.position++;const start=this.position;while(this.position<this.source.length&&this.source[this.position]!=='}'){
   if(/[{}\\$]/.test(this.source[this.position]))this.fail('Nested commands are not supported in a text argument');this.position++;
  }
  if(this.position===this.source.length)this.fail('Unclosed text argument');const value=this.source.slice(start,this.position++);return value;
 }
 atom(single=false){
  this.skip();const c=this.source[this.position++];
  if(c==='{')return this.sequence(true);
  if(c==='\\'){
   const start=this.position;while(/[A-Za-z]/.test(this.source[this.position]||'')&&this.position<this.source.length)this.position++;
   const name=this.position===start?this.source[this.position++]:this.source.slice(start,this.position);
   if(Object.hasOwn(identifiers,name))return token('mi',identifiers[name]);
   if(Object.hasOwn(operators,name))return token('mo',operators[name]);
   if(Object.hasOwn(largeOperators,name))return token('mo',largeOperators[name],' largeop="true" movablelimits="true"');
   if(namedOperators.includes(name))return token('mi',name,' mathvariant="normal"');
   if(name==='quad'||name===' ')return `<mspace width="${name==='quad'?'1':'0.25'}em"/>`;
   if(name==='frac'){const numerator=this.argument(),denominator=this.argument();return `<mfrac>${numerator}${denominator}</mfrac>`;}
   if(name==='bar'||name==='overline')return `<mover accent="true">${this.argument()}<mo>¯</mo></mover>`;
   if(name==='mathbb'||name==='mathcal')return token('mi',alphabet(this.rawArgument().trim(),name));
   if(name==='mathrm'||name==='operatorname')return token('mi',this.rawArgument().trim(),' mathvariant="normal"');
   if(name==='text')return token('mtext',this.rawArgument());
   if(name==='pmod')return row(['<mspace width="0.4em"/>',token('mo','('),token('mi','mod',' mathvariant="normal"'),'<mspace width="0.25em"/>',this.argument(),token('mo',')')]);
   this.fail(`Unsupported command \\${name}`);
  }
  if(/[A-Za-z]/.test(c||''))return token('mi',c);
  if(/[0-9]/.test(c||'')){
   let value=c;if(!single)while(/[0-9]/.test(this.source[this.position]||'')&&this.position<this.source.length)value+=this.source[this.position++];return token('mn',value);
  }
  if('()+,-./:<=>[]|*'.includes(c||'')&&c)return token('mo',c==='-'?'−':c);
  this.fail(`Unsupported character ${JSON.stringify(c)}`);
 }
}
export function texMathML(source){
 if(typeof source!=='string'||!source.trim())throw Error('Expected a nonempty TeX expression');
 return `<math xmlns="http://www.w3.org/1998/Math/MathML">${prefixMinus(new Parser(source).sequence())}</math>`;
}

// Dollar delimiters are the approved documents' only mathematical delimiter.
// Do not reinterpret code examples, which retain their presentation syntax.
export function mathExpressions(markdown){
 const expressions=[];let fenced=false;
 for(const line of markdown.replace(/\r/g,'').split('\n')){
  if(line.startsWith('```')){fenced=!fenced;continue;}if(fenced)continue;
  const fragments=line.split('$');if(fragments.length%2===0)throw Error(`Unmatched $ in ${line}`);
  for(let i=1;i<fragments.length;i+=2)expressions.push(fragments[i]);
 }
 return expressions;
}
