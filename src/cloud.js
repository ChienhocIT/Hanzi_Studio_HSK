import { createClient } from '@supabase/supabase-js';
import { KEYS, OWNER, META, snapshot, archive, applySnapshot, switchOwner, uploadProgress, validateSnapshot, recoveryBackup } from './progress.js';
import { mountWorkspace } from './workspace.js';
import { h, field, button } from './ui.js';
import { mountReference } from './reference.js';

mountReference(document.getElementById('reference-container'));

const root = document.getElementById('cloud-panel');
const config = window.HANZI_CLOUD_CONFIG || {};
let client, user, profile, ready = false, syncing = false, conflict = false, timer, initializing = false, recovery = false, pendingSession;
let googleEnabled=null;
const ownerAtLoad = localStorage.getItem(OWNER) || '';
export const reply = async request => { const { data, error } = await request; if (error) throw error; return data; };
function msg(text, error = false) {
  const el = root.querySelector('#cloud-status');
  if (el) { el.textContent = text; el.classList.toggle('cloud-error', error); }
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
function render() {
  root.innerHTML = '<h3>Tài khoản & không gian học tập</h3><p class="panel-sub">Đồng bộ tiến độ, học liệu được duyệt và lớp học.</p><p id="cloud-status" role="status" aria-live="polite"></p><div id="cloud-account"></div><div id="cloud-workspace"></div>';
  const account = root.querySelector('#cloud-account');
  if (!config.url || !config.key) { account.innerHTML = '<p>Đang học trên thiết bị này. Tài khoản và lớp học sẽ khả dụng khi quản trị viên kết nối dịch vụ đồng bộ.</p>'; return; }
  if (!ready) { account.innerHTML = '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>'; return; }
  if (!user) {
    account.innerHTML = `<form data-account="login" class="cloud-form">${field('Email','email','email','autocomplete="email" maxlength="254"')}${field('Mật khẩu','password','password','autocomplete="current-password" minlength="8" maxlength="128"')}<div class="cloud-actions"><button class="btn btn-primary" value="login">Đăng nhập</button><button class="btn" value="signup">Tạo tài khoản</button></div></form><div class="cloud-actions">${button('Đăng nhập Google','google')}${button('Quên mật khẩu','forgot')}</div><p class="panel-sub">Tài khoản mới luôn có quyền học viên. Email có thể cần xác nhận. Tiến độ khách được giữ riêng trên thiết bị.</p>`;
    updateGoogleButton();
    return;
  }
  account.innerHTML = `<p><strong>${h(profile?.display_name || user.email || 'Người học')}</strong> (${h({student:'Học viên',teacher:'Giáo viên',admin:'Quản trị viên'}[profile?.role] || '')})</p><form data-account="name" class="cloud-form">${field('Tên hiển thị','name','text',`maxlength="100" value="${h(profile?.display_name)}"`)}<button class="btn">Lưu tên</button></form><div class="cloud-actions">${button('Đồng bộ ngay','sync')}${button('Lấy bản trên cloud','download')}${button('Dùng bản thiết bị','upload')}${button('Nhập tiến độ khách','migrate')}${button('Đổi mật khẩu','password')}${button('Đăng xuất','logout')}</div><p class="panel-sub">Tự đồng bộ sau khi chọn bản khởi đầu. Xung đột sẽ tạm dừng đồng bộ. Bản bị thay thế được lưu riêng trên thiết bị.</p><div id="cloud-recovery"></div>`;
  if (recovery) passwordForm();
  account.insertAdjacentHTML('beforeend',`<details><summary>Phục hồi dữ liệu trước khi thay thế</summary><p>Xuất bản lưu trước rồi nhập tệp bằng “Khôi phục tất cả” bên dưới nếu cần quay lại.</p><div class="cloud-actions">${button('Xuất bản thiết bị trước','export-local-backup')}${button('Xuất bản cloud trước','export-cloud-backup')}</div></details>`);
}
function updateGoogleButton() {
  const el=root.querySelector('[data-cloud="google"]');
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
      await mountWorkspace(root.querySelector('#cloud-workspace'), client, user, profile, msg, failure);
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
root.addEventListener('submit', async event => {
  const form = event.target.closest('[data-account]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const controls = [...form.querySelectorAll('button')]; controls.forEach(x=>x.disabled=true); msg('Đang xử lý...');
  try {
    switch (form.dataset.account) {
      case 'login':
        if (event.submitter?.value === 'signup') {
          await reply(client.auth.signUp({...values,options:{emailRedirectTo:location.origin+'/index.html#settings'}}));
          msg('Đã gửi yêu cầu tạo tài khoản. Kiểm tra email xác nhận rồi đăng nhập.');
        } else await reply(client.auth.signInWithPassword(values));
        form.reset(); break;
      case 'password': await reply(client.auth.updateUser({password:values.password})); recovery=false; form.remove(); msg('Đã đổi mật khẩu.'); break;
      case 'name': await reply(client.rpc('update_display_name',{name:values.name})); profile.display_name=values.name; msg('Đã lưu tên hiển thị.'); break;
    }
  } catch (error) { failure(error); }
  finally { controls.forEach(x=>x.disabled=false); }
});
root.addEventListener('click', async event => {
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
      case 'google': await reply(client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/index.html#settings'}})); break;
      case 'forgot': {
        const email=root.querySelector('[name="email"]'); if (!email.reportValidity()) return;
        await reply(client.auth.resetPasswordForEmail(email.value,{redirectTo:location.origin+'/index.html#settings'}));
        msg('Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'); break;
      }
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
});
render();
if (config.url && config.key) {
  client=createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  client.auth.onAuthStateChange((event,session)=>{
    if (event==='PASSWORD_RECOVERY') recovery=true;
    // Run database requests after Supabase releases its auth lock.
    setTimeout(()=>{sessionChanged(session);if(recovery&&ready&&user)passwordForm();},0);
  });
  client.auth.getSession().then(({data,error})=>{if(error)failure(error);else sessionChanged(data.session);});
  fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(10000)}).then(async response=>{
    if(!response.ok)throw Error('Auth settings unavailable');
    const settings=await response.json();googleEnabled=settings.external?.google===true;updateGoogleButton();
  }).catch(()=>{const el=root.querySelector('[data-cloud="google"]');if(el){el.disabled=true;el.textContent='Google tạm chưa khả dụng';}});
  window.addEventListener('hanzi:progress',schedule);
  window.addEventListener('online',schedule);
  window.addEventListener('storage',event=>{
    if ((event.key===OWNER&&(localStorage.getItem(OWNER)||'')!==ownerAtLoad)||KEYS.includes(event.key)) location.reload();
  });
  setInterval(()=>{if(document.visibilityState==='visible')schedule();},60000);
}
