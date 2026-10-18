import assert from 'node:assert/strict';
import {Calculus} from '../../src/engine.js';
import {cohomologyFamilies,ringPresentation} from '../../src/structure.js';
import {zeros,addScaled,apply} from '../../src/linear.js';
const q=(ends,rels)=>({vertices:[...new Set(ends.flat())].map(id=>({id,label:id})),arrows:ends.map(([source,target],i)=>({id:'a'+i,label:'a'+i,source,target})),relations:rels.map(r=>r.map(i=>'a'+i))});
const circle=q([['v','w'],['w','v']],[[0,1],[1,0]]);
const figureEight=q([['v','w'],['w','v'],['v','x'],['x','v']],[[0,1],[1,2],[2,3],[3,0]]);
const diamond=q([['v','w'],['w','x'],['v','y'],['y','x']],[[0,1]]);
function path(c,ids,vertex){return c.A.paths.findIndex(p=>ids.length?JSON.stringify(p.a)===JSON.stringify(ids):!p.a.length&&p.s===vertex)}
function term(c,kind,n,t,p,value=1){const v=zeros(c.space(kind,n).items.length,c.F),i=c.space(kind,n).items.findIndex(x=>x.p===p&&JSON.stringify(x.t)===JSON.stringify(t));assert.ok(i>=0);v[i]=c.F.from(value);return v}
function derivation(c,arrow){return c.space('co',1).items.map(({t,p})=>c.F.from(t[0]===p?c.A.paths[p].a.filter(a=>a===arrow).length:0));}
function eqH(c,kind,n,x,y){const v=x.slice();addScaled(v,y,c.F.from(-1),c.F);assert.ok(c.group(kind,n).project(v).every(c.F.isZero));}
const results=[];
for(const characteristic of [0,2,3,5]){
 const c=new Calculus(circle,characteristic),a=path(c,['a0']),b=path(c,['a1']),ev=path(c,[],'v'),ew=path(c,[],'w');
 const z=term(c,'ho',2,[a,b],ev);addScaled(z,term(c,'ho',2,[b,a],ew),c.F.from(-1),c.F);
 const d=derivation(c,'a0'),expected=term(c,'ho',1,[b],a,-1),cap=c.cap(1,d,2,z);
 eqH(c,'ho',1,cap,expected);
 const lie=c.lie(1,d,2,z);eqH(c,'ho',2,lie,z);
 results.push({example:'two-cycle CSSS26 Lemma5.12(ii) p196',characteristic,cap:c.describeVector('ho',1,cap),lie:'L_d(z)=z'});
 const f=new Calculus(figureEight,characteristic),t=f.group('co',4).basis[0];
 // A genuine lifted bar cocycle is necessary: its non-arrow input values cannot be discarded.
 f.group('co',4).project(t);
 const db=derivation(f,'a1'),dd=derivation(f,'a3');
 eqH(f,'co',5,f.cup(1,db,4,t),f.cup(1,dd,4,t));
 eqH(f,'co',4,f.bracket(1,db,4,t),t.map(f.F.neg));
 const ring=ringPresentation(f.A,characteristic)[0];assert.ok(ring.equalities.includes('d(a3)·t1 = d(a1)·t1'));
 results.push({example:'Theorem5.8 multi-chord relation pp190–191 / Prop6.2 p214',characteristic,hh4:f.group('co',4).basis.length,hh5:f.group('co',5).basis.length,ringEqualities:ring.equalities,bracket:'[d(a1),t1]=-t1'});
 const h=new Calculus(diamond,characteristic),fam=cohomologyFamilies(h.A,characteristic);assert.equal(fam.filter(x=>x.type==='VI'&&x.degree===2).length,1);assert.equal(h.group('co',2).basis.length,1);
 for(const u of h.group('co',2).basis)eqH(h,'co',4,h.cup(2,u,2,u),zeros(h.space('co',4).items.length,h.F));
 results.push({example:'finite maximal relation path parallel to permitted path, Thm3.12(HVI) p159/Table1 p184',characteristic,hh2:1,square:'0'});
}
console.log(JSON.stringify(results,null,2));
