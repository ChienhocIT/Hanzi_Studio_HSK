import { createClient } from '@supabase/supabase-js';
import { KEYS, OWNER, META, snapshot, archive, applySnapshot, switchOwner, uploadProgress, validateSnapshot, recoveryBackup } from './progress.js';
import { mountWorkspace } from './workspace.js';
import { h, field, button } from './ui.js';
import { mountReference } from './reference.js';
import { mountShell } from './shell.js';
import { setMood } from './mascot.js';

mountReference(document.getElementById('reference-container'));
mountShell();

const root = document.getElementById('cloud-panel');
const authRoot = document.getElementById('auth-panel'), workRoot = document.getElementById('workspace-panel'), chip = document.getElementById('account-chip');
const ROLES = {student:'Học viên',teacher:'Giáo viên',admin:'Quản trị viên'};
let authView = 'login';
const config = window.HANZI_CLOUD_CONFIG || {};
let client, user, profile, ready = false, syncing = false, conflict = false, timer, initializing = false, recovery = false, pendingSession;
let googleEnabled=null;
const ownerAtLoad = localStorage.getItem(OWNER) || '';
export const reply = async request => { const { data, error } = await request; if (error) throw error; return data; };
function msg(text, error = false) {
  // Settings, sign-in and classroom each show the same status line.
  document.querySelectorAll('#cloud-status,[data-cloud-status]').forEach(el => { el.textContent = text; el.classList.toggle('cloud-error', error); });
  if (error) setMood('surprised');
}
function failure(error) {
  console.error('Hanzi cloud:', error.code || error.name || 'request_failed');
  const known = {
    'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
    'Email not confirmed': 'Hãy xác nhận email trước khi đăng nhập.',
    'deadline_passed': 'Đã quá hạn nộp bài.', 'already_graded': 'Bài đã được chấm, không thể sửa câu trả lời.',
    'invalid_or_closed_class': 'Mã lớp không đúng hoặc lớp đã đóng nhận học viên.',
    'independent_reviewer_required': 'Cần quản trị viên khác duyệt học liệu đã gửi.',
    'content_conflict': 'Học liệu đã thay đổi. Hãy tải lại danh sách.',
    'content_conflict_or_forbidden': 'Bản nháp đã thay đổi hoặc không còn được phép sửa.',
    'teacher_required': 'Chức năng này cần quyền giáo viên.', 'admin_required': 'Chức năng này cần quyền quản trị.',
    'cannot_demote_self': 'Không thể tự thu hồi quyền quản trị.',
    'future_deadline_required': 'Hạn nộp phải ở trong tương lai.',
    'already_submitted':'Bạn đã nộp bài trắc nghiệm này. Hãy tải lại lớp để xem kết quả.',
    'invalid_questions':'Câu hỏi hoặc đáp án không hợp lệ. Kiểm tra các lựa chọn.',
    'all_answers_required':'Hãy trả lời đủ tất cả câu hỏi.',
    'invalid_answer':'Lựa chọn không hợp lệ. Hãy mở lại bài tập.',
    'progress_owner_changed':'Tài khoản đã đổi trong lúc đồng bộ. Hãy tải lại trang.'
  };
  const raw = String(error.message || '');
  msg(known[raw] || (/^(Hãy |Tiến độ |Tài khoản |Không có |Câu hỏi |Bài trắc nghiệm )/.test(raw) ? raw : 'Không thực hiện được. Kiểm tra kết nối, quyền truy cập và thử lại.'), true);
}
const AUTH_COPY = {
  login:['Chào mừng trở lại','Đăng nhập để đồng bộ tiến độ và vào lớp học.'],
  signup:['Tạo tài khoản học viên','Tiến độ đang học trên thiết bị này vẫn được giữ lại.'],
  forgot:['Quên mật khẩu','Nhập email đã đăng ký, chúng tôi gửi liên kết đặt lại mật khẩu.'],
  reset:['Đặt mật khẩu mới','Chọn mật khẩu có ít nhất 8 ký tự.']
};
const passwordField = (label, autocomplete, hint = '') => `<div class="pw-field"><label>${label}<input name="password" type="password" required minlength="8" maxlength="128" autocomplete="${autocomplete}"></label><button type="button" class="pw-toggle" data-pw-toggle aria-label="Hiện mật khẩu" aria-pressed="false">Hiện</button>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
const destination = () => !profile || profile.role === 'student' ? 'home' : 'classroom';
function renderAuth() {
  if (!authRoot) return;
  if (!config.url || !config.key) { authRoot.innerHTML = '<h1>Tài khoản chưa sẵn sàng</h1><p class="auth-intro">Máy chủ tài khoản chưa được kết nối. Bạn vẫn học đầy đủ trên thiết bị này, tiến độ lưu trong trình duyệt.</p><button class="btn btn-primary" data-go="home" data-start>Học ngay</button>'; return; }
  if (!ready) { authRoot.innerHTML = '<h1>Đang kiểm tra phiên đăng nhập</h1><p class="auth-intro cloud-loading">Chỉ mất vài giây...</p>'; return; }
  if (user && !recovery) {
    authRoot.innerHTML = `<h1>Bạn đã đăng nhập</h1><p class="auth-intro">${h(profile?.display_name || user.email)}, ${h(ROLES[profile?.role] || 'Người học')}.</p><button class="btn btn-primary" data-go="${destination()}">${destination() === 'home' ? 'Tiếp tục học' : 'Vào lớp học'}</button><div class="auth-divider">hoặc</div>${button('Đăng xuất','logout')}<p class="auth-status" data-cloud-status role="status" aria-live="polite"></p>`;
    return;
  }
  const view = user && recovery ? 'reset' : authView, [title, intro] = AUTH_COPY[view];
  const tabs = view === 'login' || view === 'signup' ? `<div class="seg" role="tablist" aria-label="Đăng nhập hoặc đăng ký"><button type="button" role="tab" aria-selected="${view === 'login'}" data-auth-view="login">Đăng nhập</button><button type="button" role="tab" aria-selected="${view === 'signup'}" data-auth-view="signup">Đăng ký</button></div>` : '';
  const email = field('Email','email','email','autocomplete="email" maxlength="254"');
  const google = `<div class="auth-divider">hoặc</div>${button('Đăng nhập Google','google')}`;
  const forms = {
    login: `<form class="auth-form" data-account="login">${email}${passwordField('Mật khẩu','current-password')}<div class="auth-row"><button type="button" class="text-link" data-auth-view="forgot">Quên mật khẩu?</button></div><button class="btn btn-primary">Đăng nhập</button></form>${google}`,
    signup: `<form class="auth-form" data-account="signup">${field('Tên hiển thị','display_name','text','autocomplete="nickname" maxlength="100"')}${email}${passwordField('Mật khẩu','new-password','Ít nhất 8 ký tự.')}<button class="btn btn-primary">Tạo tài khoản</button></form>${google}<p class="auth-fineprint">Tài khoản mới có quyền học viên. Quyền giáo viên do quản trị viên cấp.</p>`,
    forgot: `<form class="auth-form" data-account="forgot">${email}<button class="btn btn-primary">Gửi liên kết đặt lại</button></form><div class="auth-row" style="justify-content:flex-start;margin-top:12px"><button type="button" class="text-link" data-auth-view="login">Quay lại đăng nhập</button></div>`,
    reset: `<form class="auth-form" data-account="password">${passwordField('Mật khẩu mới','new-password','Ít nhất 8 ký tự.')}<button class="btn btn-primary">Lưu mật khẩu</button></form>`
  };
  authRoot.innerHTML = `<h1>${title}</h1><p class="auth-intro">${intro}</p>${tabs}${forms[view]}<p class="auth-status" data-cloud-status role="status" aria-live="polite"></p>`;
  updateGoogleButton();
}
function renderClassroom() {
  if (!workRoot) return;
  const role = user ? profile?.role || 'student' : '';
  const copy = {student:['Lớp của tôi','Bài tập, hạn nộp, điểm và phòng thi của các lớp bạn tham gia.','outfit-scholar'],teacher:['Không gian giảng dạy','Tạo lớp, soạn học liệu, giao bài, chấm điểm và mở phòng thi.','outfit-teacher'],admin:['Quản trị Hanzi Studio','Duyệt học liệu, cấp quyền và theo dõi các lớp bạn phụ trách.','expr-confident']}[role] || ['Lớp học trực tuyến','Đăng nhập để vào lớp, nộp bài và tham gia phòng thi.','outfit-scholar'];
  document.getElementById('classroom-title').textContent = copy[0];
  document.getElementById('classroom-sub').textContent = copy[1];
  document.getElementById('classroom-role').textContent = ROLES[role] || 'Khách';
  document.getElementById('classroom-mascot').src = `./assets/mascot/${copy[2]}.webp`;
  if (!config.url || !config.key) { workRoot.innerHTML = '<div class="gate"><h3>Lớp học chưa được kết nối</h3><p>Lớp học cần máy chủ tài khoản. Các bài học trên thiết bị vẫn dùng được bình thường.</p><button class="btn" data-go="home">Về trang tổng quan</button></div>'; return; }
  if (!ready) { workRoot.innerHTML = '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>'; return; }
  if (!user) { workRoot.innerHTML = '<div class="gate"><h3>Đăng nhập để vào lớp</h3><p>Giáo viên gửi bạn mã lớp. Sau khi đăng nhập, nhập mã để nhận bài tập và vào phòng thi.</p><button class="btn btn-primary" data-go="auth" data-auth-view="login">Đăng nhập hoặc tạo tài khoản</button></div>'; return; }
  workRoot.innerHTML = '<div id="cloud-workspace"><p class="cloud-loading">Đang tải lớp học...</p></div>';
}
function renderChip() {
  if (!chip) return;
  const name = profile?.display_name || user?.email || '';
  chip.dataset.go = user ? 'settings' : 'auth';
  chip.setAttribute('aria-label', user ? `Tài khoản: ${name}` : 'Tài khoản: đăng nhập');
  chip.querySelector('.chip-text').innerHTML = user ? `${h(name.split('@')[0].slice(0,24))}<small>${h(ROLES[profile?.role] || 'Người học')}</small>` : 'Khách<small>Đăng nhập</small>';
  chip.querySelector('.avatar').innerHTML = user ? h((name.trim()[0] || 'H').toUpperCase()) : '<img src="./assets/mascot/expr-happy.webp" alt="" width="256" height="256">';
}
function render() {
  renderAuth(); renderClassroom(); renderChip();
  root.innerHTML = '<h3>Tài khoản & đồng bộ</h3><p class="panel-sub">Đồng bộ tiến độ giữa các thiết bị. Lớp học nằm ở mục Lớp học &amp; phòng thi.</p><p id="cloud-status" role="status" aria-live="polite"></p><div id="cloud-account"></div>';
  const account = root.querySelector('#cloud-account');
  if (!config.url || !config.key) { account.innerHTML = '<p>Đang học trên thiết bị này. Tài khoản và lớp học sẽ khả dụng khi quản trị viên kết nối dịch vụ đồng bộ.</p>'; return; }
  if (!ready) { account.innerHTML = '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>'; return; }
  if (!user) {
    account.innerHTML = '<div class="gate"><h3>Bạn đang học với tư cách khách</h3><p>Tiến độ lưu trên trình duyệt này. Đăng nhập để đồng bộ và vào lớp học.</p><button class="btn btn-primary" data-go="auth" data-auth-view="login">Đăng nhập hoặc tạo tài khoản</button></div>';
    return;
  }
  account.innerHTML = `<p><strong>${h(profile?.display_name || user.email || 'Người học')}</strong> (${h({student:'Học viên',teacher:'Giáo viên',admin:'Quản trị viên'}[profile?.role] || '')})</p><form data-account="name" class="cloud-form">${field('Tên hiển thị','name','text',`maxlength="100" value="${h(profile?.display_name)}"`)}<button class="btn">Lưu tên</button></form><div class="cloud-actions">${button('Đồng bộ ngay','sync')}${button('Lấy bản trên cloud','download')}${button('Dùng bản thiết bị','upload')}${button('Nhập tiến độ khách','migrate')}${button('Đổi mật khẩu','password')}${button('Đăng xuất','logout')}</div><p class="panel-sub">Tự đồng bộ sau khi chọn bản khởi đầu. Xung đột sẽ tạm dừng đồng bộ. Bản bị thay thế được lưu riêng trên thiết bị.</p><div id="cloud-recovery"></div>`;
  if (recovery) passwordForm();
  account.insertAdjacentHTML('beforeend',`<details><summary>Phục hồi dữ liệu trước khi thay thế</summary><p>Xuất bản lưu trước rồi nhập tệp bằng “Khôi phục tất cả” bên dưới nếu cần quay lại.</p><div class="cloud-actions">${button('Xuất bản thiết bị trước','export-local-backup')}${button('Xuất bản cloud trước','export-cloud-backup')}</div></details>`);
}
function updateGoogleButton() {
  const el=authRoot?.querySelector('[data-cloud="google"]');
  if(!el)return;
  el.disabled=googleEnabled!==true;
  el.textContent=googleEnabled===true?'Đăng nhập Google':googleEnabled===false?'Google chưa được bật':'Đang kiểm tra Google';
}
function passwordForm() {
  const el = root.querySelector('#cloud-recovery');
  if (el) el.innerHTML = `<form class="cloud-form" data-account="password">${field('Mật khẩu mới (ít nhất 8 ký tự)','password','password','minlength="8" maxlength="128" autocomplete="new-password"')}<button class="btn">Lưu mật khẩu</button></form>`;
}
async function sync() {
  if (!user || !ready || syncing || conflict || !localStorage.getItem(META)) return;
  syncing = true; msg('Đang đồng bộ tiến độ...');
  try {
    const id = user.id;
    const meta = JSON.parse(localStorage.getItem(META) || 'null');
    const before = JSON.stringify(snapshot(localStorage));
    if (meta?.owner === id && meta.synced === before) {
      const row = await reply(client.from('learning_progress').select('*').eq('user_id',id).maybeSingle());
      if (localStorage.getItem(OWNER) !== id || user?.id !== id) return;
      if (before === JSON.stringify(snapshot(localStorage))) {
        if (row && row.revision !== meta.revision) {
          validateSnapshot(row.snapshot); archive(localStorage,id); applySnapshot(localStorage,row.snapshot);
          localStorage.setItem(META,JSON.stringify({owner:id,revision:row.revision,synced:JSON.stringify(row.snapshot)}));
          location.reload(); return;
        }
        msg('Tiến độ đã đồng bộ.'); return;
      }
    }
    const result = await uploadProgress(client, localStorage, user.id);
    msg('Đã đồng bộ tiến độ.');
    if (result.pending) schedule();
  } catch (error) {
    if (error.code === '40001' || String(error.message).includes('progress_conflict')) {
      conflict = true; msg('Có bản mới từ thiết bị khác. Chọn “Lấy bản trên cloud” hoặc “Dùng bản thiết bị” để giải quyết.', true);
    } else failure(error);
  } finally { syncing = false; }
}
function schedule() { clearTimeout(timer); timer = setTimeout(sync, 1200); }
async function chooseProgress(direction) {
  if (syncing) throw Error('Hãy chờ lần đồng bộ hiện tại hoàn tất.');
  syncing = true; clearTimeout(timer);
  try {
    const id=user.id;
    const row = await reply(client.from('learning_progress').select('*').eq('user_id', id).maybeSingle());
    if (localStorage.getItem(OWNER)!==id || user?.id!==id) throw Error('Tài khoản đã thay đổi. Hãy tải lại trang.');
    if (direction === 'download') {
      if (!row) { msg('Cloud chưa có dữ liệu. Chọn “Dùng bản thiết bị” để khởi tạo.'); return; }
      validateSnapshot(row.snapshot);
      if (!window.confirm('Thay tiến độ thiết bị bằng bản cloud? Bản hiện tại sẽ được lưu riêng trên thiết bị.')) return;
      archive(localStorage, user.id); applySnapshot(localStorage, row.snapshot);
      localStorage.setItem(META, JSON.stringify({owner:user.id,revision:row.revision,synced:JSON.stringify(row.snapshot)}));
      location.reload();
    } else {
      if (!window.confirm('Dùng tiến độ thiết bị cho tài khoản này? Nếu cloud có dữ liệu, bản cloud sẽ được lưu riêng trên thiết bị trước khi thay.')) return;
      if (row) localStorage.setItem(`hanzi-cloud-remote-backup:${user.id}`, JSON.stringify(row));
      localStorage.setItem(META, JSON.stringify({owner:user.id,revision:row?.revision || 0}));
      conflict = false; syncing = false; await sync();
    }
  } finally { syncing = false; }
}
async function sessionChanged(session) {
  if (initializing) { pendingSession=session; return; }
  const next = session?.user || null;
  if (ready && user?.id === next?.id) return;
  initializing = true; clearTimeout(timer);
  try {
    if (switchOwner(localStorage, next?.id || '')) { location.reload(); return; }
    user = next;
    profile = user ? await reply(client.from('profiles').select('*').eq('id',user.id).single()) : null;
    ready = true; render();
    if (user) {
      if (location.hash === '#auth' && !recovery) { setMood('success'); window.nav?.(destination()); }
      await mountWorkspace(document.getElementById('cloud-workspace'), client, user, profile, msg, failure);
      const meta = JSON.parse(localStorage.getItem(META) || 'null');
      if (meta?.owner === user.id) {
        const row = await reply(client.from('learning_progress').select('*').eq('user_id',user.id).maybeSingle());
        if (row && row.revision !== meta.revision && meta.synced === JSON.stringify(snapshot(localStorage))) {
          validateSnapshot(row.snapshot); archive(localStorage,user.id); applySnapshot(localStorage,row.snapshot);
          localStorage.setItem(META,JSON.stringify({owner:user.id,revision:row.revision,synced:JSON.stringify(row.snapshot)}));
          location.reload(); return;
        }
        schedule();
      } else msg('Chọn bản cloud hoặc bản thiết bị để bắt đầu đồng bộ. “Nhập tiến độ khách” chuyển dữ liệu trước khi đăng nhập.');
    }
  } catch (error) { ready = true; render(); failure(error); }
  finally {
    initializing = false;
    if (pendingSession !== undefined) { const nextSession=pendingSession; pendingSession=undefined; sessionChanged(nextSession); }
  }
}
async function onSubmit(event) {
  const form = event.target.closest('[data-account]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const controls = [...form.querySelectorAll('button')]; controls.forEach(x=>x.disabled=true); msg('Đang xử lý...'); setMood('thinking');
  try {
    switch (form.dataset.account) {
      case 'login': await reply(client.auth.signInWithPassword({email:values.email,password:values.password})); form.reset(); break;
      case 'signup':
        await reply(client.auth.signUp({email:values.email,password:values.password,options:{emailRedirectTo:location.origin+'/index.html#auth',data:{display_name:values.display_name.trim()}}}));
        form.reset(); msg('Đã gửi yêu cầu tạo tài khoản. Mở email xác nhận rồi đăng nhập.'); setMood('excited','Kiểm tra hộp thư để xác nhận nhé!'); break;
      case 'forgot':
        await reply(client.auth.resetPasswordForEmail(values.email,{redirectTo:location.origin+'/index.html#auth'}));
        msg('Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'); setMood('happy'); break;
      case 'password': await reply(client.auth.updateUser({password:values.password})); recovery=false; if (root.contains(form)) form.remove(); renderAuth(); msg('Đã đổi mật khẩu.'); setMood('success'); break;
      case 'name': await reply(client.rpc('update_display_name',{name:values.name})); profile.display_name=values.name; msg('Đã lưu tên hiển thị.'); break;
    }
  } catch (error) { failure(error); }
  finally { controls.forEach(x=>{ if (x.isConnected) x.disabled=false; }); }
}
async function onClick(event) {
  const target = event.target.closest('[data-cloud]');
  if (!target) return;
  target.disabled=true;
  try {
    switch (target.dataset.cloud) {
      case 'export-local-backup':
      case 'export-cloud-backup': {
        const remote=target.dataset.cloud==='export-cloud-backup';
        const saved=JSON.parse(localStorage.getItem(`${remote?'hanzi-cloud-remote-backup:':'hanzi-cloud-archive:'}${user.id}`)||'null');
        if(!saved)throw Error('Không có bản lưu trước trên thiết bị này.');
        const backup=recoveryBackup(remote?saved.snapshot:saved);
        const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download=`HanziStudio_phuc-hoi_${remote?'cloud':'thiet-bi'}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
        msg('Đã xuất bản phục hồi. Tệp chứa dữ liệu học cá nhân, hãy giữ ở nơi an toàn.');break;
      }
      case 'google': await reply(client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/index.html#auth'}})); break;
      case 'password': passwordForm(); break;
      case 'logout': await reply(client.auth.signOut({scope:'local'})); break;
      case 'sync': if (!localStorage.getItem(META)) msg('Hãy chọn bản cloud hoặc bản thiết bị để bắt đầu.',true); else await sync(); break;
      case 'upload': await chooseProgress('upload'); break;
      case 'download': await chooseProgress('download'); break;
      case 'migrate': {
        if(syncing)throw Error('Hãy chờ lần đồng bộ hiện tại hoàn tất.');
        const guest=JSON.parse(localStorage.getItem('hanzi-cloud-archive:guest')||'null');
        if (!guest) { msg('Không có tiến độ khách trên thiết bị này.'); break; }
        validateSnapshot(guest);
        if (!window.confirm('Thay tiến độ tài khoản trên thiết bị bằng tiến độ khách? Bản tài khoản được lưu riêng. Bạn sẽ chọn đồng bộ cloud sau.')) return;
        archive(localStorage,user.id); applySnapshot(localStorage,guest); localStorage.removeItem(META); location.reload(); break;
      }
    }
  } catch (error) { failure(error); }
  finally { target.disabled=false; }
}
for (const el of [root, authRoot].filter(Boolean)) { el.addEventListener('submit', onSubmit); el.addEventListener('click', onClick); }
document.addEventListener('click', event => {
  const view = event.target.closest('[data-auth-view]')?.dataset.authView;
  if (view && AUTH_COPY[view]) { authView = view; renderAuth(); setMood(view === 'signup' ? 'happy' : 'hello'); }
  const toggle = event.target.closest('[data-pw-toggle]');
  if (toggle) {
    const input = toggle.parentElement.querySelector('input'), show = input.type === 'password';
    input.type = show ? 'text' : 'password'; toggle.textContent = show ? 'Ẩn' : 'Hiện';
    toggle.setAttribute('aria-pressed', String(show)); toggle.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  }
});
// Mây Long reacts to the field in focus and looks away while a password is typed.
authRoot?.addEventListener('focusin', event => {
  const name = event.target.name;
  if (name === 'email') setMood('curious'); else if (name === 'password') setMood('shy'); else if (name === 'display_name') setMood('happy', 'Mây Long nên gọi bạn là gì?');
});
render();
if (config.url && config.key) {
  client=createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  client.auth.onAuthStateChange((event,session)=>{
    if (event==='PASSWORD_RECOVERY') recovery=true;
    // Run database requests after Supabase releases its auth lock.
    setTimeout(()=>{sessionChanged(session);if(recovery&&ready&&user){passwordForm();renderAuth();window.nav?.('auth');}},0);
  });
  client.auth.getSession().then(({data,error})=>{if(error)failure(error);else sessionChanged(data.session);});
  fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(10000)}).then(async response=>{
    if(!response.ok)throw Error('Auth settings unavailable');
    const settings=await response.json();googleEnabled=settings.external?.google===true;updateGoogleButton();
  }).catch(()=>{googleEnabled=false;const el=authRoot?.querySelector('[data-cloud="google"]');if(el){el.disabled=true;el.textContent='Google tạm chưa khả dụng';}});
  window.addEventListener('hanzi:progress',schedule);
  window.addEventListener('online',schedule);
  window.addEventListener('storage',event=>{
    if ((event.key===OWNER&&(localStorage.getItem(OWNER)||'')!==ownerAtLoad)||KEYS.includes(event.key)) location.reload();
  });
  setInterval(()=>{if(document.visibilityState==='visible')schedule();},60000);
}
