// Exact arithmetic. Scalars are reduced rational pairs, including over prime fields.
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b]}return a};
export function canonicalCharacteristic(characteristic=0){
 if(!/^\d+$/.test(String(characteristic)))throw Error('Characteristic must be 0 or a prime integer.');
 const p=BigInt(characteristic);
 if(p<0n || p===1n || p>2147483647n)throw Error('Characteristic must be 0 or a prime at most 2147483647.');
 if(p>0n)for(let d=2n;d*d<=p;d++)if(p%d===0n)throw Error('The characteristic must be prime.');
 return String(p);
}
export function field(characteristic=0){
 const p=BigInt(canonicalCharacteristic(characteristic));
 const invMod=a=>{let b=p,x=1n,y=0n;while(b){const q=a/b;[a,b]=[b,a-q*b];[x,y]=[y,x-q*y]}if(a!==1n)throw Error('Division by zero in the field.');return (x%p+p)%p};
 const norm=(a,b=1n)=>{if(!b)throw Error('Division by zero.');if(p){a=((a%p+p)%p)*invMod((b%p+p)%p)%p;return [a,1n]}if(b<0n){a=-a;b=-b}const g=gcd(a,b);return [a/g,b/g]};
 const z=[0n,1n],o=[1n,1n];
 return {p,z,o,from:x=>{if(Array.isArray(x))return norm(...x);const s=String(x).trim();if(!/^[+-]?\d+(\/\d+)?$/.test(s))throw Error('Use exact integer or fraction coefficients, such as -2 or 3/5.');const [a,b='1']=s.split('/');return norm(BigInt(a),BigInt(b))},add:(a,b)=>norm(a[0]*b[1]+b[0]*a[1],a[1]*b[1]),neg:a=>norm(-a[0],a[1]),mul:(a,b)=>norm(a[0]*b[0],a[1]*b[1]),div:(a,b)=>norm(a[0]*b[1],a[1]*b[0]),isZero:a=>a[0]===0n,eq:(a,b)=>a[0]===b[0]&&a[1]===b[1],str:a=>a[1]===1n?String(a[0]):`${a[0]}/${a[1]}`};
}
export const zeros=(n,F)=>Array.from({length:n},()=>F.z);
export const identityVector=(n,i,F)=>Array.from({length:n},(_,j)=>i===j?F.o:F.z);
export const matrix=(rows,cols,F)=>Array.from({length:cols},()=>zeros(rows,F)); // column major
export function addScaled(v,w,c,F){if(F.isZero(c))return;for(let i=0;i<v.length;i++)if(!F.isZero(w[i]))v[i]=F.add(v[i],F.mul(w[i],c));}
export function apply(M,v,rows,F){const out=zeros(rows,F);v.forEach((c,j)=>{if(!F.isZero(c))addScaled(out,M[j],c,F)});return out}
export function reducer(F){
 const pivots=[];
 return {pivots,reduce(input){const v=input.slice();for(const {i,v:w} of pivots){const c=v[i];if(!F.isZero(c))addScaled(v,w,F.neg(c),F)}return v},add(input){const v=this.reduce(input);const i=v.findIndex(x=>!F.isZero(x));if(i<0)return false;const c=v[i];for(let j=i;j<v.length;j++)v[j]=F.div(v[j],c);pivots.push({i,v});return true}};
}
export function kernel(M,cols,F){const pivots=[],out=[];for(let j=0;j<cols;j++){let v=M[j].slice(),w=identityVector(cols,j,F);for(const p of pivots){const c=v[p.i];if(!F.isZero(c)){addScaled(v,p.v,F.neg(c),F);addScaled(w,p.w,F.neg(c),F)}}const i=v.findIndex(x=>!F.isZero(x));if(i<0)out.push(w);else{const c=v[i];v=v.map(x=>F.div(x,c));w=w.map(x=>F.div(x,c));pivots.push({i,v,w})}}return out}
export function coordinates(columns,v,F){const pivots=[];for(let j=0;j<columns.length;j++){let a=columns[j].slice(),w=identityVector(columns.length,j,F);for(const p of pivots){const c=a[p.i];if(!F.isZero(c)){addScaled(a,p.v,F.neg(c),F);addScaled(w,p.w,F.neg(c),F)}}const i=a.findIndex(x=>!F.isZero(x));if(i>=0){const c=a[i];pivots.push({i,v:a.map(x=>F.div(x,c)),w:w.map(x=>F.div(x,c))})}}const a=v.slice(),w=zeros(columns.length,F);for(const p of pivots){const c=a[p.i];if(!F.isZero(c)){addScaled(a,p.v,F.neg(c),F);addScaled(w,p.w,c,F)}}if(a.some(x=>!F.isZero(x)))throw Error('Internal check failed: vector is outside the span.');return w}
export function quotient(outgoing,incoming,size,F){const r=reducer(F),boundaries=[];for(const v of incoming)if(r.add(v))boundaries.push(v);const cycles=kernel(outgoing,size,F),basis=[];for(const v of cycles)if(r.add(v))basis.push(v);return {basis,boundaries,cycles:cycles.length,rank:boundaries.length,project(v){if(apply(outgoing,v,outgoing[0]?.length||0,F).some(x=>!F.isZero(x)))throw Error('Internal check failed: operation did not produce a cycle.');return coordinates([...boundaries,...basis],v,F).slice(boundaries.length)}}}
export function isZeroComposition(A,B,rows,F){return B.every(v=>apply(A,v,rows,F).every(F.isZero))}
