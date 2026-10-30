import {test,expect} from '@playwright/test';
import {mockCloud,vocab} from './cloud-fixture.mjs';
const example=(seq,zh_id,zh,review_status='draft')=>({seq,zh_id,zh,zh_author:'writer',vi_id:zh_id+100,vi:'Bản dịch để duyệt',vi_author:'translator',license:'CC BY 2.0 FR',review_status});
test('Editorial review targets one sourced sentence and exposes the missing-meaning queue',async({page})=>{
 const state={vocab:[...vocab(),{...vocab()[0],seq:4,word:'未释',gloss_en:[]}],examples:[example(1,11,'你好。'),example(2,12,'学生来了。')],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null};
 const {data,calls}=await mockCloud(page,'admin',{world:state});await page.goto('/index.html#hsk');
 await page.getByText('Câu ví dụ chờ duyệt',{exact:true}).click();await page.getByRole('button',{name:'Tải lại câu nháp',exact:true}).click();
 const item=page.locator('[data-example-queue] article').filter({hasText:'学生来了。'});await expect(item).toContainText('writer #12');
 await item.getByRole('button',{name:'Duyệt câu này',exact:true}).click();await expect(item.getByRole('status')).toHaveText('Đã xuất bản câu.');
 expect(data.examples[1].review_status).toBe('published');expect(data.examples[0].review_status).toBe('draft');expect(calls.find(c=>c.path.endsWith('/review_example_sentences')).body.entry_seq).toBe(2);
 await page.getByRole('button',{name:'Hàng đợi thiếu nghĩa của cấp này',exact:true}).click();
 await expect(page.locator('.syllabus-table tbody tr')).toHaveCount(1);await expect(page.locator('.syllabus-table')).toContainText('未释');
});
test('Recording review retains author and license and publishes only the selected audio',async({page})=>{
 const audio={seq:1,zh_id:11,audio_id:71,author:'reader',license:'CC BY 4.0',attribution_url:'https://tatoeba.org/en/audio/of/reader',review_status:'draft'};
 const state={vocab:vocab(),examples:[example(1,11,'你好。','published')],exampleAudio:[audio],items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null};
 const {calls,data}=await mockCloud(page,'admin',{world:state});await page.route('https://tatoeba.org/audio/**',route=>route.abort());
 await page.goto('/index.html#hsk');await page.locator('[data-syl-stage="0"]').click();await page.getByRole('button',{name:/Mở đáp án/}).click();
 const recording=page.locator('.example-recording');await expect(recording).toContainText('reader - CC BY 4.0');
 await expect(recording.locator('audio')).toHaveAttribute('preload','none');await expect(recording.locator('audio')).toHaveAttribute('src','https://tatoeba.org/audio/download/71');
 await recording.getByRole('button',{name:'Duyệt bản ghi',exact:true}).click();await expect(recording).toContainText('published');
 expect(data.exampleAudio[0].review_status).toBe('published');expect(calls.find(c=>c.path.endsWith('/review_example_audio')).body.entry_audio_id).toBe(71);
});
