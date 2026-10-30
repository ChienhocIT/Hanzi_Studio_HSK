import {test,expect} from '@playwright/test';
import {mockCloud,vocab} from './cloud-fixture.mjs';

const rows=['好','学生','水','猫','书'].map((word,i)=>({...vocab()[0],seq:i+1,word,homograph:null,pinyin:['hǎo','xuésheng','shuǐ','māo','shū'][i],gloss_en:[['good','student','water','cat','book'][i]]}));
const world=words=>({vocab:words,items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null});
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')));

test('Pinyin practice hides the reading until answered, keeps keyboard focus and saves its mode across reloads',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await mockCloud(page,'student',{world:world(rows.map(r=>({...r,gloss_en:[]})))});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Luyện pinyin',exact:true}).click();
  let wrongWord;
  for(let i=0;i<rows.length;i++){
    const word=await panel.locator('.reference-word').textContent(),answer=rows.find(r=>r.word===word).pinyin;
    const options=panel.locator('[data-syl="quiz-answer"]');
    await expect(options).toHaveCount(4);await expect(options.first()).toBeFocused();
    await expect(panel.locator('#syllabus-results > p[lang="zh-Latn"]')).toHaveCount(0);
    if(i===0)await page.screenshot({path:'test-results/pinyin-mobile.png'});
    if(i===0){wrongWord=word;const labels=await options.allTextContents();await options.nth(labels.findIndex(t=>t!==answer)).click();}
    else await panel.getByRole('button',{name:answer,exact:true}).click();
    await expect(options.first()).toBeDisabled();
    await expect(panel.locator('#syllabus-results > p[lang="zh-Latn"]')).toHaveText(answer);
    const next=panel.getByRole('button',{name:i===rows.length-1?'Xem kết quả':'Câu tiếp theo',exact:true});
    await expect(next).toBeFocused();await page.keyboard.press('Enter');
  }
  await expect(panel.getByRole('heading',{name:'Kết quả luyện tập: 4/5',exact:true})).toBeFocused();
  const saved=await stored(page);
  expect(saved.syllabusQuizzes[0]).toMatchObject({kind:'pinyin',scope:'selection',total:5,correct:4});expect(saved.progress).toEqual({});
  await panel.getByRole('button',{name:'Luyện lại từ sai',exact:true}).click();
  await expect(panel).toContainText('Câu 1/1 · Chọn pinyin');await expect(panel.locator('.reference-word')).toHaveText(wrongWord);
  await page.reload();expect((await stored(page)).syllabusQuizzes).toEqual(saved.syllabusQuizzes);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hanzi:syllabus-quiz',{detail:{level:'1',kind:'unknown',total:1,correct:1,wrong:[]}})));
  expect((await stored(page)).syllabusQuizzes).toEqual(saved.syllabusQuizzes);
});

for(const kind of ['meaning','pinyin'])test(`${kind} quizzes ask only due words and preserve their SRS schedule`,async({page})=>{
  await mockCloud(page,'student',{world:world(rows)});
  await page.addInitScript(()=>localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({progress:{'clec2025-2':{reps:1,due:1},'clec2025-5':{reps:2,due:1},'clec2025-3':{reps:3,due:Date.now()+86400000}}})));
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel'),before=(await stored(page)).progress;
  await panel.getByRole('button',{name:'Ôn từ đến hạn',exact:true}).click();
  await panel.getByRole('button',{name:kind==='pinyin'?'Luyện pinyin':'Luyện trắc nghiệm',exact:true}).click();
  const seen=[];
  for(let i=0;i<2;i++){
    await expect(panel).toContainText(`Câu ${i+1}/2`);
    const word=await panel.locator('.reference-word').textContent(),row=rows.find(r=>r.word===word);seen.push(row.seq);
    await panel.getByRole('button',{name:kind==='pinyin'?row.pinyin:row.gloss_en[0],exact:true}).click();
    await panel.getByRole('button',{name:i===1?'Xem kết quả':'Câu tiếp theo',exact:true}).click();
  }
  expect(seen.sort()).toEqual([2,5]);const saved=await stored(page);
  expect(saved.progress).toEqual(before);expect(saved.syllabusQuizzes[0]).toMatchObject({kind,scope:'due',total:2,correct:2});
  await panel.getByRole('button',{name:'Bài luyện mới',exact:true}).click();
  await expect(panel).toContainText(`Câu 1/2 · ${kind==='pinyin'?'Chọn pinyin':'Chọn nghĩa tiếng Anh'} · từ đến hạn ôn`);
});

test('A due queue without scheduled words cannot silently start a quiz over the full level',async({page})=>{
  await mockCloud(page,'student',{world:world(rows)});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Ôn từ đến hạn',exact:true}).click();
  for(const name of ['Luyện trắc nghiệm','Luyện pinyin']){
    await panel.getByRole('button',{name,exact:true}).click();
    await expect(panel.locator('#syllabus-status')).toContainText('Chưa có từ đến hạn đủ điều kiện');
    await expect(panel.locator('[data-syl="quiz-answer"]')).toHaveCount(0);
  }
});

test('Due card audio and ratings target the visible word rather than the first word of the level',async({page})=>{
  await mockCloud(page,'student',{world:world(rows)});
  await page.addInitScript(()=>localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({progress:{'clec2025-2':{reps:1,interval:1,due:1}}})));
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await page.evaluate(()=>{window.spoken=[];window.speak=text=>window.spoken.push(text);});
  await panel.getByRole('button',{name:'Ôn từ đến hạn',exact:true}).click();
  await expect(panel.locator('.reference-word')).toHaveText('学生');
  await panel.getByRole('button',{name:'Nghe',exact:true}).click();
  expect(await page.evaluate(()=>window.spoken)).toEqual(['学生']);
  await panel.getByRole('button',{name:/Mở đáp án/}).click();
  await panel.getByRole('button',{name:'Đã nhớ',exact:true}).click();
  await expect(panel).toContainText('Chưa có từ nào đến hạn ôn');
  const saved=await stored(page);expect(saved.progress['clec2025-2'].reps).toBe(2);expect(saved.progress['clec2025-1']).toBeUndefined();
});
