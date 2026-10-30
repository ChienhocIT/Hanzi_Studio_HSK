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
  await page.goto('/privacy.html');await page.setContent('<main id="fixture"></main>');await page.evaluate(async()=>{const html=await fetch('/index.html').then(r=>r.text()),doc=new DOMParser().parseFromString(html,'text/html'),holder=document.createElement('div');holder.id='page-study';holder.hidden=true;holder.append(doc.querySelector('#page-study .study-layout'));document.body.append(holder);});await page.addScriptTag({content:component});
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
const example=(zh_id,zh,vi,review_status)=>({seq:1,zh_id,zh,zh_author:'amy',vi_id:zh_id+100,vi,vi_author:null,license:'CC BY 2.0 FR',review_status});
test('Library cards show only reviewed Tatoeba examples to learners, credited per sentence',async({page})=>{
  await mockCloud(page,'student',{world:{vocab:vocab(),examples:[example(7,'你好！','Xin chào!','published'),example(8,'好不好？','Được không?','draft')],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.locator('[data-syl-stage="0"]').click();
  await expect(panel.locator('.reference-word')).toHaveText('好');await expect(panel.locator('.syllabus-examples')).toHaveCount(0);
  await panel.getByRole('button',{name:/Mở đáp án/}).click();
  const list=panel.locator('.syllabus-examples li');
  await expect(list).toHaveCount(1);await expect(list).toContainText('你好！');await expect(list).toContainText('Xin chào!');
  await expect(list).toContainText('Tatoeba #7 (amy) · bản dịch #107 · CC BY 2.0 FR');
  await expect(list.getByRole('link',{name:'#7'})).toHaveAttribute('href','https://tatoeba.org/vi/sentences/show/7');
  await expect(list.getByRole('button',{name:'Duyệt'})).toHaveCount(0);
  await expect(list.getByRole('button',{name:'Nghe câu 你好！'})).toBeVisible();
  await expect(panel.locator('.flashcard')).toHaveAttribute('role','group');
  await list.getByRole('link',{name:'#7'}).evaluate(link=>link.addEventListener('click',event=>event.preventDefault(),{once:true}));
  await list.getByRole('link',{name:'#7'}).click();
  await expect(panel.locator('.flashcard')).toHaveClass(/flipped/);
  await panel.getByRole('button',{name:/Ẩn đáp án/}).focus();await page.keyboard.press('Space');
  await expect(panel.locator('.flashcard')).not.toHaveClass(/flipped/);
});
test('Administrators review each example sentence on the card',async({page})=>{
  const {data,calls}=await mockCloud(page,'admin',{world:{vocab:vocab(),examples:[example(8,'好不好？','Được không?','draft')],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.locator('[data-syl-stage="0"]').click();
  await panel.getByRole('button',{name:/Mở đáp án/}).click();
  const item=panel.locator('.syllabus-examples li');
  await expect(item).toContainText('Bản nháp');
  await item.getByRole('button',{name:'Duyệt',exact:true}).click();
  await expect(page.locator('#syllabus-status')).toHaveText('Đã chuyển câu ví dụ sang “Đã xuất bản”.');
  await expect(item).toContainText('Đã xuất bản');await expect(item.getByRole('button',{name:'Duyệt',exact:true})).toHaveCount(0);
  expect(data.examples[0].review_status).toBe('published');
  expect(calls.find(c=>c.path.endsWith('/review_example_sentences')).body).toEqual({entry_syllabus:'HSK 3.0 (CLEC 2025)',entry_seq:1,entry_zh_ids:[8],decision:'published'});
});

test('Example loading can be retried and sentence text cannot inject markup',async({page})=>{
  await mockCloud(page,'student',{world:{vocab:vocab(),items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  let attempts=0;
  await page.route('**/rest/v1/example_sentences?**',route=>{
    if(++attempts===1)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'example query failed'})});
    return route.fulfill({json:[example(7,'你好 <img src=x onerror="window.injected=true">','Xin chào <script>window.injected=true</script>','published')]});
  });
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.locator('[data-syl-stage="0"]').click();
  await panel.getByRole('button',{name:/Mở đáp án/}).click();
  await panel.getByRole('button',{name:'Thử tải lại câu ví dụ',exact:true}).click();
  await expect(panel.locator('.syllabus-examples li')).toContainText('<img src=x');
  await expect(panel.locator('.syllabus-examples img, .syllabus-examples script')).toHaveCount(0);
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();expect(attempts).toBe(2);
});

test('Review in the due queue targets the visible word and does not claim a missing row was updated',async({page})=>{
  const sentence={...example(8,'学生来了。','Học sinh đến rồi.','draft'),seq:2};
  const {calls,data}=await mockCloud(page,'admin',{world:{vocab:vocab(),examples:[sentence],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null}});
  await page.addInitScript(()=>localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({progress:{'clec2025-2':{reps:1,due:1}}})));
  await page.goto('/index.html#hsk');const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Ôn từ đến hạn',exact:true}).click();
  await panel.getByRole('button',{name:/Mở đáp án/}).click();
  await panel.locator('.syllabus-examples').getByRole('button',{name:'Duyệt',exact:true}).click();
  await expect(panel.locator('.syllabus-examples')).toContainText('Đã xuất bản');
  expect(calls.find(c=>c.path.endsWith('/review_example_sentences')).body.entry_seq).toBe(2);
  data.examples=[];
  await panel.locator('.syllabus-examples').getByRole('button',{name:'Từ chối',exact:true}).click();
  await expect(page.locator('#syllabus-status')).toHaveText('Câu ví dụ không còn tồn tại. Đã tải lại danh sách.');
  await expect(panel.locator('.syllabus-examples')).toHaveCount(0);
});

test('A late staff example response cannot populate another account card',async({page})=>{
  await harness(page);
  await page.evaluate(()=>{
    const word={seq:1,word:'好',pinyin:'hǎo',level:'1',extra_levels:[],pos:[],pos_extra:[],review_status:'published',gloss_en:['good']};
    const query=promise=>({select(){return this;},eq(){return this;},order(){return this;},range(){return promise;},then(resolve,reject){return promise.then(resolve,reject);}});
    window.oldExample=new Promise(resolve=>window.releaseExample=resolve);
    window.syllabus=window.mountSyllabus(document.querySelector('#fixture'));
    window.syllabus.setSession({from:table=>query(table==='vocab_entries'?Promise.resolve({data:[word]}):window.oldExample)},{id:'staff',role:'admin'});
    window.learner={from:table=>query(Promise.resolve({data:table==='vocab_entries'?[word]:[]}))};
  });
  await page.locator('[data-syl-stage="0"]').click();
  await page.getByRole('button',{name:/Mở đáp án/}).click();
  await expect(page.locator('.syllabus-examples')).toContainText('Đang tải');
  await page.evaluate(()=>window.syllabus.setSession(window.learner,{id:'learner',role:'student'}));
  await page.locator('[data-syl-stage="0"]').click();
  await page.getByRole('button',{name:/Mở đáp án/}).click();
  await expect(page.locator('.syllabus-examples')).toHaveCount(0);
  await page.evaluate(()=>window.releaseExample({data:[{zh_id:8,zh:'私密草稿',vi:'Bản nháp riêng',review_status:'draft'}]}));
  await page.getByRole('button',{name:/Ẩn đáp án/}).click();
  await page.getByRole('button',{name:/Mở đáp án/}).click();
  await expect(page.locator('#fixture')).not.toContainText('私密草稿');
  await expect(page.locator('.syllabus-examples')).toHaveCount(0);
});
