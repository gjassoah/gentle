// Shared by the workspace and the generated documentation pages.
export const themeControls=`<div class="theme-picker"><button id="theme" class="quiet-button" aria-expanded="false" aria-controls="theme-options">Theme</button><div id="theme-options" class="theme-options" role="group" aria-label="Colour theme" hidden><button data-theme-choice="system" aria-pressed="true">System</button><button data-theme-choice="light" aria-pressed="false">Light</button><button data-theme-choice="dark" aria-pressed="false">Dark</button></div></div>`;
export function initTheme(onChange=()=>{}){
 const root=document.documentElement,button=document.querySelector('#theme'),options=document.querySelector('#theme-options'),media=matchMedia('(prefers-color-scheme: dark)');
 let choice='system';try{const saved=localStorage.getItem('gentle-theme');if(['system','light','dark'].includes(saved))choice=saved}catch{}
 const apply=()=>{root.dataset.theme=choice==='system'?(media.matches?'dark':'light'):choice;root.style.colorScheme=root.dataset.theme;document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===choice)));onChange()};
 const close=()=>{if(options.hidden)return;options.hidden=true;button.setAttribute('aria-expanded','false');button.focus()};
 button.onclick=()=>{if(!options.hidden){close();return}options.hidden=false;button.setAttribute('aria-expanded','true');options.querySelector(`[data-theme-choice="${choice}"]`).focus()};
 options.onclick=e=>{const b=e.target.closest('[data-theme-choice]');if(!b)return;choice=b.dataset.themeChoice;try{localStorage.setItem('gentle-theme',choice)}catch{}apply();close()};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!options.hidden){e.preventDefault();e.stopPropagation();close()}},true);
 document.addEventListener('click',e=>{if(!e.target.closest('.theme-picker'))close()});
 document.addEventListener('focusin',e=>{if(!e.target.closest('.theme-picker'))close()});
 media.addEventListener('change',()=>{if(choice==='system')apply()});apply();
}
