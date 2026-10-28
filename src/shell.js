// Public pages (welcome, auth): scroll reveal, section links, role tabs, theme toggle, mascot.
import { mountCycle, setMood, pop } from './mascot.js';

export function mountShell() {
  document.documentElement.classList.add('js-reveal');
  const reveal='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-in');reveal.unobserve(entry.target);}
  },{rootMargin:'0px 0px -8% 0px',threshold:.12}):null;
  document.querySelectorAll('.reveal').forEach(el=>reveal?reveal.observe(el):el.classList.add('is-in'));

  const nav=document.querySelector('.pub-nav'),hero=document.querySelector('.pub-hero');
  if(nav&&hero&&'IntersectionObserver' in window)new IntersectionObserver(([entry])=>nav.classList.toggle('is-stuck',!entry.isIntersecting),{threshold:.9}).observe(hero);

  mountCycle(document.getElementById('hero-sticker'));
  syncThemeIcons();

  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-scroll],[data-start],[data-theme-toggle],[data-role-tab],[data-speak]');
    if(!target)return;
    if(target.dataset.scroll!==undefined)document.getElementById(target.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    if(target.dataset.start!==undefined){try{localStorage.setItem('hanzi-welcome-seen','1');}catch{}}
    if(target.dataset.themeToggle!==undefined){document.getElementById('toggle-theme')?.click();syncThemeIcons();}
    if(target.dataset.roleTab)selectRole(target.dataset.roleTab,false);
    if(target.dataset.speak&&'speechSynthesis' in window){const voice=new SpeechSynthesisUtterance(target.dataset.speak);voice.lang='zh-CN';speechSynthesis.cancel();speechSynthesis.speak(voice);}
  });
  document.querySelector('.role-tabs')?.addEventListener('keydown',event=>{
    const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')],index=tabs.indexOf(document.activeElement);
    if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    selectRole(tabs[next].dataset.roleTab,true);
  });
  window.addEventListener('hanzi:route',event=>{if(event.detail==='auth')setMood('hello');});
}
function selectRole(role,focus) {
  document.querySelectorAll('[data-role-tab]').forEach(tab=>{
    const on=tab.dataset.roleTab===role;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;if(on&&focus)tab.focus();
  });
  document.querySelectorAll('.role-panel').forEach(panel=>{panel.hidden=panel.id!==`role-${role}`;});
  const panel=document.getElementById(`role-${role}`),img=document.getElementById('role-mascot');
  if(panel&&img){img.src=panel.dataset.mascot;pop(img);}
}
// The legacy toggle owns the theme; mirror its icon on the public pages.
function syncThemeIcons() {
  const source=document.getElementById('toggle-theme');
  if(source)document.querySelectorAll('[data-theme-toggle]').forEach(el=>{el.innerHTML=source.innerHTML;});
}
