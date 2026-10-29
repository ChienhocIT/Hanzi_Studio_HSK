import {test,expect} from '@playwright/test';
import {buildSync} from 'esbuild';
import {mockCloud,vocab} from './cloud-fixture.mjs';
const component=buildSync({stdin:{contents:"import {mountSyllabus} from './src/syllabus.js';import {mountTutor} from './src/tutor.js';window.mountSyllabus=mountSyllabus;window.mountTutor=mountTutor;",resolveDir:process.cwd()},bundle:true,format:'iife',write:false}).outputFiles[0].text;
test('Vocabulary practice scores once, retries mistakes and saves history without changing SRS',async({page})=>{
  const rows=[...vocab(),{...vocab()[0],seq:4,word:'水',pinyin:'shuǐ',gloss_en:['water']},{...vocab()[0],seq:5,word:'猫',pinyin:'māo',gloss_en:['cat']}];
  await mockCloud(page,'student',{world:{vocab:rows,items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(panel.locator('.syllabus-table tbody tr')).toHaveCount(5);
  await panel.getByRole('button',{name:'Luyện trắc nghiệm',exact:true}).click();
  for(let i=0;i<5;i++) {
    const word=await panel.locator('.reference-word').textContent(),answer=rows.find(r=>r.word===word).gloss_en[0];
    const options=panel.locator('[data-syl="quiz-answer"]');
    if(i===0){const labels=await options.allTextContents();await options.nth(labels.findIndex(t=>t!==answer)).click();}
    else await panel.getByRole('button',{name:answer,exact:true}).click();
    await expect(options).toHaveCount(4);await expect(options.first()).toBeDisabled();
    await panel.getByRole('button',{name:i===4?'Xem kết quả':'Câu tiếp theo',exact:true}).click();
  }
  await expect(panel).toContainText('Kết quả luyện tập: 4/5');await expect(panel).toContainText('Đã lưu kết quả trên thiết bị');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')));
  expect(saved.syllabusQuizzes).toHaveLength(1);expect(saved.syllabusQuizzes[0].correct).toBe(4);expect(saved.progress).toEqual({});
  await panel.getByRole('button',{name:'Luyện lại từ sai',exact:true}).click();
  await expect(panel).toContainText('Câu 1/1');
  const word=await panel.locator('.reference-word').textContent();
  await panel.getByRole('button',{name:rows.find(r=>r.word===word).gloss_en[0],exact:true}).click();
  await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-studio-curriculum-v4')throw new DOMException('full','QuotaExceededError');return window.originalSet.call(this,key,value);};});
  await panel.getByRole('button',{name:'Xem kết quả',exact:true}).click();
  await expect(panel).toContainText('Chưa lưu được kết quả');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')).syllabusQuizzes.length)).toBe(1);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);
  await panel.getByRole('button',{name:'Lưu lại kết quả',exact:true}).click();
  await expect(panel).toContainText('Đã lưu kết quả trên thiết bị');await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')).syllabusQuizzes.length)).toBe(2);
});
test('A narrow vocabulary search cannot produce an ambiguous quiz',async({page})=>{
  await mockCloud(page,'student',{world:{vocab:vocab(),items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(panel.locator('.syllabus-table tbody tr')).toHaveCount(3);
  await panel.getByRole('button',{name:'Luyện trắc nghiệm',exact:true}).click();
  await expect(panel.locator('#syllabus-status')).toContainText('Cần ít nhất 4 từ');
  await expect(panel.locator('[data-syl="quiz-answer"]')).toHaveCount(0);
});
async function harness(page) {
  await page.goto('/privacy.html');await page.setContent('<main id="fixture"></main>');await page.addScriptTag({content:component});
}
test('A delayed staff vocabulary response cannot populate another account cache',async({page})=>{
  await harness(page);
  await page.evaluate(()=>{
    const query=promise=>({select(){return this;},eq(){return this;},order(){return this;},range(){return promise;}});
    const old={from:()=>query(new Promise(resolve=>window.releaseVocabulary=resolve))};
    const next={from:()=>query(Promise.resolve({data:[{seq:1,word:'公开',pinyin:'gōngkāi',level:'1',extra_levels:[],pos:[],pos_extra:[],review_status:'published',gloss_en:['public']}]}))};
    window.syllabus=window.mountSyllabus(document.querySelector('#fixture'));
    window.syllabus.setSession(old,{id:'staff',role:'admin'});window.syllabus.setSession(next,{id:'learner',role:'student'});
  });
  await page.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(page.locator('.syllabus-table')).toContainText('公开');
  await page.evaluate(()=>window.releaseVocabulary({data:[{seq:99,word:'私密草稿',pinyin:'sīmì',level:'1',extra_levels:[],pos:[],pos_extra:[],review_status:'draft',gloss_en:['secret']}]}));
  await page.getByRole('button',{name:'Tra cứu',exact:true}).click();
  await page.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(page.locator('.syllabus-table')).toContainText('公开');await expect(page.locator('#fixture')).not.toContainText('私密草稿');
});
test('An old tutor answer and quota cannot reappear after account switching',async({page})=>{
  await harness(page);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluate(()=>{
    let calls=0;window.fetch=()=>++calls===1?new Promise(resolve=>window.releaseAnswer=resolve):Promise.resolve(new Response('Câu trả lời mới'));
    const user=(quota)=>({auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},rpc:()=>quota});
    window.tutor=window.mountTutor(document.querySelector('#fixture'));
    window.oldQuota=new Promise(resolve=>window.releaseQuota=resolve);
    window.nextUser=user(Promise.resolve({data:30}));window.tutor.setSession(user(window.oldQuota),{id:'first'});
  });
  await page.getByLabel('Câu hỏi cho Mây Long').fill('Thông tin của tài khoản cũ');await page.getByRole('button',{name:'Gửi',exact:true}).click();
  await page.evaluate(()=>window.tutor.setSession(window.nextUser,{id:'second'}));
  await page.evaluate(()=>{window.releaseAnswer(new Response('Đáp án của tài khoản cũ'));window.releaseQuota({data:3});});
  await expect(page.locator('#tutor-quota')).toHaveText('Còn 30/30 lượt hôm nay');await expect(page.locator('#fixture')).not.toContainText('tài khoản cũ');
  await page.getByLabel('Câu hỏi cho Mây Long').fill('Câu hỏi mới');await page.getByRole('button',{name:'Gửi',exact:true}).click();
  await expect(page.locator('.tutor-msg.from-tutor')).toContainText('Câu trả lời mới');expect(errors).toEqual([]);
});
test('A pending sentence grade cannot restore the previous account private text',async({page})=>{
  await harness(page);
  await page.evaluate(()=>{
    window.fetch=()=>new Promise(resolve=>window.releaseGrade=resolve);
    window.user={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},rpc:async()=>({data:30})};
    window.tutor=window.mountTutor(document.querySelector('#fixture'));window.tutor.setSession(window.user,{id:'first'});
  });
  await page.getByRole('tab',{name:'Chấm câu',exact:true}).click();
  await page.getByLabel('Câu tiếng Trung của bạn').fill('我的私人句子');await page.getByRole('button',{name:'Chấm câu',exact:true}).click();
  await page.evaluate(()=>window.tutor.setSession(window.user,{id:'second'}));
  await page.evaluate(()=>window.releaseGrade(Response.json({result:{score:100,corrected:'我的私人句子',pinyin:'private',feedback:'old account',errors:[]}})));
  await expect(page.getByLabel('Câu tiếng Trung của bạn')).toHaveValue('');await expect(page.locator('#fixture')).not.toContainText('我的私人句子');
  await expect(page.getByRole('button',{name:'Chấm câu',exact:true})).toBeEnabled();
});
