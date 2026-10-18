// Drawing coordinates are independent of the viewport and of device pixels.
export const WIDTH=2400,HEIGHT=1260;
export const INITIAL_VIEW={x:0,y:0,width:800,height:420};
export const BOUNDS={left:30,right:WIDTH-30,top:70,bottom:HEIGHT-40};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const clampPoint=p=>({x:clamp(p.x,BOUNDS.left,BOUNDS.right),y:clamp(p.y,BOUNDS.top,BOUNDS.bottom)});
export const normalizeQuiver=q=>({...q,vertices:q.vertices.map(v=>({...v,...clampPoint(v)}))});
// A viewing margin lets Fit show arrowheads and labels at the drawing boundary.
export function boundView(v){const width=clamp(v.width,160,WIDTH+400),height=width*INITIAL_VIEW.height/INITIAL_VIEW.width;return {x:clamp(v.x,-200,WIDTH+200-width),y:clamp(v.y,-200,HEIGHT+200-height),width,height}}
export function zoomView(view,factor,anchor={x:view.x+view.width/2,y:view.y+view.height/2}){const width=clamp(view.width*factor,160,WIDTH+400),ratio=width/view.width;return boundView({x:anchor.x-(anchor.x-view.x)*ratio,y:anchor.y-(anchor.y-view.y)*ratio,width})}
export function fitView(box,margin=90){if(!box)return {...INITIAL_VIEW};const width=Math.max(160,box.width+2*margin,(box.height+2*margin)*800/420);return boundView({x:box.x+box.width/2-width/2,y:box.y+box.height/2-width*420/800/2,width})}
export function arrangeVertices(vertices){const count=vertices.length;if(count<=12)return vertices.map((v,i)=>{const t=2*Math.PI*i/count-Math.PI/2;return {...v,x:count===1?400:400+210*Math.cos(t),y:count===1?220:220+135*Math.sin(t)}});const cols=Math.ceil(Math.sqrt(count*WIDTH/HEIGHT)),rows=Math.ceil(count/cols);return vertices.map((v,i)=>({...v,x:100+i%cols*(WIDTH-200)/(cols-1),y:120+Math.floor(i/cols)*(HEIGHT-240)/Math.max(1,rows-1)}))}
export function freePosition(vertices,view=INITIAL_VIEW){const candidates=[];for(let y=120;y<=BOUNDS.bottom;y+=70)for(let x=70;x<=BOUNDS.right;x+=90)candidates.push({x,y});const visible=p=>p.x>=view.x+30&&p.x<=view.x+view.width-30&&p.y>=view.y+70&&p.y<=view.y+view.height-30;return [...candidates.filter(visible),...candidates.filter(p=>!visible(p))].find(p=>vertices.every(v=>Math.hypot(v.x-p.x,v.y-p.y)>=60))}
export function preservePositions(next,previous){const old=new Map(previous.vertices.map(v=>[v.label,v])),arranged=arrangeVertices(next.vertices),placed=next.vertices.filter(v=>old.has(v.label)).map(v=>({...v,...clampPoint(old.get(v.label))}));const vertices=next.vertices.map((v,i)=>{if(old.has(v.label))return {...v,...clampPoint(old.get(v.label))};const candidate=arranged[i],p=placed.some(v=>Math.hypot(v.x-candidate.x,v.y-candidate.y)<60)?freePosition(placed):candidate;const result={...v,...clampPoint(p||candidate)};placed.push(result);return result});return {...next,vertices}}
