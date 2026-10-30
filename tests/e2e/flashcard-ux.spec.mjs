import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {mockCloud,vocab} from './cloud-fixture.mjs';
const bank=[...Array.from({length:60},(_,i)=>({...vocab()[0],seq:i+1,word:'字'+(i+1),homograph:null,gloss_en:['meaning '+i]})),...Array.from({length:5},(_,i)=>({...vocab()[0],seq:i+1001,level:'2',word:'词'+(i+1),homograph:null}))];
const world={vocab:bank,items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null};
test('Switching decks and reloading resumes each level without duplicate level controls',async({page})=>{
  await mockCloud(page,'student',{world:structuredClone(world)});
  await page.goto('/index.html#study');const picker=page.getByLabel('Bộ thẻ đang học'),study=page.locator('#page-study');
  await picker.selectOption('1');await study.locator('[data-syl-stage="0"]').click();
  await expect(study.locator('.hsk-levels')).toBeHidden();
  await study.getByRole('button',{name:'Thẻ sau',exact:true}).click();
  await expect(study.locator('.reference-word')).toHaveText('字2');
  await picker.selectOption('2');await study.locator('[data-syl-stage="0"]').click();
  await expect(study.locator('.reference-word')).toHaveText('词1');
  await picker.selectOption('1');await expect(study.locator('.reference-word')).toHaveText('字2');
  await page.reload();await expect(picker).toHaveValue('1');await expect(study.locator('.reference-word')).toHaveText('字2');
  await picker.selectOption('hsk3');await expect(page.locator('#study-active')).toBeVisible();
  await picker.selectOption('1');await page.evaluate(()=>nav('home'));await page.locator('[data-chapter="0"]').click();
  await expect(picker).toHaveValue('hsk3');await expect(page.locator('#study-active')).toBeVisible();
});
test('Study keyboard shortcuts affect only the visible deck and native buttons flip once',async({page})=>{
  await mockCloud(page,'student',{world:structuredClone(world)});
  await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  await page.locator('#page-study [data-syl-stage="0"]').click();
  const flip=page.locator('#page-study [data-syl="reveal"]');
  await page.locator('body').click({position:{x:2,y:300}});await page.keyboard.press('Space');
  await expect(flip).toHaveAttribute('aria-pressed','true');await expect(page.locator('#flashcard')).not.toHaveClass(/flipped/);
  await flip.focus();await page.keyboard.press('Space');await expect(flip).toHaveAttribute('aria-pressed','false');
  await page.keyboard.press('ArrowRight');await expect(page.locator('#page-study .reference-word')).toHaveText('字2');
});
test('Failed local storage does not advance a legacy card or claim its rating was saved',async({page})=>{
  await page.goto('/index.html#study');await page.locator('#flashcard').click();
  await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-hsk3-prod-v1')throw new DOMException('full','QuotaExceededError');return window.originalSet.call(this,key,value);};});
  await page.locator('[data-rating="good"]').click();
  await expect(page.locator('#study-counter')).toHaveText('Thẻ 1 / 500');await expect(page.locator('#session-total')).toHaveText('0');
  await expect(page.locator('#toast')).toContainText('Không lưu được tiến độ');
  await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);
  await page.locator('[data-rating="good"]').click();await expect(page.locator('#session-total')).toHaveText('1');
});
test('A deck load error has an explicit retry action',async({page})=>{
  await mockCloud(page,'student',{world:structuredClone(world)});let online=false;
  await page.route('**/rest/v1/vocab_entries?**',route=>{if(!online)return route.fulfill({status:400,json:{message:'offline'}});return route.fallback();});
  await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  const retry=page.getByRole('button',{name:'Thử tải lại bộ thẻ',exact:true});await expect(retry).toBeVisible();online=true;await retry.click();
  await expect(page.locator('#page-study .stage-tile')).toHaveCount(2);await expect(retry).toBeHidden();
});
test('Bundled stroke data is hash checked, retries corruption and needs no CDN for the pilot character',async({page})=>{
  const manifest=JSON.parse(await readFile('data/strokes/manifest.json','utf8')),entry=manifest.characters['矮'],bytes=await readFile('data/strokes/'+entry.file);
  let attempts=0,external=0;
  await page.route('https://cdn.jsdelivr.net/**',route=>{external++;return route.abort();});
  await page.route('**/data/strokes/'+entry.file,route=>route.fulfill({contentType:'application/json',body:++attempts===1?Buffer.concat([bytes,Buffer.from(' ')]):bytes}));
  await page.goto('/index.html#characters');await page.getByRole('button',{name:'Luyện viết có chấm nét',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByRole('status')).toContainText('Không tải được');
  await dialog.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(dialog.getByRole('status')).toContainText(`矮: ${entry.strokes} nét`);
  expect(external).toBe(0);
});
test('Flashcard controls fit small screens, landscape and both themes with reduced motion',async({page})=>{
  await mockCloud(page,'student',{world:structuredClone(world)});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');await page.locator('#page-study [data-syl-stage="0"]').click();
  for(const [name,width,height]of [['phone',375,812],['landscape',812,375],['desktop',1366,768]]){
    await page.setViewportSize({width,height});
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const control=page.locator('#page-study [data-syl="reveal"]');await control.scrollIntoViewIfNeeded();
      await page.screenshot({path:`test-results/flashcard-${name}-${theme}.png`,fullPage:true});
      const box=await page.locator('#page-study [data-syl="next"]').boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('Revealing a mobile card keeps its rating above the bottom navigation',async({page})=>{
 await page.setViewportSize({width:375,height:812});await mockCloud(page,'student',{world:structuredClone(world)});
 await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');await page.locator('#page-study [data-syl-stage="0"]').click();
 await page.locator('#page-study [data-syl="reveal"]').click();
 const box=await page.getByRole('button',{name:'Đã nhớ',exact:true}).boundingBox();
 expect(box.y).toBeGreaterThanOrEqual(70);expect(box.y+box.height).toBeLessThanOrEqual(742);
 await page.getByLabel('Bộ thẻ đang học').selectOption('hsk3');
 const select=await page.locator('#study-chapter').boundingBox();expect(select.width).toBeGreaterThan(120);
});

test('The installed PWA can load its bundled stroke pilot offline',async({browser,baseURL})=>{
 const context=await browser.newContext({serviceWorkers:'allow'});
 try{
  const page=await context.newPage();await page.goto(baseURL+'/index.html#characters');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'Luyện viết có chấm nét',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Viết chữ 矮:');
 }finally{await context.close();}
});
