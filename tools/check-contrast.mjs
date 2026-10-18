import {readFile} from 'node:fs/promises';
const css=await readFile('src/style.css','utf8');
const luminance=hex=>{let h=hex.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');const channels=h.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return channels.reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
let failures=0,checked=0;
for(const [theme,selector] of [['light',':root'],['dark',':root[data-theme=dark]']]){
 const block=css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]+)\\}'))?.[1];if(!block)throw Error(`Missing ${theme} tokens`);
 const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{3,6})(?=[;\s}])/gi)].map(m=>[m[1],m[2]]));
 const check=(fg,bg,min)=>{if(!tokens[fg]||!tokens[bg])throw Error(`Missing ${fg}/${bg} tokens`);const contrast=ratio(tokens[fg],tokens[bg]);checked++;if(contrast<min){console.error(`${theme}: --${fg} on --${bg} = ${contrast.toFixed(2)}:1 (requires ${min}:1)`);failures++}};
 for(const text of ['text','muted','accent','orange','red'])for(const bg of ['bg','panel','canvas','accent-soft'])check(text,bg,4.5);
 for(const line of ['line','accent','orange'])for(const bg of ['bg','panel','canvas'])check(line,bg,3);
 check('on-accent','accent',4.5);check('panel','text',4.5);
}
if(failures)process.exitCode=1;else console.log(`Contrast passed: ${checked} text and graphical pairs across both themes.`);
