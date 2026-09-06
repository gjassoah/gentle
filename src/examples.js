export const examples={
 aps1:{name:'APS Λ₁ · gcd 0',vertices:[{id:'1',label:'1',x:180,y:220},{id:'2',label:'2',x:400,y:220},{id:'3',label:'3',x:620,y:220}],arrows:[{id:'a',label:'a',source:'1',target:'2'},{id:'b',label:'b',source:'1',target:'2'},{id:'c',label:'c',source:'2',target:'3'},{id:'d',label:'d',source:'2',target:'3'}],relations:[['a','c'],['b','d']]},
 aps2:{name:'APS Λ₂ · gcd 2',vertices:[{id:'1',label:'1',x:180,y:300},{id:'2',label:'2',x:400,y:100},{id:'3',label:'3',x:620,y:300}],arrows:[{id:'a',label:'a',source:'1',target:'2'},{id:'b',label:'b',source:'2',target:'3'},{id:'c',label:'c',source:'3',target:'1'},{id:'d',label:'d',source:'3',target:'1'}],relations:[['a','b'],['c','a'],['b','d']]},
 triangle:{name:'Radical-square-zero triangle',vertices:[{id:'v1',label:'1',x:180,y:300},{id:'v2',label:'2',x:400,y:100},{id:'v3',label:'3',x:620,y:300}],arrows:[{id:'a',label:'α',source:'v1',target:'v2'},{id:'b',label:'β',source:'v2',target:'v3'},{id:'c',label:'γ',source:'v3',target:'v1'}],relations:[['a','b'],['b','c'],['c','a']]},
 dual:{name:'Dual numbers',vertices:[{id:'v1',label:'1',x:400,y:230}],arrows:[{id:'a',label:'ε',source:'v1',target:'v1'}],relations:[['a','a']]},
 a3:{name:'A₃ path algebra',vertices:[{id:'v1',label:'1',x:180,y:220},{id:'v2',label:'2',x:400,y:220},{id:'v3',label:'3',x:620,y:220}],arrows:[{id:'a',label:'α',source:'v1',target:'v2'},{id:'b',label:'β',source:'v2',target:'v3'}],relations:[]},
 kronecker:{name:'Kronecker algebra',vertices:[{id:'v1',label:'1',x:240,y:220},{id:'v2',label:'2',x:560,y:220}],arrows:[{id:'a',label:'α',source:'v1',target:'v2'},{id:'b',label:'β',source:'v1',target:'v2'}],relations:[]},
 field:{name:'The ground field',vertices:[{id:'v1',label:'1',x:400,y:220}],arrows:[],relations:[]}
};
