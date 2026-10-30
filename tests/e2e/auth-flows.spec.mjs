import {test,expect} from '@playwright/test';
import {mockCloud} from './cloud-fixture.mjs';
const signup=async page=>{await page.getByRole('tab',{name:'Đăng ký',exact:true}).click();await page.getByLabel('Tên hiển thị',{exact:true}).fill('Người học');await page.getByLabel('Email',{exact:true}).fill('new@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('fake-password');};

test('Signup has an explicit confirmation step, retains email and bounds resend frequency',async({page})=>{
  const {calls}=await mockCloud(page,'student',{authenticated:false});await page.clock.install();await page.goto('/index.html#auth');await signup(page);await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Kiểm tra email của bạn'})).toBeVisible();await expect(page.locator('.auth-confirm-email')).toHaveText('new@example.test');
  await expect(page.locator('[data-email-resend]')).toBeDisabled();await page.clock.fastForward(61000);await expect(page.locator('[data-email-resend]')).toBeEnabled();
  await page.locator('[data-email-resend]').click();await expect(page.locator('[data-email-resend]')).toBeDisabled();expect(calls.filter(c=>c.path.endsWith('/resend'))).toHaveLength(1);
  await page.getByRole('button',{name:'Tôi đã xác nhận · Đăng nhập',exact:true}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('new@example.test');
});

test('A stalled signup times out, preserves fields and ignores a late response before retry',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});let release,attempts=0;const hold=new Promise(resolve=>release=resolve);
  await page.route('**/auth/v1/signup**',async route=>{if(++attempts===1){await hold;await route.fallback().catch(()=>{});}else await route.fallback();});
  await page.clock.install();await page.goto('/index.html#auth');await signup(page);await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect.poll(()=>attempts).toBe(1);
  await expect(page.locator('[data-account="signup"]')).toHaveAttribute('aria-busy','true');await page.clock.fastForward(15001);
  await expect(page.locator('#auth-panel [role="alert"]')).toContainText('phản hồi quá lâu');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('new@example.test');await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveValue('fake-password');await expect(page.getByRole('button',{name:'Tạo tài khoản',exact:true})).toBeEnabled();
  release();await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(page.getByRole('heading',{name:'Kiểm tra email của bạn'})).toBeVisible();expect(attempts).toBe(2);
});

test('Leaving signup cancels its pending request without replacing the login form later',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});let release,attempted=false;const hold=new Promise(resolve=>release=resolve);
  await page.route('**/auth/v1/signup**',async route=>{attempted=true;await hold;await route.fallback().catch(()=>{});});
  await page.goto('/index.html#auth');await signup(page);await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect.poll(()=>attempted).toBe(true);
  await page.getByRole('tab',{name:'Đăng nhập',exact:true}).click();release();await expect(page.locator('[data-account="login"]')).toBeVisible();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('new@example.test');await expect(page.locator('[data-account="signup"],[data-email-resend]')).toHaveCount(0);
});

test('SMTP failures are actionable and do not erase the registration form',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});await page.route('**/auth/v1/signup**',route=>route.fulfill({status:500,json:{code:'unexpected_failure',msg:'Error sending confirmation email'}}));
  await page.goto('/index.html#auth');await signup(page);await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await expect(page.locator('#auth-panel [role="alert"]')).toContainText('chưa gửi được email');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('new@example.test');await expect(page.getByRole('button',{name:'Tạo tài khoản',exact:true})).toBeEnabled();
});

