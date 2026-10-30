import {test,expect} from '@playwright/test';
import {writeFile,unlink} from 'node:fs/promises';

test('A failed native bookmark save rolls back the card state',async({page})=>{
  await page.goto('/index.html#study');await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-hsk3-prod-v1')throw new DOMException('full','QuotaExceededError');return original.call(this,key,value);};});
  await page.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await expect(page.locator('#study-bookmark')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>S.bookmarks)).toEqual([]);await expect(page.locator('#toast')).toContainText('Không lưu được');
});

test('An invalid full backup is rejected before confirmation or storage writes',async({page})=>{
  await page.goto('/index.html#settings');const before=await page.evaluate(()=>localStorage.getItem('hanzi-studio-curriculum-v4'));let dialogs=0;page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
  const backup={format:'hanzi-studio-full-backup',version:1,storage:{'hanzi-studio-curriculum-v4':JSON.stringify({progress:{},injected:'invalid',importLog:[]})}};
  await page.locator('#hs-all-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(page.locator('#hs-all-status')).toContainText('Lộ trình sai cấu trúc');expect(dialogs).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-studio-curriculum-v4'))).toBe(before);
});

test('A fresh shell bypasses stale scripts in a previously installed service worker',async({browser,baseURL})=>{
  const file='dist/__legacy-cache-test.js';
  await writeFile(file,"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.pathname.endsWith('/cloud.bundle.js')&&!url.search)event.respondWith(new Response('window.__staleBundle=true;',{headers:{'content-type':'text/javascript'}}));});",{flag:'wx'});
  const context=await browser.newContext({serviceWorkers:'allow'});
  try{
    const page=await context.newPage();await page.goto(baseURL+'/privacy.html');
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/__legacy-cache-test.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    expect(await page.evaluate(()=>fetch('/cloud.bundle.js').then(response=>response.text()))).toContain('__staleBundle');
    await page.goto(baseURL+'/index.html#study');await expect.poll(()=>page.evaluate(()=>typeof window.HanziStudyCards)).toBe('object');expect(await page.evaluate(()=>window.__staleBundle)).toBeUndefined();
    const versions=await page.locator('script[src]').evaluateAll(scripts=>scripts.map(script=>new URL(script.src).searchParams.get('v')));expect(versions.every(version=>/^[a-f0-9]{12}$/.test(version))).toBe(true);expect(new Set(versions).size).toBe(1);
  }finally{await context.close();await unlink(file);}
});
