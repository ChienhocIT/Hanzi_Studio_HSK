import {test,expect} from '@playwright/test';
import {mockCloud,vocab} from './cloud-fixture.mjs';

const levels=['1','2','3','4','5','6','7-9'];
const words=['好','学生','水','书'];
const bank=levels.flatMap((level,l)=>words.map((word,i)=>({...vocab()[0],seq:l*100+1+i,level,word,homograph:null,pinyin:['hǎo','xuésheng','shuǐ','shū'][i],gloss_en:[['good; well','student','water','book'][i]]})));
const world=()=>({vocab:structuredClone(bank),items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null});
const ratings=['Chưa nhớ','Khó nhớ','Đã nhớ','Rất dễ'];
const ratingNames=locator=>locator.evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label')));
const templateShape=locator=>locator.evaluate(root=>{const dataSlots=new Set(['study-counter','study-progress','study-card-status','front-label','card-index','card-front','card-back-hanzi','card-back-py','card-back-vi','card-part','card-example-zh','card-example-py','card-example-vi','study-nav-label','session-total','session-correct','session-hard']);const dynamic=new Set(['flipped','hidden','learning','mastered','reference-word','study-card-rating','long','mid']);const shape=node=>{const id=node.id?.replace(/^(syl|ref|hs)-/,'');const classes=[...node.classList].filter(c=>!dynamic.has(c)).sort();if(dataSlots.has(id)||id==='syllabus-card-examples')return [node.tagName,classes,'DATA'];return [node.tagName,classes,[...node.children].map(shape)];};return shape(root);});

test('Every CLEC deck uses the HSK 3 card format with four ratings and a concealed back',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html#study');
  const original=await templateShape(page.locator('#page-study .study-layout'));
  const study=page.locator('#page-study');
  for(const level of levels){
    await page.getByLabel('Bộ thẻ đang học').selectOption(level);
    const card=study.locator('[data-study-source="syl"]');
    await expect(card.locator('.reference-word')).toHaveText('好');
    await expect(card.locator('.card-face.reverse')).toHaveAttribute('inert','');
    await expect(card.getByRole('button',{name:'Đã nhớ',exact:true})).toHaveCount(0);
    expect(await templateShape(card.locator('.study-layout'))).toEqual(original);
    await card.getByRole('button',{name:/Mở đáp án/}).click();
    await expect(card.locator('.flashcard')).toHaveClass(/flipped/);
    await expect(card.locator('.card-back-py')).toHaveText('hǎo');
    await expect(card.locator('.card-meaning')).toContainText('good; well');
    expect(await ratingNames(card.locator('.rating button'))).toEqual(ratings);
    expect(await templateShape(card.locator('.study-layout'))).toEqual(original);
    await expect(card.locator('.example-section')).toContainText('Chưa có ví dụ đã duyệt');
    await card.getByRole('button',{name:/Ẩn đáp án/}).click();
    await expect(card.locator('.flashcard')).not.toHaveClass(/flipped/);
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')).progress)).toEqual({});
});

