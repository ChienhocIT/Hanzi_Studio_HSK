import {test,expect} from '@playwright/test';
// Real hanzi-writer-data stroke for 一 (one horizontal stroke), served for every character the test does not fail.
const ONE={strokes:['M 518 382 Q 572 385 623 389 Q 758 399 900 383 Q 928 379 935 390 Q 944 405 930 419 Q 896 452 845 475 Q 829 482 798 473 Q 723 460 480 434 Q 180 409 137 408 Q 130 408 124 408 Q 108 408 106 395 Q 105 380 127 363 Q 146 348 183 334 Q 195 330 216 338 Q 232 344 306 354 Q 400 373 518 382 Z'],medians:[[[121,393],[193,372],[417,402],[827,434],[920,401]]]};
async function strokeData(page,{missing=[],failOnce=[]}={}){
  const hits={};
  await page.route('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**',route=>{
    const ch=decodeURIComponent(route.request().url().split('/').pop().replace('.json',''));hits[ch]=(hits[ch]||0)+1;
    if(missing.includes(ch))return route.fulfill({status:404,body:'not found'});
    if(failOnce.includes(ch)&&hits[ch]===1)return route.abort();
    return route.fulfill({contentType:'application/json',body:JSON.stringify(ONE)});
  });
  return hits;
}
// Draws across the stage box from one fraction point to another, like a finger or a mouse.
async function draw(page,[x1,y1],[x2,y2]){
  const box=await page.locator('.stroke-dialog [data-stroke-stage] svg').boundingBox();
  await page.mouse.move(box.x+box.width*x1,box.y+box.height*y1);await page.mouse.down();
  await page.mouse.move(box.x+box.width*x2,box.y+box.height*y2,{steps:12});await page.mouse.up();
}

test('Character practice shows stroke order and grades handwriting against the model strokes',async({page})=>{
  await strokeData(page);
  const license=await page.request.get('/data/HANZI-WRITER-LICENSE.txt');
  expect(license.ok()).toBe(true);expect(await license.text()).toContain('Copyright (c) 2014 David Chanin');
  await page.goto('/index.html#characters');
  await page.getByRole('button',{name:'Luyện viết có chấm nét',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:/Thứ tự nét/});
  await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading')).toContainText('矮');
  const status=dialog.getByRole('status');
  await expect(status).toHaveText('Viết chữ 矮: 1 nét, theo đúng thứ tự và hướng nét.');
  await draw(page,[.5,.1],[.5,.9]);
  await expect(status).toHaveText('Nét 1 chưa đúng. Đã sai 1 lần.');
  await draw(page,[.13,.5],[.88,.47]);
  await expect(status).toHaveText('Hoàn thành chữ 矮 với 1 lỗi.');
  await dialog.getByRole('button',{name:'Xem thứ tự nét',exact:true}).click();
  await expect(status).toHaveText('Chữ 矮 có 1 nét. Bấm "Xem thứ tự nét" để xem lại.');
  await expect(dialog.getByRole('button',{name:'Gợi ý sau 3 lần sai'})).toBeHidden();
  await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
  await expect(dialog).toBeHidden();await expect(page.locator('[data-stroke-stage]')).toBeEmpty();
});

test('Missing stroke data is explained, a network failure can be retried and leaving the page closes practice',async({page})=>{
  const hits=await strokeData(page,{missing:['乂'],failOnce:['好']});
  await page.goto('/index.html#home');
  await page.evaluate(()=>document.querySelector('#page-home').insertAdjacentHTML('beforeend','<button type="button" data-strokes="乂好乂">Nét thử</button>'));
  await page.getByRole('button',{name:'Nét thử'}).click();
  const dialog=page.getByRole('dialog',{name:/Thứ tự nét/}),status=dialog.getByRole('status');
  await expect(dialog.locator('[data-stroke-char]')).toHaveText(['乂','好']);
  await expect(status).toHaveText('Chưa có dữ liệu nét cho chữ 乂.');await expect(dialog.getByRole('button',{name:'Thử lại'})).toBeHidden();
  await dialog.getByRole('button',{name:'好',exact:true}).click();
  await expect(status).toHaveText('Không tải được dữ liệu nét. Hãy kiểm tra kết nối mạng rồi thử lại.');
  await dialog.getByRole('button',{name:'Thử lại',exact:true}).click();
  await expect(status).toHaveText('Chữ 好 có 1 nét. Bấm "Xem thứ tự nét" để xem lại.');
  await dialog.getByRole('button',{name:'乂',exact:true}).click();
  await expect(status).toHaveText('Chưa có dữ liệu nét cho chữ 乂.');
  expect(hits).toEqual({'乂':1,'好':2});
  await page.evaluate(()=>nav('stats'));
  await expect(dialog).toBeHidden();
});

