import {test,expect} from '@playwright/test';
import {mockCloud,vocab} from './cloud-fixture.mjs';
const world=()=>({vocab:['1','2','3','4','5','6','7-9'].flatMap((level,i)=>vocab().map(r=>({...r,level,seq:i*100+r.seq}))),examples:[],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null});
const styles=workspace=>workspace.evaluate(root=>Object.fromEntries(['.flashcard','.card-hanzi','.card-back-hanzi','.card-back-py','.card-meaning','.card-head','.card-hint','.nav-arrow','.rate-btn','.field-select label','.field-select select','.icon-btn'].map(selector=>{const style=getComputedStyle(root.querySelector(selector));return [selector,Object.fromEntries(['fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','padding','color','backgroundColor'].map(key=>[key,style[key]]))];})));

test('Every deck matches the original computed styles on desktop/mobile and both themes',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');
  for(const size of [{width:1366,height:900},{width:375,height:812}]){
    await page.setViewportSize(size);
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await page.evaluate(()=>nav('study'));await page.getByLabel('Bộ thẻ đang học').selectOption('hsk3');
      const original=await styles(page.locator('#page-study > .study-workspace'));
      for(const level of ['1','2','3','4','5','6','7-9']){
        await page.getByLabel('Bộ thẻ đang học').selectOption(level);
        await expect(page.locator('#syl-flashcard .card-hanzi')).toBeVisible();
        await expect(page.locator('#syl-study-filter')).toBeVisible();
        expect(await styles(page.locator('#study-syllabus-slot .study-workspace'))).toEqual(original);
      }
      await page.evaluate(()=>nav('contenthub'));const ref=page.locator('#reference-panel');const load=ref.getByRole('button',{name:'Mở bộ từ tham khảo',exact:true});if(await load.count())await load.click();await ref.getByRole('button',{name:'Luyện thẻ tham khảo',exact:true}).click();expect(await styles(ref.locator('.study-workspace'))).toEqual(original);
      await page.evaluate(()=>nav('path'));expect(await styles(page.locator('#v4-path .study-workspace'))).toEqual(original);
    }
  }
});

test('Revealing a desktop card keeps the DOM, scroll position and original flip transition',async({page})=>{
  await page.setViewportSize({width:1366,height:1200});await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  const card=page.locator('#syl-flashcard');await expect(card).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await card.evaluate(el=>{el.dataset.instance='retained';});const top=await page.evaluate(()=>scrollY);
  await card.click();await expect(card).toHaveAttribute('data-instance','retained');
  expect(await page.evaluate(()=>scrollY)).toBe(top);
  expect(await card.locator('.flashcard-inner').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeGreaterThan(0);
  await page.getByRole('button',{name:/Ẩn đáp án/}).click();await expect(card).not.toHaveClass(/flipped/);await expect(card).toHaveAttribute('data-instance','retained');
});

test('The original toolbar reverses, shuffles and saves CLEC cards without touching HSK 3 history',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  const panel=page.locator('#study-syllabus-slot');await expect(panel.locator('.card-hanzi')).toContainText('好');
  await panel.getByRole('button',{name:'Đổi chiều học',exact:true}).click();await expect(panel.locator('.card-meaning-front')).toContainText('good; well');
  await panel.getByRole('button',{name:'Trộn thẻ',exact:true}).click();await expect(panel.getByRole('button',{name:'Trộn thẻ',exact:true})).toHaveAttribute('aria-pressed','true');
  await panel.getByRole('button',{name:'Trộn thẻ',exact:true}).click();
  await panel.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await expect(panel.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>hs30State.bookmarks)).toEqual(['clec2025-1']);expect(await page.evaluate(()=>S.bookmarks)).toEqual([]);expect(await page.evaluate(()=>hs30State.progress)).toEqual({});
  await panel.getByLabel('Chế độ',{exact:true}).selectOption('saved');await page.reload();await panel.getByLabel('Chế độ',{exact:true}).selectOption('saved');
  await expect(panel.locator('.reference-word')).toHaveText('好');
  await panel.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await expect(page.locator('#syl-study-empty')).toBeVisible();
  await panel.getByRole('button',{name:'Học tất cả thẻ',exact:true}).click();await expect(panel.locator('.reference-word')).toHaveText('好');
});

test('A failed bookmark save preserves the saved card and native toolbar state',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-curriculum-v4')throw new DOMException('full','QuotaExceededError');return original.call(this,key,value);};});
  await page.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await expect(page.locator('#syl-study-bookmark')).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>hs30State.bookmarks||[])).toEqual([]);
});

test('Reference and roadmap tools keep bookmarks separate and can recover from an empty saved filter',async({page})=>{
  await page.goto('/index.html#contenthub');await page.getByRole('button',{name:'Mở bộ từ tham khảo',exact:true}).click();const ref=page.locator('#reference-panel');await ref.getByRole('button',{name:'Luyện thẻ tham khảo',exact:true}).click();
  await ref.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await ref.getByLabel('Chế độ',{exact:true}).selectOption('saved');await expect(ref.locator('.reference-word')).toBeVisible();
  await page.evaluate(()=>nav('path'));const path=page.locator('#v4-path');await path.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await path.getByLabel('Chế độ',{exact:true}).selectOption('saved');await expect(path.locator('.reference-word')).toHaveText('矮');
  expect(await page.evaluate(()=>hs30State.bookmarks.some(id=>id.startsWith('wiktionary-hsk2-')))).toBe(true);expect(await page.evaluate(()=>hs30State.bookmarks.includes('userhsk3-1'))).toBe(true);
  await path.getByRole('button',{name:'Lưu thẻ yêu thích',exact:true}).click();await expect(path.locator('#hs-study-empty')).toBeVisible();await path.getByRole('button',{name:'Học tất cả thẻ',exact:true}).click();await expect(path.locator('.reference-word')).toHaveText('矮');
});
