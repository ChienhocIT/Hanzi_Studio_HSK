import { test, expect } from '@playwright/test';
import {id,itemId,classId,assignmentId,key,state,item,mockCloud,vocab} from './cloud-fixture.mjs';
test('Production package preserves the existing May Long branding assets',async({page})=>{
  const failed=[];page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))failed.push(response.url());});
  await page.goto('/index.html#home');
  await expect(page.locator('.home-hero img')).toBeVisible();
  for(const selector of ['.brandmark img','.home-hero img','#home-badges img','.sidebar .nav-ico','.bottom-nav .bnav-ico']) {
    for(const img of await page.locator(selector).all())await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await page.evaluate(()=>nav('arena'));
  await expect(page.locator('.arena-hero img')).toBeVisible();
  for(const img of await page.locator('.pro-mode-ico').all())await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  expect(failed).toEqual([]);
});
test('Home badges unlock from real study progress',async({page})=>{
  await page.addInitScript(({key,state})=>{
    const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const events=[0,1,2].map(n=>({day:day(new Date(Date.now()-n*86400000)),id:1,rating:'good'}));
    localStorage.setItem(key,JSON.stringify({...state,records:{1:{last:Date.now(),stage:'learning'}},events}));
  },{key,state});
  await page.goto('/index.html#home');
  const badges=page.locator('#home-badges .badge-card');
  await expect(badges).toHaveCount(4);
  await expect(badges.filter({hasText:'Học tập'})).toHaveClass(/is-won/);
  await expect(badges.filter({hasText:'Chuyên cần'})).toHaveClass(/is-won/);
  await expect(badges.filter({hasText:'Hoàn thành'})).not.toHaveClass(/is-won/);
  await expect(badges.filter({hasText:'Hoàn thành'})).toContainText('1/100');
  await expect(page.locator('#badges-sub')).toContainText('Đã mở 2/4');
});
test('Guest can study and export access remains available without backend configuration',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html#study');
  await expect(page.locator('#page-study')).toHaveClass(/active/);
  const rating=page.locator('[data-rating="good"]');
  // Flashcard ratings are available after revealing the answer.
  await page.locator('#flashcard').click();
  await rating.click();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).events.length,key)).toBe(1);
  await page.goto('/index.html#settings');
  await expect(page.locator('#cloud-panel')).toContainText('Đang học trên thiết bị này');
  await expect(page.locator('#hs-all-export')).toBeVisible();expect(errors).toEqual([]);
});
test('Disabled Google provider is shown without offering a broken sign-in action',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});
  await page.route('**/auth/v1/settings',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({external:{google:false,email:true}})}));
  await page.goto('/index.html#auth');
  await expect(page.getByRole('button',{name:'Google chưa được bật',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled();
});
test('All existing routes render without JavaScript exceptions',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  const routes=await page.evaluate(()=>Object.keys(NAV));
  for(const route of routes){await page.evaluate(route=>nav(route),route);await expect(page.locator('#page-'+route)).toHaveClass(/active/);}
  expect(routes).toHaveLength(27);expect(errors).toEqual([]);
});
test('Email login preserves guest progress and requires explicit cloud initialization',async({page})=>{
  const {calls}=await mockCloud(page,'student',{authenticated:false});
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem('hanzi-cloud-owner'))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/index.html#auth');
  await page.getByLabel('Email',{exact:true}).fill('learner@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('fake-password');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page).toHaveURL(/#home$/);await page.evaluate(()=>nav('settings'));await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-cloud-archive:guest'))['hanzi-studio-hsk3-prod-v1'].settings.goal)).toBe(25);
  expect(calls.some(x=>x.path.endsWith('/save_progress'))).toBe(false);
});
test('Opt-in cloud upload synchronizes a snapshot with revision and handles errors inline',async({page})=>{
  const {calls,data}=await mockCloud(page);
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});
  await page.goto('/index.html#settings');
  page.on('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Dùng bản thiết bị',exact:true}).click();
  await expect(page.locator('#cloud-status')).toHaveText('Đã đồng bộ tiến độ.');
  expect(data.progress.snapshot[key].settings.goal).toBe(25);
  expect(calls.find(x=>x.path.endsWith('/save_progress')).body.expected_revision).toBe(0);
  await page.route('**/rest/v1/rpc/save_progress',r=>r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'40001',message:'progress_conflict'})}));
  await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.settings.goal=30;localStorage.setItem(key,JSON.stringify(s));},key);
  await page.getByRole('button',{name:'Đồng bộ ngay',exact:true}).click();
  await expect(page.locator('#cloud-status')).toContainText('Có bản mới từ thiết bị khác');
});
test('Teacher authors a sourced draft and submits it for independent review',async({page})=>{
  const {data,calls}=await mockCloud(page,'teacher');await page.goto('/index.html#classroom');
  await page.getByText('Tạo học liệu',{exact:true}).click();
  const form=page.locator('[data-work-form="content"]');
  await form.getByLabel('Tiêu đề',{exact:true}).fill(item.title);
  await form.getByRole('combobox',{name:'Cấp độ',exact:true}).selectOption('3');
  await form.getByLabel('Phiên bản đề cương').fill('Fixture');
  await form.getByLabel('Nội dung / transcript').fill('你好！');
  await form.getByLabel('Nguồn HTTPS').fill(item.source_url);
  await form.getByLabel('Giấy phép / quyền sử dụng').fill('Fixture only');
  await form.getByRole('button',{name:'Lưu bản nháp'}).click();
  await expect(page.getByRole('heading',{name:item.title})).toBeVisible();
  await page.getByRole('button',{name:'Gửi duyệt',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('Đang chờ duyệt');
  expect(data.items[0].status).toBe('in_review');expect(calls.some(x=>x.path.endsWith('/save_content'))).toBe(true);
});
test('Student joins a class, reads the assigned lesson and submits an answer',async({page})=>{
  const {data}=await mockCloud(page);
  data.assignments=[{id:assignmentId,class_id:classId,title:'Bài tập đọc',instructions:'Viết câu trả lời',lesson:item,due_at:new Date(Date.now()+86400000).toISOString()}];
  await page.goto('/index.html#classroom');
  await page.getByRole('button',{name:'Lớp học',exact:true}).click();
  await page.getByLabel('Mã tham gia lớp',{exact:true}).fill('a'.repeat(32));
  await page.getByRole('button',{name:'Tham gia lớp',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Bài tập đọc',exact:true})).toBeVisible();
  await page.getByLabel('Câu trả lời',{exact:true}).fill('这是我的答案。');
  await page.getByRole('button',{name:'Nộp bài',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('Đang chờ chấm');expect(data.submissions[0].answer).toBe('这是我的答案。');
});
test('Admin can approve another author and access role management',async({page})=>{
  const {data}=await mockCloud(page,'admin');data.items=[{...item,author_id:'another-author',status:'in_review'}];
  await page.goto('/index.html#classroom');await page.getByRole('button',{name:'Xuất bản',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('Đã xuất bản');
  await page.getByRole('button',{name:'Phân quyền',exact:true}).click();await expect(page.getByRole('heading',{name:'Phân quyền tài khoản'})).toBeVisible();
});
test('Account UI fits mobile in both themes and renders untrusted content as text',async({page})=>{
  const {data}=await mockCloud(page,'teacher');data.items=[{...item,title:'<img src=x onerror=alert(1)>',body:'<script>throw Error(1)</script>'}];
  await page.setViewportSize({width:390,height:844});await page.goto('/index.html#classroom');
  await expect(page.locator('#cloud-view')).toContainText('<img src=x');await expect(page.locator('#cloud-view img')).toHaveCount(0);
  for(const theme of ['light','dark']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#workspace-panel').screenshot({path:`test-results/cloud-${theme}-mobile.png`,animations:'disabled'});
    const contrast=await page.locator('#workspace-panel .btn').first().evaluate(el=>{
      const css=getComputedStyle(el);
      const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
      const bg=luminance(css.backgroundColor),fg=luminance(css.color);
      return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
});
test('Teacher creates a multiple choice assignment through labeled question editors',async({page})=>{
  const {data,calls}=await mockCloud(page,'teacher');
  data.classes=[{id:classId,title:'Lớp kiểm thử',teacher_id:id,open:true}];data.items=[{...item,status:'published'}];
  await page.goto('/index.html#classroom');await page.getByRole('button',{name:'Lớp học',exact:true}).click();
  await page.getByText('Giao bài trắc nghiệm',{exact:true}).first().click();
  const form=page.locator('[data-work-form="quiz-assignment"]');
  await form.getByLabel('Tên bài trắc nghiệm',{exact:true}).fill('Quiz lớp');
  await form.getByLabel('Hướng dẫn làm bài',{exact:true}).fill('Chọn nghĩa phù hợp');
  await form.getByRole('combobox',{name:'Học liệu nguồn đã duyệt',exact:true}).selectOption(itemId);
  await form.getByLabel('Hạn nộp trắc nghiệm (giờ thiết bị)',{exact:true}).fill('2030-12-20T12:00');
  await form.getByLabel('Nội dung câu hỏi',{exact:true}).fill('你好 nghĩa là gì?');
  await form.getByLabel('Các lựa chọn').fill('Xin chào\nTạm biệt');
  await form.getByLabel('Số thứ tự đáp án đúng (từ 1)',{exact:true}).fill('1');
  await form.getByRole('button',{name:'Thêm câu hỏi',exact:true}).click();
  const second=form.locator('[data-question]').nth(1);
  await second.getByLabel('Nội dung câu hỏi',{exact:true}).fill('谢谢 nghĩa là gì?');
  await second.getByLabel('Các lựa chọn').fill('Xin lỗi\nCảm ơn');
  await second.getByLabel('Số thứ tự đáp án đúng (từ 1)',{exact:true}).fill('2');
  await form.getByRole('button',{name:'Giao bài trắc nghiệm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Quiz lớp',exact:true})).toBeVisible();
  const create=calls.find(x=>x.path.endsWith('/create_quiz_assignment'));
  expect(create.body.questions.map(q=>q.correct_index)).toEqual([0,1]);
});
test('Learner submits quiz choices once and sees the score returned by the server',async({page})=>{
  const {data,calls}=await mockCloud(page);
  data.classes=[{id:classId,title:'Lớp kiểm thử',teacher_id:'other',open:true}];
  data.assignments=[{id:assignmentId,class_id:classId,title:'Quiz lớp',instructions:'Chọn nghĩa',lesson:item,due_at:'2030-12-20T12:00:00Z',format:'quiz'}];
  data.questions=[{position:0,prompt:'你好 nghĩa là gì?',options:['Xin chào','Tạm biệt']},{position:1,prompt:'谢谢 nghĩa là gì?',options:['Xin lỗi','Cảm ơn']}];
  await page.goto('/index.html#classroom');await page.getByRole('button',{name:'Lớp học',exact:true}).click();
  await page.getByRole('button',{name:'Xem bài trắc nghiệm',exact:true}).click();
  await page.getByRole('radio',{name:'Xin chào',exact:true}).check();await page.getByRole('radio',{name:'Xin lỗi',exact:true}).check();
  await page.getByRole('button',{name:'Nộp trắc nghiệm',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('Điểm: 50/100');
  await expect(page.getByRole('button',{name:'Nộp trắc nghiệm',exact:true})).toHaveCount(0);
  expect(calls.find(x=>x.path.endsWith('/submit_quiz')).body).toEqual({assignment_uuid:assignmentId,answers:[0,0]});
});
test('Recovery UI exports a prior snapshot using the existing full-backup format',async({page})=>{
  await mockCloud(page);
  await page.addInitScript(({id,key,state})=>localStorage.setItem('hanzi-cloud-archive:'+id,JSON.stringify({[key]:state})),{id,key,state});
  await page.goto('/index.html#settings');
  await page.getByText('Phục hồi dữ liệu trước khi thay thế',{exact:true}).click();
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Xuất bản thiết bị trước',exact:true}).click();
  const download=await pending;
  const {readFile}=await import('node:fs/promises');
  const backup=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(backup.format).toBe('hanzi-studio-full-backup');
  expect(JSON.parse(backup.storage[key]).settings.goal).toBe(25);
  expect(Object.keys(backup.storage)).toEqual([key]);
});
test('Teacher creates class, assigns essay, grades a submission and reads class report',async({page})=>{
  const {data}=await mockCloud(page,'teacher');data.items=[{...item,status:'published'}];
  data.submissions=[{assignment_id:assignmentId,student_id:'another-student',answer:'我的答案',score:null,feedback:'',submitted_at:new Date().toISOString()}];
  await page.goto('/index.html#classroom');await page.getByRole('button',{name:'Lớp học',exact:true}).click();
  await page.getByText('Tạo lớp học',{exact:true}).click();
  await page.getByLabel('Tên lớp',{exact:true}).fill('Lớp HSK thử nghiệm');await page.getByRole('button',{name:'Tạo lớp',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('Mã tham gia:');
  await page.getByText('Giao bài tự luận',{exact:true}).click();
  const form=page.locator('[data-work-form="assignment"]');
  await form.getByLabel('Tên bài tập',{exact:true}).fill('Bài đọc tự luận');
  await form.getByLabel('Yêu cầu',{exact:true}).fill('Viết câu trả lời');
  await form.getByRole('combobox',{name:'Học liệu đã xuất bản',exact:true}).selectOption(itemId);
  await form.getByLabel('Hạn nộp (giờ thiết bị)',{exact:true}).fill('2030-12-20T12:00');
  await form.getByRole('button',{name:'Giao bài',exact:true}).click();
  await page.getByText('Trần An: Chưa chấm',{exact:true}).click();
  const grade=page.locator('[data-work-form="grade"]');
  await grade.getByLabel('Điểm (0-100)',{exact:true}).fill('85');await grade.getByLabel('Nhận xét',{exact:true}).fill('Cần ôn lại cấu trúc câu.');
  await grade.getByRole('button',{name:'Lưu điểm',exact:true}).click();
  await expect(page.locator('#cloud-view')).toContainText('85/100');
  await page.getByRole('button',{name:'Xem báo cáo lớp',exact:true}).click();
  await expect(page.locator('#cloud-report')).toContainText('Học viên trong lớp');await expect(page.locator('#cloud-report')).toContainText('85');
});

test('First visit opens the landing page, which leads to sign-in and guest study',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/index.html');
  await expect(page.locator('#page-welcome')).toHaveClass(/active/);await expect(page.locator('.sidebar')).toBeHidden();
  await expect.poll(()=>page.locator('.pub-logo img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.getByRole('tab',{name:'Giáo viên',exact:true}).click();await expect(page.locator('#role-teacher')).toBeVisible();await expect(page.locator('#role-student')).toBeHidden();
  await page.locator('.pub-actions').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.locator('#page-auth')).toHaveClass(/active/);await expect(page.locator('#auth-panel')).toContainText('Tài khoản chưa sẵn sàng');
  await page.getByRole('button',{name:'Học không cần tài khoản',exact:true}).click();
  await expect(page.locator('#page-home')).toHaveClass(/active/);await expect(page.locator('.sidebar')).toBeVisible();
  await page.reload();await expect(page.locator('#page-home')).toHaveClass(/active/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('Sign-up sends the display name and teachers land in their classroom after sign-in',async({page})=>{
  const {calls}=await mockCloud(page,'teacher',{authenticated:false});
  await page.goto('/index.html#auth');
  await page.getByRole('tab',{name:'Đăng ký',exact:true}).click();
  await page.getByLabel('Tên hiển thị',{exact:true}).fill('Cô Lan');await page.getByLabel('Email',{exact:true}).fill('lan@example.test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('fake-password');
  await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.locator('#auth-panel [data-cloud-status]')).toContainText('Mở email xác nhận');
  expect(calls.find(x=>x.path.endsWith('/signup')).body.data.display_name).toBe('Cô Lan');
  await page.getByRole('tab',{name:'Đăng nhập',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('lan@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('fake-password');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page).toHaveURL(/#classroom$/);await expect(page.locator('#classroom-role')).toHaveText('Giáo viên');
  await expect(page.getByRole('button',{name:'Lớp học',exact:true})).toBeVisible();
});
test('Curriculum import keeps row sources and re-imports its own backup format',async({page})=>{
  await page.goto('/index.html#contenthub');
  const result=await page.evaluate(async()=>{
    await hsImportContent('hanzi,level,pinyin,vi,source\n你好,1,nǐ hǎo,Xin chào,https://example.com/list','lesson.csv');
    const row=hs30State.injected.find(x=>x.hz==='你好');
    const backup=JSON.stringify({schema:'hanzi-studio-curriculum-v4',state:{...hs30State}});
    hs30State.injected=[];await hsImportContent(backup,'hanzi-studio-v4-content-backup.json');
    return {source:row.source,importedFrom:row.importedFrom,restored:hs30State.injected.map(x=>x.hz)};
  });
  expect(result.source).toBe('https://example.com/list');expect(result.importedFrom).toBe('lesson.csv');expect(result.restored).toContain('你好');
});
test('Imported Video Lab lessons cannot inject markup through the video ID',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('/index.html#video');
  const file={name:'lab.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'hanzi-video-lab',version:1,data:{lessons:[{title:'X',videoId:'a" onload="window.__xss=1',segments:[{text:'你好'}]}],stats:{}}}))};
  await page.locator('#vl-import-json').setInputFiles(file);
  await page.locator('[data-vl-load="0"]').dispatchEvent('click');
  expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  await expect(page.locator('#vl-video-player iframe')).toHaveCount(0);expect(errors).toEqual([]);
});
test('Learners study published HSK 3.0 syllabus words and ratings join the on-device schedule',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockCloud(page,'student',{world:{items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null,vocab:[...vocab(),{...vocab('draft')[0],seq:4,word:'草稿'}]}});
  // A restored backup can carry markup in progress fields; it must render as a number.
  await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({progress:{'clec2025-2':{reps:'<img src=x onerror="window.__xss=1">',due:1}}}));}});
  await page.goto('/index.html#hsk');
  const panel=page.locator('#syllabus-panel');
  await expect(panel.locator('#syllabus-status')).toContainText('HSK 1: 3 mục');
  await panel.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(panel.locator('.syllabus-table')).toContainText("you're welcome");
  await expect(panel.locator('.syllabus-table')).toContainText('不客气');await expect(panel.locator('.syllabus-table')).not.toContainText('草稿');
  await expect(panel.locator('.syllabus-table')).not.toContainText('Trạng thái');
  await panel.getByLabel('Tìm chữ Hán hoặc pinyin',{exact:true}).fill('ben');await panel.getByRole('button',{name:'Tra cứu',exact:true}).click();
  await expect(panel.locator('tbody tr')).toHaveCount(1);await expect(panel.locator('tbody')).toContainText('本');
  await panel.getByRole('button',{name:'Luyện thẻ',exact:true}).click();
  await expect(panel.locator('.study-info')).toContainText('Đang học');await expect(panel.locator('img[src="x"]')).toHaveCount(0);expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  await panel.getByRole('button',{name:/Mở đáp án/}).click();await expect(panel).toContainText('běn');
  await panel.getByRole('button',{name:'Đã nhớ',exact:true}).click();
  await expect(panel.locator('#syllabus-status')).toContainText('Đã cập nhật lượt ôn');
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4')).progress['clec2025-2']);
  expect(record.reps).toBe(1);
  // A word rated "again" is due within minutes; once due it appears in the review mode.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4'));s.progress['clec2025-1']={reps:1,interval:1,seenAt:Date.now(),due:Date.now()-1000};localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify(s));});
  await panel.getByLabel('Tìm chữ Hán hoặc pinyin',{exact:true}).fill('');await panel.getByRole('button',{name:'Tra cứu',exact:true}).click();
  await panel.getByRole('button',{name:'Ôn từ đến hạn',exact:true}).click();
  await expect(panel.locator('.reference-word')).toHaveText('好');await expect(panel).toContainText('1 / 1');
  await panel.getByRole('button',{name:/Mở đáp án/}).click();await expect(panel).toContainText('good; well');
  expect(errors).toEqual([]);
});
test('Admins publish a syllabus level in one action; signed-out visitors are asked to sign in',async({page,browser})=>{
  const world={items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null,vocab:vocab('draft')};
  const {calls}=await mockCloud(page,'admin',{world});page.on('dialog',d=>d.accept());
  await page.goto('/index.html#hsk');
  const panel=page.locator('#syllabus-panel');
  await panel.getByRole('button',{name:'Danh sách từ',exact:true}).click();
  await expect(panel.locator('.syllabus-table')).toContainText('Bản nháp');
  await panel.getByText('Duyệt cấp HSK 1 (quản trị viên)').click();
  await panel.getByRole('button',{name:'Xuất bản 3 mục nháp',exact:true}).click();
  await expect(panel.locator('#syllabus-status')).toContainText('Đã xuất bản 3 mục HSK 1');
  expect(calls.find(c=>c.path.endsWith('/review_vocab_entries')).body).toEqual({entry_syllabus:'HSK 3.0 (CLEC 2025)',entry_seqs:[1,2,3],decision:'published'});
  await expect(panel.getByRole('button',{name:'Ẩn khỏi học viên',exact:true})).toBeEnabled();
  const guest=await (await browser.newContext({serviceWorkers:'block'})).newPage();await mockCloud(guest,'student',{authenticated:false});
  await guest.goto('/index.html#hsk');
  await expect(guest.locator('#syllabus-panel').getByRole('button',{name:'Đăng nhập để mở danh mục',exact:true})).toBeVisible();
});
test('Unconfirmed accounts get a specific message and can resend the confirmation email',async({page})=>{
  const {calls}=await mockCloud(page,'student',{authenticated:false});
  await page.route('https://demo.supabase.co/auth/v1/token**',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'email_not_confirmed',error_code:'email_not_confirmed',msg:'Email not confirmed'})}));
  await page.goto('/index.html#auth');
  await page.getByLabel('Email',{exact:true}).fill('new@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('fake-password');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.locator('#auth-panel [data-cloud-status]')).toContainText('Gửi lại email xác nhận');
  await page.getByRole('button',{name:'Chưa nhận được email xác nhận?',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('new@example.test');
  await page.getByRole('button',{name:'Gửi lại email xác nhận',exact:true}).click();
  await expect(page.locator('#auth-panel [data-cloud-status]')).toContainText('liên kết mới đã được gửi');
  const resend=calls.find(c=>c.path.endsWith('/resend'));
  expect(resend.body.type).toBe('signup');expect(resend.body.email).toBe('new@example.test');
});
test('An expired email link explains what happened and is removed from the address bar',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});
  await page.goto('/index.html?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired#auth');
  await expect(page.locator('#auth-panel [data-cloud-status]')).toContainText('đã hết hạn');
  await expect(page).toHaveURL(/\/index\.html#auth$/);
});
test('AI tutor streams safe formatted answers, grades sentences and reports the daily quota',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockCloud(page,'student');
  const requests=[];
  await page.route('**/api/tutor',async route=>{
    const req=route.request(),body=req.postDataJSON();requests.push({body,auth:req.headers().authorization});
    if(body.mode==='grade')return route.fulfill({contentType:'application/json',headers:{'x-tutor-remaining':'28'},body:JSON.stringify({result:{score:72,corrected:'我昨天去了学校。',pinyin:'Wǒ zuótiān qùle xuéxiào.',feedback:'Gần đúng, chú ý vị trí 了.',errors:[{part:'去学校了',issue:'Trật tự chưa tự nhiên',fix:'去了学校'}]}})});
    return route.fulfill({contentType:'text/plain; charset=utf-8',headers:{'x-tutor-remaining':'29'},body:'**了** chỉ việc đã hoàn thành.\n- 我吃了饭 (wǒ chīle fàn)\n<img src=x onerror="window.__xss=1">'});
  });
  await page.goto('/index.html#tutor');
  await expect(page.locator('#tutor-quota')).toHaveText('Còn 30/30 lượt hôm nay');
  await page.getByRole('button',{name:'Phân biệt 了 và 过',exact:true}).click();
  const answer=page.locator('.tutor-msg.from-tutor').last();
  await expect(answer.locator('strong')).toHaveText('了');await expect(answer.locator('li')).toContainText('我吃了饭');
  await expect(answer).toContainText('<img src=x');expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  await expect(page.locator('#tutor-quota')).toHaveText('Còn 29/30 lượt hôm nay');
  expect(requests[0].body).toEqual({mode:'chat',messages:[{role:'user',text:'Phân biệt 了 và 过'}]});
  expect(requests[0].auth).toMatch(/^Bearer \S+/);
  // Follow-up questions carry the history so far.
  await page.getByLabel('Câu hỏi cho Mây Long').fill('Còn 过 thì sao?');await page.getByLabel('Câu hỏi cho Mây Long').press('Enter');
  await expect(page.locator('.tutor-msg')).toHaveCount(4);
  expect(requests[1].body.messages.map(m=>m.role)).toEqual(['user','model','user']);
  await page.getByRole('tab',{name:'Chấm câu',exact:true}).click();
  await page.getByLabel('Câu tiếng Trung của bạn').fill('我昨天去学校了');await page.getByLabel('Bạn muốn nói gì? (tiếng Việt, không bắt buộc)').fill('Hôm qua tôi đi học');
  await page.getByRole('button',{name:'Chấm câu',exact:true}).click();
  await expect(page.locator('.score-ring strong')).toHaveText('72');await expect(page.locator('.tutor-errors')).toContainText('去了学校');
  expect(requests[2].body).toEqual({mode:'grade',sentence:'我昨天去学校了',meaning:'Hôm qua tôi đi học'});
  await page.unroute('**/api/tutor');
  await page.route('**/api/tutor',route=>route.fulfill({status:429,contentType:'application/json',body:'{"error":"tutor_quota_exceeded"}'}));
  await page.getByRole('button',{name:'Chấm câu',exact:true}).click();
  await expect(page.locator('#tutor-status')).toContainText('hết 30 lượt');await expect(page.locator('#tutor-quota')).toHaveText('Còn 0/30 lượt hôm nay');
  await expect(page.getByLabel('Câu tiếng Trung của bạn')).toHaveValue('我昨天去学校了');
  expect(errors).toEqual([]);
});
test('Signed-out visitors are asked to sign in before using the AI tutor',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});
  await page.goto('/index.html#tutor');
  await expect(page.getByRole('button',{name:'Đăng nhập để dùng trợ giảng',exact:true})).toBeVisible();
});
test('The library opens on the learner level and splits it into stages that track progress',async({page})=>{
  const rows=Array.from({length:120},(_,i)=>({seq:i+1,level:'1',extra_levels:[],word:'字'+(i+1),homograph:null,pinyin:'zì',pos:['名'],pos_extra:[],review_status:'published',source_page:80,gloss_en:['word '+(i+1)]}));
  rows.push({...rows[0],seq:400,level:'4',word:'经济',pinyin:'jīngjì',gloss_en:['economy']});
  await mockCloud(page,'student',{world:{items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null,vocab:rows}});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({level:'1',progress:{'clec2025-1':{reps:1,interval:1,due:Date.now()-1000},'clec2025-2':{reps:1,interval:1,due:Date.now()+86400000}}}));}});
  await page.goto('/index.html#home');
  await page.locator('.sidebar').getByRole('button',{name:/Thư viện từ vựng/}).click();
  await expect(page).toHaveURL(/#hsk$/);
  const panel=page.locator('#syllabus-panel');
  await expect(panel.getByRole('button',{name:'HSK 1',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.locator('.stage-tile')).toHaveCount(3);
  await expect(panel.locator('.stage-tile').first()).toContainText('2/50 đã học');await expect(panel.locator('.stage-tile').first()).toContainText('1 đến hạn');
  await expect(panel.locator('.stage-tile').last()).toContainText('Từ 101–120');
  await panel.locator('[data-syl-stage="1"]').click();
  await expect(panel.locator('.stage-bar')).toContainText('HSK 1 · Chặng 2');await expect(panel.locator('.reference-word')).toHaveText('字51');
  await expect(panel).toContainText('1 / 50');
  await panel.getByRole('button',{name:'Nghe',exact:true}).click();
  await panel.getByRole('button',{name:'← Tất cả chặng',exact:true}).click();await expect(panel.locator('.stage-tile')).toHaveCount(3);
  // The roadmap sends a learner to the full level in the library, and the choice is remembered.
  await page.evaluate(()=>nav('path'));
  await page.getByRole('button',{name:/Học đủ .* từ HSK 1 theo chặng/}).click();
  await expect(page).toHaveURL(/#hsk$/);
  await panel.getByRole('button',{name:'HSK 4',exact:true}).click();
  await expect(panel.locator('.stage-tile')).toHaveCount(1);await expect(panel.locator('.stage-tile')).toContainText('经济');
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-hsk-level'))).toBe('4');
  // The original 500-word library links into the full library by level.
  await page.evaluate(()=>{nav('library');window.__spoken=[];speechSynthesis.speak=u=>window.__spoken.push(u.text);});
  await page.locator('#library-rows').getByRole('button',{name:'Nghe 矮',exact:true}).click();
  // Without a Chinese device voice a signed-in learner goes through the server voice first, so this can be async.
  await expect.poll(()=>page.evaluate(()=>window.__spoken)).toEqual(['矮']);
  await page.locator('#page-library .level-jump').getByRole('button',{name:'HSK 1',exact:true}).click();
  await expect(panel.getByRole('button',{name:'HSK 1',exact:true})).toHaveAttribute('aria-pressed','true');
});

// Fake Gemini Live socket and microphone for voice tests: records what the app sends and answers like the server.
const fakeLive=()=>{
  window.__sent=[];
  window.WebSocket=class{constructor(url){this.url=url;this.readyState=0;window.__socket=this;setTimeout(()=>{this.readyState=1;this.onopen?.();},10);}
    addEventListener(){} removeEventListener(){}
    send(data){const m=JSON.parse(data);window.__sent.push(m);const reply=o=>setTimeout(()=>this.onmessage?.({data:JSON.stringify(o)}),10);
      if(m.setup)reply({setupComplete:{}});
      if(m.clientContent)reply({serverContent:{outputTranscription:{text:'你好！我们开始吧。'},modelTurn:{parts:[{text:'**internal reasoning**'}]},turnComplete:true}});}
    close(){this.readyState=3;}};
  navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();osc.connect(dest);osc.start();return dest.stream;};
};
test('Video Lab turns a YouTube link into AI subtitles and opens voice role-play on its dialogue',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockCloud(page,'student');await page.addInitScript(fakeLive);
  const requests=[];
  await page.route('**/api/tutor',route=>{const body=route.request().postDataJSON();requests.push(body);
    if(body.mode==='transcript')return route.fulfill({contentType:'application/json',headers:{'x-tutor-remaining':'28'},body:JSON.stringify({title:'Chào hỏi',segments:[{start:0.5,end:2,text:'你好！',pinyin:'nǐ hǎo',vi:'Xin chào'},{start:2.2,end:4,text:'你叫什么名字？',pinyin:'',vi:''}]})});
    return route.fulfill({contentType:'application/json',headers:{'x-tutor-remaining':'27'},body:JSON.stringify({token:'auth_tokens/t',url:'wss://live.example/ws',setup:{model:'models/gemini-3.8-live'},expiresAt:'2030-01-01T00:00:00Z'})});});
  await page.goto('/index.html#video');
  await page.locator('#vl-youtube-link').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button',{name:'✦ Tạo phụ đề bằng AI',exact:true}).click();
  await expect(page.locator('#vl-transcript-input')).toHaveValue(/00:00.*-->[\s\S]*你叫什么名字/);
  await expect(page.locator('#video-message')).toContainText('Phụ đề do AI');
  expect(requests[0]).toEqual({mode:'transcript',url:'https://youtu.be/dQw4w9WgXcQ'});
  // Edited AI subtitles re-apply as separate timed cues.
  await expect(page.locator('#vl-transcript-input')).toHaveValue('00:00.5 --> 00:02\n你好！\n\n00:02.2 --> 00:04\n你叫什么名字？');
  await page.locator('#vl-apply-transcript').click();await expect(page.locator('.vl-line')).toHaveCount(2);
  await page.getByRole('button',{name:'Luyện nói với Mây Long',exact:true}).click();
  await expect(page).toHaveURL(/#tutor$/);await expect(page.getByRole('tab',{name:'Luyện nói',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.voice-context')).toContainText('Chào hỏi');await expect(page.locator('.voice-context')).toContainText('2 câu');
  await page.getByRole('button',{name:'Bắt đầu nói',exact:true}).click();
  await expect(page.locator('.voice-line.tutor')).toContainText('你好！我们开始吧。');
  await expect(page.locator('.voice-log')).not.toContainText('internal reasoning');
  expect(requests[1]).toEqual({mode:'live',kind:'talk'});
  const sent=await page.evaluate(()=>window.__sent);
  expect(sent[0]).toEqual({setup:{model:'models/gemini-3.8-live'}});expect(sent[1].clientContent.turnComplete).toBe(true);
  expect(sent[1].clientContent.turns[0].parts[0].text).toContain('你好！\n你叫什么名字？');
  expect(await page.evaluate(()=>window.__socket.url)).toBe('wss://live.example/ws?access_token=auth_tokens%2Ft');
  await expect(page.locator('#tutor-quota')).toHaveText('Còn 27/30 lượt hôm nay');
  await page.getByRole('button',{name:'Dừng',exact:true}).click();
  await expect(page.locator('.voice-note')).toHaveText('Đã kết thúc phiên.');
  expect(errors).toEqual([]);
});
test('Voice practice explains a blocked microphone without spending a message',async({page})=>{
  await mockCloud(page,'student');
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});
  let calls=0;await page.route('**/api/tutor',route=>{calls++;return route.abort();});
  await page.goto('/index.html#tutor');
  await page.getByRole('tab',{name:'Luyện nói',exact:true}).click();
  await page.getByRole('button',{name:'Trung → Việt',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu nói',exact:true}).click();
  await expect(page.locator('.voice-note')).toContainText('chưa cho phép dùng micro');
  expect(calls).toBe(0);
});
test('Leaving the tutor while the microphone prompt is open never starts a hidden session',async({page})=>{
  await mockCloud(page,'student');await page.addInitScript(fakeLive);
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.releaseMic=()=>{const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination();ctx.createOscillator().connect(dest);window.__micStream=dest.stream;resolve(dest.stream);};});});
  let calls=0;await page.route('**/api/tutor',route=>{calls++;return route.abort();});
  await page.goto('/index.html#tutor');
  await page.getByRole('tab',{name:'Luyện nói',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu nói',exact:true}).click();
  await page.evaluate(()=>nav('home'));
  await page.evaluate(()=>window.releaseMic());await page.waitForTimeout(300);
  expect(calls).toBe(0);
  expect(await page.evaluate(()=>window.__socket)).toBeUndefined();
  expect(await page.evaluate(()=>window.__micStream.getTracks().every(t=>t.readyState==='ended'))).toBe(true);
});
test('A late AI subtitle response does not replace a lesson changed while waiting',async({page})=>{
  await mockCloud(page,'student');
  let release;const held=new Promise(r=>release=r);
  await page.route('**/api/tutor',async route=>{await held;return route.fulfill({contentType:'application/json',body:JSON.stringify({title:'A',segments:[{start:0,end:1,text:'旧视频'}]})});});
  await page.goto('/index.html#video');
  await page.locator('#vl-youtube-link').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button',{name:'✦ Tạo phụ đề bằng AI',exact:true}).click();
  await page.locator('#vl-youtube-link').fill('https://youtu.be/aaaaaaaaaaa');
  release();
  await expect(page.locator('#video-message')).toContainText('Đã bỏ phụ đề AI');
  await expect(page.locator('#vl-transcript-input')).not.toHaveValue(/旧视频/);
});

test('Transcription falls back to a Whisper recording when Gemini Live is busy',async({page})=>{
  await mockCloud(page,'student');await page.addInitScript(fakeLive);
  const requests=[];
  await page.route('**/api/tutor',route=>{const body=route.request().postDataJSON();requests.push(body);
    if(body.mode==='live')return route.fulfill({status:502,contentType:'application/json',body:'{"error":"model_unavailable"}'});
    return route.fulfill({contentType:'application/json',headers:{'x-tutor-remaining':'26'},body:JSON.stringify({text:'你好，我叫小明。',provider:'Groq Whisper'})});});
  await page.goto('/index.html#tutor');
  await page.getByRole('tab',{name:'Luyện nói',exact:true}).click();
  await page.getByRole('button',{name:'Chép lời',exact:true}).click();
  await page.getByRole('button',{name:'Bắt đầu nói',exact:true}).click();
  await expect(page.locator('.voice-note')).toContainText('ghi âm');
  await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Dừng và chép lời',exact:true}).click();
  await expect(page.locator('.voice-line.you')).toContainText('你好，我叫小明。');
  await expect(page.locator('.voice-note')).toContainText('Groq Whisper');
  expect(requests[1].mode).toBe('stt');expect(requests[1].mime).toMatch(/^audio\//);expect(requests[1].audio.length).toBeGreaterThan(0);
});
test('Devices without a Chinese voice play Cloudflare speech, cached per word',async({page})=>{
  await mockCloud(page,'student');
  await page.addInitScript(()=>{window.__played=[];window.__device=[];speechSynthesis.getVoices=()=>[{lang:'en-US',name:'English'}];speechSynthesis.speak=u=>window.__device.push(u.text);HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();};});
  let calls=0;await page.route('**/api/tutor',route=>{calls++;expect(route.request().postDataJSON()).toEqual({mode:'speak',text:'矮'});return route.fulfill({contentType:'audio/mpeg',body:Buffer.from([0x49,0x44,0x33])});});
  await page.goto('/index.html#library');
  const listen=page.locator('#library-rows').getByRole('button',{name:'Nghe 矮',exact:true});
  await listen.click();await expect.poll(()=>page.evaluate(()=>window.__played.length)).toBe(1);
  await listen.click();await expect.poll(()=>page.evaluate(()=>window.__played.length)).toBe(2);
  expect(calls).toBe(1);expect(await page.evaluate(()=>window.__device)).toEqual([]);
});
test('Flashcards switch between the HSK 3 deck and HSK 1–9 levels, and review counts library words',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rows=Array.from({length:60},(_,i)=>({seq:i+1,level:'1',extra_levels:[],word:'字'+(i+1),homograph:null,pinyin:'zì',pos:['名'],pos_extra:[],review_status:'published',source_page:80,gloss_en:['word '+(i+1)]}));
  await mockCloud(page,'student',{world:{items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null,vocab:rows}});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('hanzi-studio-curriculum-v4',JSON.stringify({progress:{'clec2025-3':{reps:1,interval:1,due:Date.now()-1000},'clec2025-4':{reps:3,interval:4,due:Date.now()+86400000}}}));}});
  await page.goto('/index.html#study');
  await expect(page.locator('#study-active')).toBeVisible();
  await page.getByLabel('Bộ thẻ đang học').selectOption('1');
  await expect(page.locator('#study-active')).toBeHidden();
  await expect(page.locator('#page-study .reference-word')).toHaveText('字1');
  await page.reload();
  await expect(page.getByLabel('Bộ thẻ đang học')).toHaveValue('1');
  await expect(page.locator('#page-study .reference-word')).toHaveText('字1');
  await page.evaluate(()=>nav('hsk'));await expect(page.locator('#page-hsk .reference-word')).toHaveText('字1');
  await page.evaluate(()=>nav('home'));
  await expect(page.locator('#m-studied')).toHaveText('2');await expect(page.locator('#m-studied-foot')).toContainText('HSK 1–9: 2');
  await page.evaluate(()=>nav('review'));
  await expect(page.locator('#review-hsk-due')).toContainText('1 từ HSK 1–9 đến hạn');
  await page.locator('#review-hsk-due').getByRole('button',{name:'Ôn ngay',exact:true}).click();
  await expect(page).toHaveURL(/#hsk$/);await expect(page.locator('#page-hsk .reference-word')).toHaveText('字3');
  await page.evaluate(()=>nav('study'));
  await page.getByLabel('Bộ thẻ đang học').selectOption('hsk3');
  await expect(page.locator('#study-active')).toBeVisible();await expect(page.locator('#study-syllabus-slot')).toBeHidden();
  expect(errors).toEqual([]);
});