test('Typing practice offers handwriting only after the answer is checked',async({page})=>{
  await strokeData(page);
  await page.goto('/index.html#writing');
  await page.getByRole('button',{name:'Gõ chữ Hán',exact:true}).click();
  await expect(page.getByRole('button',{name:'Luyện viết tay 矮'})).toHaveCount(0);
  await page.getByLabel('Nhập chữ Hán bạn nhớ được').fill('矮');
  await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  await page.getByRole('button',{name:'Luyện viết tay 矮'}).click();
  await expect(page.getByRole('dialog',{name:/Thứ tự nét/}).getByRole('status')).toHaveText('Viết chữ 矮: 1 nét, theo đúng thứ tự và hướng nét.');
});

test('Malformed stroke data can be retried without a JavaScript exception',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let attempts=0;
  await page.route('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**',route=>route.fulfill({json:++attempts===1?{strokes:['broken'],medians:[[]]}:ONE}));
  await page.goto('/index.html#characters');
  await page.getByRole('button',{name:'Luyện viết có chấm nét',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:/Thứ tự nét/});
  await expect(dialog.getByRole('status')).toContainText('Không tải được dữ liệu nét');
  await dialog.getByRole('button',{name:'Thử lại',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Viết chữ 矮: 1 nét');
  expect(errors).toEqual([]);expect(attempts).toBe(2);
});

test('Closing practice discards pending data and reduced-motion mobile practice remains usable',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  let release;const pending=new Promise(resolve=>release=resolve);
  await page.route('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**',async route=>{await pending;await route.fulfill({json:ONE});});
  await page.goto('/index.html#characters');
  await page.getByRole('button',{name:'Xem thứ tự nét',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:/Thứ tự nét/});
  await expect(dialog.getByRole('status')).toContainText('Đang tải');
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  release();
  await page.locator('#toggle-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Xem thứ tự nét',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Chữ 矮 có 1 nét');
  await expect(dialog.locator('svg')).toHaveCount(1);
  const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(375);
  await page.screenshot({path:'test-results/strokes-mobile.png'});
  await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
  await expect(page.locator('.stroke-dialog [data-stroke-stage]')).toBeEmpty();
});

test('Restarting handwriting reuses document pointer listeners',async({page})=>{
  await strokeData(page);
  await page.addInitScript(()=>{
    const add=document.addEventListener;
    window.pointerListeners=0;
    document.addEventListener=function(type,...args){if(type==='mouseup'||type==='touchend')window.pointerListeners++;return add.call(this,type,...args);};
  });
  await page.goto('/index.html#characters');
  const before=await page.evaluate(()=>window.pointerListeners);
  await page.getByRole('button',{name:'Luyện viết có chấm nét',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:/Thứ tự nét/});
  await expect(dialog.getByRole('status')).toContainText('Viết chữ 矮');
  for(let i=0;i<3;i++){
    await dialog.getByRole('button',{name:'Viết lại',exact:true}).click();
    await expect(dialog.getByRole('status')).toContainText('Viết chữ 矮');
  }
  expect(await page.evaluate(()=>window.pointerListeners)-before).toBe(2);
  await draw(page,[.13,.5],[.88,.47]);
  await expect(dialog.getByRole('status')).toHaveText('Hoàn thành chữ 矮 với 0 lỗi.');
});
