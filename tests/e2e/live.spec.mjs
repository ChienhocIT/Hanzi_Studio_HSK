import { test,expect } from '@playwright/test';
import {id,itemId,classId,assignmentId,item,mockCloud} from './cloud-fixture.mjs';
const studentId='00000000-0000-4000-8000-000000000002';
function world() {
  return {items:[{...item,status:'published'}],classes:[{id:classId,title:'Lớp luyện tập',teacher_id:id,open:true}],
    assignments:[{id:assignmentId,class_id:classId,title:'Quiz luyện tập',format:'quiz',instructions:'Chọn nghĩa phù hợp',lesson:item,due_at:'2030-12-20T12:00:00Z'}],
    submissions:[],questions:[{position:0,prompt:'你好 nghĩa là gì?',options:['Xin chào','Tạm biệt']},{position:1,prompt:'谢谢 nghĩa là gì?',options:['Xin lỗi','Cảm ơn']}],progress:null};
}
async function createRoom(page) {
  await page.goto('/index.html#settings');await page.getByRole('button',{name:'Phòng thi',exact:true}).click();
  await page.getByText('Tạo phòng thi',{exact:true}).click();
  await page.getByRole('combobox',{name:'Bài trắc nghiệm của lớp',exact:true}).selectOption(assignmentId);
  await page.getByLabel('Thời gian thi (phút)',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Tạo phòng',exact:true}).click();
  await expect(page.locator('.live-code')).toHaveText('ABCD1234');
}
test('Host and learner complete a live session across two browser contexts',async({browser})=>{
  const data=world();
  const hostContext=await browser.newContext({serviceWorkers:'block'}),studentContext=await browser.newContext({serviceWorkers:'block'});
  try {
    const host=await hostContext.newPage(),student=await studentContext.newPage();
    const errors=[];host.on('pageerror',e=>errors.push(e.message));student.on('pageerror',e=>errors.push(e.message));
    await mockCloud(host,'teacher',{world:data});const learner=await mockCloud(student,'student',{userId:studentId,world:data});
    await createRoom(host);
    await student.goto('/index.html#settings');await student.getByRole('button',{name:'Phòng thi',exact:true}).click();
    await student.getByLabel('Mã phòng thi',{exact:true}).fill('ABCD1234');await student.getByRole('button',{name:'Vào phòng thi',exact:true}).click();
    await expect(student.locator('#live-room')).toContainText('Đang chờ giáo viên bắt đầu.');
    await expect(student.getByRole('radio')).toHaveCount(0);
    await host.getByRole('button',{name:'Làm mới phòng',exact:true}).click();await expect(host.locator('#live-roster')).toContainText('(1)');
    await host.getByRole('button',{name:'Bắt đầu thi',exact:true}).click();
    await expect(student.getByRole('radio',{name:'Xin chào',exact:true})).toBeVisible({timeout:10000});
    await student.getByRole('radio',{name:'Xin chào',exact:true}).check();
    await expect(student.locator('#live-save-status')).toHaveText('Đã lưu lựa chọn lên server.');
    await student.getByRole('radio',{name:'Xin lỗi',exact:true}).check();
    await expect(student.locator('#live-save-status')).toHaveText('Đã lưu lựa chọn lên server.');
    await student.getByRole('button',{name:'Làm mới phòng',exact:true}).click();
    await expect(student.getByRole('radio',{name:'Xin chào',exact:true})).toBeChecked();
    await student.getByRole('button',{name:'Nộp bài phòng thi',exact:true}).click();
    await expect(student.locator('#live-room')).toContainText('Điểm sẽ hiện khi phòng kết thúc.');
    await expect(student.locator('#live-room')).not.toContainText('50/100');
    expect(learner.calls.find(c=>c.path.endsWith('/submit_live_quiz')).body.answers).toEqual([0,0]);
    host.on('dialog',d=>d.accept());await host.getByRole('button',{name:'Kết thúc phòng',exact:true}).click();
    await expect(host.locator('#live-roster')).toContainText('50/100');
    await expect(student.locator('#live-room')).toContainText('Điểm của bạn: 50/100',{timeout:10000});
    await expect(student.getByRole('button',{name:'Nộp bài phòng thi',exact:true})).toHaveCount(0);
    await student.reload();await student.getByRole('button',{name:'Phòng thi',exact:true}).click();
    await expect(student.locator('#live-room')).toContainText('Điểm của bạn: 50/100');
    expect(errors).toEqual([]);
  }finally{await hostContext.close();await studentContext.close();}
});
test('Live UI preserves unsent choices during polling and restores saved draft after reload',async({page})=>{
  const data=world();
  data.liveRooms=[{id:'00000000-0000-4000-8000-000000000040',host_id:id,title:'Phòng luyện tập',instructions:'Chọn nghĩa',state:'running',join_code:'ABCD1234',duration_seconds:120,ends_at:new Date(Date.now()+120000).toISOString(),questions:data.questions,participants:[{user_id:studentId,display_name:'Học viên'}]}];
  const {calls}=await mockCloud(page,'student',{userId:studentId,world:data});
  await page.goto('/index.html#settings');await page.getByRole('button',{name:'Phòng thi',exact:true}).click();
  await page.getByRole('button',{name:'Phòng luyện tập',exact:true}).click();
  await page.getByRole('radio',{name:'Cảm ơn',exact:true}).check();
  await expect(page.locator('#live-save-status')).toHaveText('Đã lưu lựa chọn lên server.');
  await page.reload();await page.getByRole('button',{name:'Phòng thi',exact:true}).click();
  await expect(page.getByRole('radio',{name:'Cảm ơn',exact:true})).toBeChecked();
  await expect(page.locator('#live-clock')).toContainText('Còn');
  await page.getByRole('button',{name:'Làm mới phòng',exact:true}).click();await expect(page.getByRole('radio',{name:'Cảm ơn',exact:true})).toBeChecked();
  await page.setViewportSize({width:390,height:844});
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.live-room').screenshot({path:`test-results/live-${theme}-mobile.png`,animations:'disabled'});
  }
  expect(calls.some(c=>c.path.endsWith('/save_live_answers')&&c.body.answers[0]===null&&c.body.answers[1]===1)).toBe(true);
});
test('A room network failure is reported and refresh recovers without clearing selections',async({page})=>{
  const data=world();
  data.liveRooms=[{id:'00000000-0000-4000-8000-000000000040',host_id:id,title:'Phòng luyện tập',instructions:'Chọn nghĩa',state:'running',join_code:'ABCD1234',duration_seconds:120,ends_at:new Date(Date.now()+120000).toISOString(),questions:data.questions,participants:[{user_id:studentId,display_name:'Học viên'}]}];
  await mockCloud(page,'student',{userId:studentId,world:data});
  await page.goto('/index.html#settings');await page.getByRole('button',{name:'Phòng thi',exact:true}).click();
  await page.getByRole('button',{name:'Phòng luyện tập',exact:true}).click();
  await page.getByRole('radio',{name:'Xin chào',exact:true}).check();
  await expect(page.locator('#live-save-status')).toHaveText('Đã lưu lựa chọn lên server.');
  const fail=route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"offline_fixture"}'});
  await page.route('**/rest/v1/rpc/get_live_room',fail);await page.getByRole('button',{name:'Làm mới phòng',exact:true}).click();
  await expect(page.locator('#live-status')).toContainText('Chưa kết nối được server');
  await page.unroute('**/rest/v1/rpc/get_live_room',fail);await page.getByRole('button',{name:'Làm mới phòng',exact:true}).click();
  await expect(page.locator('#live-status')).toHaveText('Đã kết nối lại phòng thi.');
  await expect(page.getByRole('radio',{name:'Xin chào',exact:true})).toBeChecked();
});
test('Room titles and participant names render as text rather than executable HTML',async({page})=>{
  const data=world(),title='<img src=x onerror=alert(1)>';
  data.liveRooms=[{id:'00000000-0000-4000-8000-000000000040',host_id:id,title,instructions:'Chọn nghĩa',state:'waiting',join_code:'ABCD1234',participants:[{user_id:studentId,display_name:title}],questions:[]}];
  await mockCloud(page,'student',{userId:studentId,world:data});
  await page.goto('/index.html#settings');await page.getByRole('button',{name:'Phòng thi',exact:true}).click();
  await expect(page.locator('#live-history img')).toHaveCount(0);
  await page.getByRole('button',{name:title,exact:true}).click();
  await expect(page.locator('#live-room')).toContainText(title);await expect(page.locator('#live-room img')).toHaveCount(0);
});
