import {test,expect} from '@playwright/test';
import {mockCloud,vocab} from './cloud-fixture.mjs';
const rows=[...vocab(),{...vocab()[0],seq:4,word:'水',pinyin:'shuǐ',gloss_en:['water']},{...vocab()[0],seq:5,word:'猫',pinyin:'māo',gloss_en:['cat']}];
const world=()=>({vocab:rows,items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null});
test('A learner reports an ambiguous question without answering it or changing SRS',async({page})=>{
 const {calls,data}=await mockCloud(page,'student',{world:world()});
 await page.goto('/index.html#hsk');await page.getByRole('button',{name:'Luyện trắc nghiệm',exact:true}).click();
 const before=await page.locator('.reference-word').textContent();
 await page.getByRole('button',{name:'Báo câu cần kiểm tra',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Báo câu cần kiểm tra'});
 await dialog.getByLabel('Ghi chú (không bắt buộc)').fill('Hai nghĩa có thể dùng trong ngữ cảnh này.');
 await dialog.getByRole('button',{name:'Gửi báo cáo',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Đã gửi vào hàng đợi');
 await dialog.getByRole('button',{name:'Đóng',exact:true}).click();await expect(page.locator('.reference-word')).toHaveText(before);
 await expect(page.locator('[data-syl="quiz-answer"]').first()).toBeEnabled();expect(data.vocabReports).toHaveLength(1);
 expect(calls.find(c=>c.path.endsWith('/report_vocab_question')).body.question_options).toHaveLength(4);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')||'{"progress":{}}').progress)).toEqual({});
 await page.getByRole('button',{name:'Báo câu cần kiểm tra',exact:true}).click();await expect(dialog.getByRole('button',{name:'Gửi báo cáo',exact:true})).toBeDisabled();
});
test('An administrator reviews an escaped report and resolves it with an explicit note',async({page})=>{
 const state=world();state.vocabReports=[{id:'00000000-0000-4000-8000-000000000100',seq:1,kind:'meaning',reason:'ambiguous',message:'<img src=x onerror="window.injected=true">',options:['good','well','water','cat'],correct_option:0,status:'open'}];
 const {data}=await mockCloud(page,'admin',{world:state});await page.goto('/index.html#hsk');
 await page.getByText('Câu cần kiểm tra',{exact:true}).click();await page.getByRole('button',{name:'Tải báo cáo đang chờ',exact:true}).click();
 const item=page.locator('.vocab-report-item');await expect(item).toContainText('<img src=x');await expect(item.locator('img')).toHaveCount(0);
 await item.getByLabel('Kết quả kiểm tra').fill('Đã đối chiếu, chuyển chỉnh nghĩa sang quy trình biên tập.');
 await item.getByRole('button',{name:'Đánh dấu đã xử lý',exact:true}).click();await expect(item.getByRole('status')).toContainText('Đã xử lý');expect(data.vocabReports[0].status).toBe('resolved');
 expect(await page.evaluate(()=>window.injected)).toBeUndefined();
});
