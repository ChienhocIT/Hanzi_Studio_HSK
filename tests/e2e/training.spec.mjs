import { test, expect } from '@playwright/test';
import {id,itemId,classId,assignmentId,key,state,item,mockCloud} from './cloud-fixture.mjs';
test('Production package preserves the existing May Long branding assets',async({page})=>{
  const failed=[];page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))failed.push(response.url());});
  await page.goto('/index.html#home');
  await expect(page.locator('.hs-mascot-hero')).toBeVisible();
  for(const selector of ['.brandmark img','.hs-mascot-hero','.hs-mascot-chip']) {
    await expect.poll(()=>page.locator(selector).evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  }
  expect(failed).toEqual([]);
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
  expect(routes).toHaveLength(25);expect(errors).toEqual([]);
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