test('Four keyboard ratings save distinct schedules only for the active CLEC deck',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');
  await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  for(let i=0;i<4;i++){
    await page.locator('#page-study').getByRole('button',{name:/Mở đáp án/}).click();
    await page.keyboard.press(String(i+1));
  }
  const saved=await page.evaluate(()=>({curriculum:JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')).progress,legacy:JSON.parse(localStorage.getItem('hanzi-studio-hsk3-prod-v1')||'{"records":{}}').records}));
  expect(Object.keys(saved.curriculum)).toHaveLength(4);expect(saved.legacy).toEqual({});
  for(const [i,rating]of ['again','hard','good','easy'].entries()){
    expect(saved.curriculum['clec2025-'+(i+1)].lastRating).toBe(rating);
    expect(saved.curriculum['clec2025-'+(i+1)].interval).toBe([0,1,1,4][i]);
  }
  await expect(page.locator('#syl-session-total')).toHaveText('4');
  await expect(page.locator('#syl-session-correct')).toHaveText('2');
  await expect(page.locator('#syl-session-hard')).toHaveText('2');
  await page.locator('#page-study .study-card-filters').getByLabel('Chế độ',{exact:true}).selectOption('due');
  await expect(page.locator('#page-study [data-study-source="syl"]')).toHaveCount(0);
  await page.locator('#page-study .study-card-filters').getByLabel('Chế độ',{exact:true}).selectOption('learning');
  await expect(page.locator('#page-study .reference-word')).toHaveText('好');
});

test('A failed hard rating keeps the current CLEC card, history and answer',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  await page.locator('#page-study').getByRole('button',{name:/Mở đáp án/}).click();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-curriculum-v4')throw new DOMException('full','QuotaExceededError');return original.call(this,key,value);};});
  await page.locator('#page-study').getByRole('button',{name:'Khó nhớ',exact:true}).click();
  await expect(page.locator('#syllabus-status')).toContainText('Không lưu được lượt ôn');await expect(page.locator('#page-study .reference-word')).toHaveText('好');
  await expect(page.locator('#page-study .flashcard.flipped')).toBeVisible();
  expect(await page.evaluate(()=>hs30State.progress)).toEqual({});
  await expect(page.locator('#syl-session-total')).toHaveText('0');
});

test('Reference and roadmap cards share the same controls, keep source histories and roll back failed saves',async({page})=>{
  await page.goto('/index.html#contenthub');await page.getByRole('button',{name:'Mở bộ từ tham khảo',exact:true}).click();
  const ref=page.locator('#reference-panel');await ref.getByRole('button',{name:'Luyện thẻ tham khảo',exact:true}).click();
  expect(await templateShape(ref.locator('.study-layout'))).toEqual(await templateShape(page.locator('#page-study .study-layout')));
  const id=await ref.locator('.reference-word').textContent();await ref.getByRole('button',{name:/Mở đáp án/}).click();
  expect(await ratingNames(ref.locator('.rating button'))).toEqual(ratings);await ref.getByRole('button',{name:'Rất dễ',exact:true}).click();
  expect(await page.evaluate(word=>hs30State.progress['wiktionary-hsk2-1-'+word].lastRating,id)).toBe('easy');
  await page.evaluate(()=>nav('path'));const path=page.locator('#v4-path');
  await path.locator('.classic-study').getByRole('button',{name:/Mở đáp án/}).click();expect(await ratingNames(path.locator('.rating button'))).toEqual(ratings);
  expect(await templateShape(path.locator('.study-layout'))).toEqual(await templateShape(page.locator('#page-study .study-layout')));
  const before=await path.locator('.reference-word').textContent();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-curriculum-v4')throw new DOMException('full','QuotaExceededError');return original.call(this,key,value);};});
  await path.getByRole('button',{name:'Khó nhớ',exact:true}).click();await expect(path.locator('.reference-word')).toHaveText(before);
  expect(await page.evaluate(()=>Object.keys(hs30State.progress).filter(id=>id.startsWith('userhsk3-')))).toEqual([]);
});

test('Library word links, library groups and smart review return to the original deck',async({page})=>{
  await mockCloud(page,'student',{world:world()});await page.goto('/index.html#study');
  await page.evaluate(()=>{S.records[1]={reps:1,interval:1,due:Date.now()-1000,last:Date.now()-60000,stage:'learning'};persist();});
  const picker=page.getByLabel('Bộ thẻ đang học');
  await picker.selectOption('2');await page.evaluate(()=>nav('library'));await page.locator('#library-rows [data-open-id]').first().click();
  await expect(picker).toHaveValue('hsk3');await expect(page.locator('#card-front')).toHaveText('矮');
  await picker.selectOption('2');await page.evaluate(()=>nav('library'));await page.locator('#library-study-filter').click();await expect(picker).toHaveValue('hsk3');
  await picker.selectOption('2');await page.evaluate(()=>nav('review'));await page.locator('#review-start').click();
  await expect(picker).toHaveValue('hsk3');await expect(page.locator('#study-filter')).toHaveValue('due');await expect(page.locator('#card-front')).toHaveText('矮');
  expect(await page.evaluate(()=>hs30State.progress)).toEqual({});
});

test('A chapter chosen in the flashcard selector resumes its own location across decks',async({page})=>{
  const data=world();data.vocab=[...data.vocab.filter(r=>r.level!=='1'),...Array.from({length:60},(_,i)=>({...bank[0],seq:i+1,word:'字'+(i+1)}))];
  await mockCloud(page,'student',{world:data});await page.goto('/index.html#study');const picker=page.getByLabel('Bộ thẻ đang học');await picker.selectOption('1');
  const filters=page.locator('.study-card-filters');await filters.getByLabel('Bộ từ',{exact:true}).selectOption('1');await expect(page.locator('#page-study .reference-word')).toHaveText('字51');
  await page.locator('#page-study').getByRole('button',{name:'Thẻ sau',exact:true}).click();
  await picker.selectOption('2');await picker.selectOption('1');await expect(filters.getByLabel('Bộ từ',{exact:true})).toHaveValue('1');await expect(page.locator('#page-study .reference-word')).toHaveText('字52');
});

test('Switching to an uncached deck conceals the old card until its own words arrive',async({page})=>{
  const data=world();data.vocab.find(r=>r.level==='2').word='中国';
  await mockCloud(page,'student',{world:data});let release;
  const ready=new Promise(resolve=>release=resolve);
  await page.route('**/rest/v1/vocab_entries?**',async route=>{if(new URL(route.request().url()).searchParams.get('level')==='eq.2')await ready;await route.fallback();});
  await page.goto('/index.html#study');const picker=page.getByLabel('Bộ thẻ đang học');await picker.selectOption('1');await expect(page.locator('#study-syllabus-slot .reference-word')).toHaveText('好');
  await picker.selectOption('2');await expect(page.locator('#study-syllabus-slot .study-card-skeleton')).toBeVisible();await expect(page.locator('#study-syllabus-slot .flashcard')).toHaveCount(0);
  release();await expect(page.locator('#study-syllabus-slot .reference-word')).toHaveText('中国');
});