test('A confirmation link works without a PKCE verifier and is consumed only after confirmation',async({page})=>{
  const {session}=await mockCloud(page,'student',{authenticated:false});let verified=0;
  await page.route('**/auth/v1/verify',route=>{verified++;expect(route.request().postDataJSON()).toMatchObject({type:'email',token_hash:'a'.repeat(64)});return route.fulfill({json:session});});
  await page.goto('/index.html?token_hash='+'a'.repeat(64)+'&type=email#auth');await expect(page).toHaveURL(/index\.html#auth$/);await expect(page.getByRole('button',{name:'Xác nhận email',exact:true})).toBeVisible();expect(verified).toBe(0);
  await page.getByRole('button',{name:'Xác nhận email',exact:true}).click();await expect(page).toHaveURL(/#home$/);expect(verified).toBe(1);
});

test('An expired confirmation link exposes resend/login and never leaves the button busy',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});await page.route('**/auth/v1/verify',route=>route.fulfill({status:403,json:{code:'otp_expired',msg:'Token has expired or is invalid'}}));
  await page.goto('/index.html?token_hash='+'a'.repeat(64)+'&type=email#auth');await page.getByRole('button',{name:'Xác nhận email',exact:true}).click();await expect(page.locator('#auth-panel [role="alert"]')).toContainText('đã hết hạn');await expect(page.getByRole('button',{name:'Xác nhận email',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Liên kết lỗi? Gửi lại email xác nhận',exact:true}).click();await expect(page.locator('[data-account="resend"]')).toBeVisible();
});

test('A recovery link opens the password form in a new browser and saves the new password',async({page})=>{
  const {session}=await mockCloud(page,'student',{authenticated:false});await page.route('**/auth/v1/verify',route=>route.fulfill({json:session}));
  await page.goto('/index.html?token_hash='+'b'.repeat(64)+'&type=recovery#auth');await page.getByRole('button',{name:'Tiếp tục đặt lại mật khẩu',exact:true}).click();await expect(page.getByRole('heading',{name:'Đặt mật khẩu mới',exact:true})).toBeVisible();
  await page.getByLabel('Mật khẩu mới',{exact:true}).fill('new-fake-password');await page.getByRole('button',{name:'Lưu mật khẩu',exact:true}).click();await expect(page.locator('#auth-panel [data-cloud-status]')).toContainText('Đã đổi mật khẩu');
});

test('Mobile auth puts the form first, keeps keyboard tabs and aligns the password toggle',async({page})=>{
  await page.setViewportSize({width:375,height:812});await mockCloud(page,'student',{authenticated:false});await page.goto('/index.html#auth');await expect(page.getByLabel('Email',{exact:true})).toBeVisible();await expect(page.locator('.auth-brand')).toBeHidden();
  await page.getByRole('tab',{name:'Đăng nhập',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Đăng ký',exact:true})).toBeFocused();
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const input=await page.getByLabel('Mật khẩu',{exact:true}).boundingBox(),toggle=await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).boundingBox();expect(toggle.y).toBeGreaterThanOrEqual(input.y);expect(toggle.y+toggle.height).toBeLessThanOrEqual(input.y+input.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  const google=page.getByRole('button',{name:'Đăng nhập Google',exact:true});await expect(google).toBeEnabled();
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);const contrast=await google.evaluate(button=>{const css=getComputedStyle(button),lum=color=>{const values=color.match(/[\d.]+/g).slice(0,3).map(n=>Number(n)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};const a=lum(css.color),b=lum(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);}
});

test('Login accepts an existing short password without applying signup password rules',async({page})=>{
  await mockCloud(page,'student',{authenticated:false});await page.goto('/index.html#auth');await page.getByLabel('Email',{exact:true}).fill('existing@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('old123');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/#home$/);
});

test('A stalled initial profile check exits the loader with account recovery controls',async({page})=>{
  await mockCloud(page,'student');let release,started=false;const hold=new Promise(resolve=>release=resolve);
  await page.route('**/rest/v1/profiles?**',async route=>{started=true;await hold;await route.fallback().catch(()=>{});});
  await page.clock.install();await page.goto('/index.html#auth');await expect.poll(()=>started).toBe(true);await page.clock.fastForward(15001);
  await expect(page.getByText('Đang kiểm tra phiên đăng nhập',{exact:true})).toHaveCount(0);await expect(page.locator('#auth-panel [role="alert"]')).toBeVisible();await expect(page.getByRole('button',{name:'Thử tải lại tài khoản',exact:true})).toBeVisible();release();
});
