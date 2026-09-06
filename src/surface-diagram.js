// Standard oriented surface, in the layout of APS p. 23. This drawing gives
// geometric alpha/beta curves on the capped surface, not the ribbon-cycle
// coordinates used by the winding-number computation.
export const SURFACE_DIAGRAM_VERSION='2';
export const SURFACE_PRESET={genus:8,boundaries:8,punctures:8};
export function surfaceLayout(g,b,p){
 if(![g,b,p].every(n=>Number.isInteger(n)&&n>=0&&n<=100))throw Error('Surface diagram parameters must be integers between 0 and 100.');
 if(g===0){const width=Math.max(340,Math.max(b,p)*150+180);return {width,height:410,handleWidth:0,rightStart:90,rightWidth:width-180}}
 const handleWidth=g*240,rightWidth=Math.max(190,Math.max(b,p)*150+40);
 return {width:handleWidth+rightWidth+80,height:410,handleWidth,rightStart:handleWidth+40,rightWidth};
}
export const surfaceAssetPath=(g,b,p,theme='light')=>`assets/surfaces/g${g}-b${b}-p${p}${theme==='dark'?'-dark':''}.svg`;
const label=(x,y,name,i,extra='')=>`<text x="${x}" y="${y}" class="label ${extra}">${name}<tspan baseline-shift="sub" font-size="12">${i}</tspan></text>`;
export function surfaceSVG(g,b,p,theme='light'){
 if(!['light','dark'].includes(theme))throw Error('Surface theme must be light or dark.');
 const colors=theme==='dark'?{background:'#1d2521',ink:'#9bc7ac',text:'#e4e9e1',top:'#456951',bottom:'#283d30',alpha:'#d0ead8',beta:'#80cdbd'}:{background:'#ffffff',ink:'#2b6555',text:'#282e2a',top:'#b4cdbb',bottom:'#edf4ee',alpha:'#20563f',beta:'#397d77'};
 const {width,height,handleWidth,rightStart,rightWidth}=surfaceLayout(g,b,p);
 const handles=Array.from({length:g},(_,i)=>160+i*240);
 const cap=width-90,available=cap-rightStart;
 const slots=n=>Array.from({length:n},(_,i)=>rightStart+available*(i+1)/(n+1));
 const boundary=slots(b),puncture=slots(p);
 // Single silhouette: handles on the left; boundary collars above and
 // puncture ends below the right half. A puncture is an omitted endpoint.
 let outline=g?'M 160 155':'M 90 200';
 for(const [i,c] of handles.entries()){if(i)outline+=` C ${c-85} 200 ${c-50} 155 ${c} 155`;outline+=` C ${c+50} 155 ${c+85} 200 ${c+120} 200`}
 const shoulder=n=>Math.min(55,available/(n+1)/2);
 for(const c of boundary){const s=shoulder(b);outline+=` L ${c-s} 200 C ${c-30} 200 ${c-30} 140 ${c-30} 85 L ${c+30} 85 C ${c+30} 140 ${c+30} 200 ${c+s} 200`}
 // Both end caps have matching horizontal tangents at their joins and a
 // vertical tangent at their outermost point. Genus-zero caps are mirrors.
 outline+=` L ${cap} 200 C ${cap+27.614} 200 ${cap+50} 217.909 ${cap+50} 240 C ${cap+50} 262.091 ${cap+27.614} 280 ${cap} 280`;
 for(const c of puncture.slice().reverse()){const s=shoulder(p);outline+=` L ${c+s} 280 C ${c+10} 280 ${c+4} 320 ${c+3} 354 Q ${c} 360 ${c-3} 354 C ${c-4} 320 ${c-10} 280 ${c-s} 280`}
 outline+=` L ${rightStart} 280`;
 for(let i=handles.length-1;i>=0;i--){const c=handles[i];outline+=` C ${c+85} 280 ${c+45} 325 ${c} 325`;if(i)outline+=` C ${c-45} 325 ${c-85} 280 ${c-120} 280`}
 outline+=g?' C 93.726 325 40 286.944 40 240 C 40 193.056 93.726 155 160 155 Z':' C 62.386 280 40 262.091 40 240 C 40 217.909 62.386 200 90 200 Z';
 const content=[`<path d="${outline}" class="body"/>`];
 for(const [i,c] of handles.entries()){
  content.push(`<g data-handle="${i+1}"><path class="opening" d="M ${c-39} 239 Q ${c} 218 ${c+39} 239 Q ${c} 256 ${c-39} 239 Z"/>`);
  // Alpha is a longitude on the visible sheet. Beta returns on the hidden
  // sheet (dashed), so its visible intersection with alpha is a single point.
  content.push(`<ellipse data-curve="alpha" class="curve alpha" cx="${c}" cy="239" rx="74" ry="38"/>`);
  content.push(`<path data-curve="beta" class="curve beta" d="M ${c+2} 248 C ${c+20} 269 ${c+20} 305 ${c+2} 325"/><path class="curve beta hidden" d="M ${c+2} 325 C ${c-18} 302 ${c-18} 268 ${c+2} 248"/>`);
  content.push(`<path class="curve alpha" d="M ${c+72} 230 Q ${c+76} 239 ${c+71} 249" marker-end="url(#arrow-alpha)"/><path class="curve beta" d="M ${c+15} 283 L ${c+15} 297" marker-end="url(#arrow-beta)"/>`);
  content.push(label(c+82,244,'α',i+1,'alpha-label'),label(c+29,310,'β',i+1,'beta-label'),'</g>');
 }
 for(const [i,c] of boundary.entries()){
  content.push(`<g data-boundary="${i+1}"><ellipse class="opening" cx="${c}" cy="85" rx="30" ry="10"/><ellipse class="curve hidden" cx="${c}" cy="115" rx="33" ry="11"/><path class="curve" d="M ${c-33} 115 A 33 11 0 0 0 ${c+33} 115"/><path class="curve" d="M ${c+5} 126 L ${c-5} 126" marker-end="url(#arrow)"/>`,label(c-22,65,'∂',i+1),label(c-8,150,'c',i+1),'</g>');
 }
 for(const [i,c] of puncture.entries()){
  content.push(`<g data-puncture="${i+1}"><circle class="opening" cx="${c}" cy="355" r="3"/><ellipse class="curve hidden" cx="${c}" cy="307" rx="15" ry="6"/><path class="curve" d="M ${c-15} 307 A 15 6 0 0 0 ${c+15} 307"/><path class="curve" d="M ${c+4} 313 L ${c-4} 313" marker-end="url(#arrow)"/>`,label(c+20,316,'c',b+i+1),'</g>');
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Surface of genus ${g}, with ${b} boundary components and ${p} punctures</title>
<desc id="desc">APS standard surface layout. ${g?`${g} handles on the left with alpha and beta curves; ${b} boundary circles at the upper right and ${p} punctures below.`:`Symmetric genus-zero surface; ${b} boundary circles above and ${p} punctures below.`} Marked points are omitted. Dashed segments lie on the hidden sheet. The alpha and beta curves form a symplectic basis after capping boundaries and filling punctures.</desc>
<style>.body{fill:url(#surface-fill);stroke:${colors.ink};stroke-width:1.3}.opening{fill:${colors.background};stroke:${colors.ink};stroke-width:1.3}.curve{fill:none;stroke:${colors.ink};stroke-width:1.6}.alpha{stroke:${colors.alpha}}.beta{stroke:${colors.beta}}.hidden{stroke-dasharray:4 4;opacity:.7}.label{font:italic 19px Georgia,serif;fill:${colors.text}}.alpha-label{fill:${colors.alpha}}.beta-label{fill:${colors.beta}}.arrow{fill:${colors.ink}}.arrow-alpha{fill:${colors.alpha}}.arrow-beta{fill:${colors.beta}}</style>
<defs><linearGradient id="surface-fill" x2="0" y2="1"><stop stop-color="${colors.top}"/><stop offset="1" stop-color="${colors.bottom}"/></linearGradient>${['','-alpha','-beta'].map(s=>`<marker id="arrow${s}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path class="arrow${s}" d="M 1 1 L 7 4 L 1 7 L 3 4 Z"/></marker>`).join('')}</defs>
<rect width="${width}" height="${height}" fill="${colors.background}"/>
${content.join('\n')}
</svg>`;
}
