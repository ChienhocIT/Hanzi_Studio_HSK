import { createClient } from '@supabase/supabase-js';
import { KEYS, OWNER, META, snapshot, archive, applySnapshot, switchOwner, uploadProgress, validateSnapshot, recoveryBackup } from './progress.js';
import { mountWorkspace } from './workspace.js';
import { h, field, button } from './ui.js';
import { mountReference } from './reference.js';
import { mountSyllabus } from './syllabus.js';
import { mountTutor } from './tutor.js';
import { mountVideoAI } from './video-ai.js';
import { mountSpeechFallback } from './speech.js';
import { mountStrokes } from './strokes.js';
import { mountFlashcardDecks } from './flashcard-decks.js';
import { mountShell } from './shell.js';
import { setMood } from './mascot.js';
import {authRequest,emailLinkFromUrl} from './auth-request.js';
import {renderStudyCard,focusStudyCard,mountStudyKeyboard,recordStudyRating,setStudyRevealed,createStudyControls,matchesStudyMode,isStudyBookmarked,toggleStudyBookmark,ensureStudyVisible} from './study-card.js';

// Bridge the existing curriculum script to the same renderer used by the library modules.
window.HanziStudyCards={render:renderStudyCard,focus:focusStudyCard,record:recordStudyRating,flip:setStudyRevealed,ensureVisible:ensureStudyVisible,matches:matchesStudyMode,isSaved:isStudyBookmarked,bookmark:toggleStudyBookmark,path:{...createStudyControls(),stage:'all',mode:'all'}};
mountStudyKeyboard(document.getElementById('v4-path'));
if(location.hash==='#path')window.hsRenderPath?.();

mountReference(document.getElementById('reference-container'));
const syllabus = mountSyllabus(document.getElementById('syllabus-container'));
const tutor = mountTutor(document.getElementById('tutor-panel'));
const videoAI = mountVideoAI();
const speechFallback = mountSpeechFallback();
mountStrokes();
mountFlashcardDecks(syllabus);
mountShell();

const root = document.getElementById('cloud-panel');
const authRoot = document.getElementById('auth-panel'), workRoot = document.getElementById('workspace-panel'), chip = document.getElementById('account-chip');
const ROLES = {student:'Học viên',teacher:'Giáo viên',admin:'Quản trị viên'};
let authView = 'login';
const emailCallback=emailLinkFromUrl(location.href);
let emailLink=emailCallback?.link||null;
if(emailCallback){history.replaceState(history.state,'',emailCallback.cleanUrl);if(emailLink)authView='confirm';}
const config = window.HANZI_CLOUD_CONFIG || {};
let client, user, profile, ready = false, syncing = false, conflict = false, timer, initializing = false, recovery = false, pendingSession, bootstrapping=true;
let sessionReadyPromise=Promise.resolve();
let googleEnabled=null;
let authEmail='',authOperation=null,authSignal=null,authCooldownTimer,bootstrapController;
const emailCooldowns=new Map();
const ownerAtLoad = localStorage.getItem(OWNER) || '';
export const reply = async request => { const { data, error } = await request; if (error) throw error; return data; };
function msg(text, error = false) {
  // Settings, sign-in and classroom each show the same status line.
  document.querySelectorAll('#cloud-status,[data-cloud-status]').forEach(el => { el.textContent = text; el.classList.toggle('cloud-error', error);el.setAttribute('role',error?'alert':'status');el.setAttribute('aria-live',error?'assertive':'polite'); });
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
  // Supabase Auth error codes (error.code, or details.code for errors carried back in a redirect URL).
  const codes = {
    auth_request_timeout:'Máy chủ phản hồi quá lâu. Thông tin đã nhập vẫn được giữ. Nếu bạn đang đăng ký, hãy kiểm tra email trước khi thử lại.',
    unexpected_failure:'Máy chủ tài khoản đang gặp lỗi. Nếu đang gửi email xác nhận, hãy thử lại sau hoặc dùng Google.',
    invalid_credentials:'Email hoặc mật khẩu không đúng.', email_not_confirmed:'Hãy xác nhận email trước khi đăng nhập. Chưa nhận được email? Bấm “Gửi lại email xác nhận”.',
    user_already_exists:'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng “Quên mật khẩu?”.', email_exists:'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng “Quên mật khẩu?”.',
    weak_password:'Mật khẩu quá yếu hoặc quá phổ biến. Hãy chọn mật khẩu khó đoán hơn.', same_password:'Mật khẩu mới phải khác mật khẩu hiện tại.',
    over_email_send_rate_limit:'Đã gửi quá nhiều email trong thời gian ngắn. Hãy đợi vài phút rồi thử lại.', over_request_rate_limit:'Bạn thao tác quá nhanh. Hãy đợi một lát rồi thử lại.',
    email_address_not_authorized:'Máy chủ email chưa được cấu hình để gửi tới địa chỉ này. Hãy báo quản trị viên.', email_address_invalid:'Địa chỉ email không hợp lệ.',
    otp_expired:'Liên kết trong email đã hết hạn hoặc đã được dùng. Hãy gửi lại email.', flow_state_expired:'Phiên đăng nhập đã hết hạn. Hãy thử lại.', flow_state_not_found:'Phiên đăng nhập đã hết hạn. Hãy thử lại.',
    signup_disabled:'Đăng ký tài khoản đang tạm đóng.', provider_disabled:'Phương thức đăng nhập này chưa được bật.', email_provider_disabled:'Đăng ký bằng email đang tạm đóng.'
  };
  // A confirmation or reset link opened in a different browser has no PKCE verifier; the email itself is already confirmed.
  if (error.name === 'AuthPKCECodeVerifierMissingError') { msg('Liên kết được mở ở trình duyệt khác nơi bạn gửi yêu cầu. Nếu là email xác nhận, tài khoản đã được xác nhận: hãy đăng nhập. Nếu là đặt lại mật khẩu, hãy gửi lại yêu cầu từ trình duyệt này.', true); return; }
  const raw = String(error.message || ''), code = error.code || error.details?.code;
  if(code==='auth_request_timeout'){msg(codes[code],true);return;}
  if(/token.*(expired|invalid)|email link.*(expired|invalid)/i.test(raw)){msg(codes.otp_expired,true);return;}
  if(/timeout|timed out|aborted|failed to fetch|networkerror/i.test(raw)||error.name==='TimeoutError'){msg('Không kết nối được với máy chủ tài khoản. Kiểm tra mạng rồi thử lại; thông tin đã nhập vẫn được giữ.',true);return;}
  if(/error sending.*email|smtp/i.test(raw)){msg('Máy chủ chưa gửi được email. Vui lòng thử lại sau hoặc đăng nhập Google. Nếu lỗi tiếp tục, quản trị viên cần kiểm tra dịch vụ gửi mail.',true);return;}
  msg(codes[code] || known[raw] || (/^(Hãy |Tiến độ |Tài khoản |Không có |Câu hỏi |Bài trắc nghiệm )/.test(raw) ? raw : 'Không thực hiện được. Kiểm tra kết nối, quyền truy cập và thử lại.'), true);
}
const AUTH_COPY = {
  login:['Chào mừng trở lại','Đăng nhập để đồng bộ tiến độ và vào lớp học.'],
  signup:['Tạo tài khoản học viên','Tiến độ đang học trên thiết bị này vẫn được giữ lại.'],
  forgot:['Quên mật khẩu','Nhập email đã đăng ký, chúng tôi gửi liên kết đặt lại mật khẩu.'],
  reset:['Đặt mật khẩu mới','Chọn mật khẩu có ít nhất 8 ký tự.'],
  resend:['Gửi lại email xác nhận','Nhập email đã đăng ký. Liên kết mới thay cho liên kết cũ.'],
  verify:['Kiểm tra email của bạn','Xác nhận email để đăng nhập và đồng bộ tiến độ.'],
  confirm:['Xác nhận liên kết email','Bấm xác nhận để hoàn tất. Liên kết chỉ dùng được một lần.']
};
const confirmRedirect = () => location.origin + '/index.html#auth';
const passwordField = (label, autocomplete, hint = '') => `<div class="pw-field"><label for="auth-password">${label}</label><div class="pw-control"><input id="auth-password" name="password" type="password" required minlength="${autocomplete==='current-password'?1:8}" maxlength="128" autocomplete="${autocomplete}"><button type="button" class="pw-toggle" data-pw-toggle aria-label="Hiện mật khẩu" aria-pressed="false">Hiện</button></div>${hint ? `<span class="hint" id="auth-password-hint">${hint}</span>` : ''}</div>`;
const destination = () => !profile || profile.role === 'student' ? 'home' : 'classroom';
function renderAuth() {
  clearInterval(authCooldownTimer);
  if (!authRoot) return;
  if (!config.url || !config.key) { authRoot.innerHTML = '<h1>Tài khoản chưa sẵn sàng</h1><p class="auth-intro">Máy chủ tài khoản chưa được kết nối. Bạn vẫn học đầy đủ trên thiết bị này, tiến độ lưu trong trình duyệt.</p><button class="btn btn-primary" data-go="home" data-start>Học ngay</button>'; return; }
  if (!ready) { authRoot.innerHTML = '<h1>Đang kiểm tra phiên đăng nhập</h1><p class="auth-intro cloud-loading">Đang kết nối an toàn với máy chủ tài khoản...</p><p class="auth-status" data-cloud-status role="status" aria-live="polite"></p><button type="button" class="btn" data-cloud="retry-auth">Thử kết nối lại</button>'; return; }
  if (user && !recovery && !emailLink && !['forgot','resend'].includes(authView)) {
    authRoot.innerHTML = `<h1>Bạn đã đăng nhập</h1><p class="auth-intro">${h(profile?.display_name || user.email)}, ${h(ROLES[profile?.role] || 'Người học')}.</p><button class="btn btn-primary" data-go="${destination()}">${destination() === 'home' ? 'Tiếp tục học' : 'Vào lớp học'}</button>${!profile?button('Thử tải lại tài khoản','retry-auth'):''}<div class="auth-divider">hoặc</div>${button('Đăng xuất','logout')}<p class="auth-status" data-cloud-status role="status" aria-live="polite"></p>`;
    return;
  }
  const view = user && recovery ? 'reset' : authView, [title, intro] = AUTH_COPY[view];
  const tabs = view === 'login' || view === 'signup' ? `<div class="seg" role="tablist" aria-label="Đăng nhập hoặc đăng ký"><button type="button" role="tab" id="auth-tab-login" aria-controls="auth-form-panel" tabindex="${view==='login'?0:-1}" aria-selected="${view === 'login'}" data-auth-view="login">Đăng nhập</button><button type="button" role="tab" id="auth-tab-signup" aria-controls="auth-form-panel" tabindex="${view==='signup'?0:-1}" aria-selected="${view === 'signup'}" data-auth-view="signup">Đăng ký</button></div>` : '';
  const email = field('Email','email','email',`autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" value="${h(authEmail)}"`);
  const google = `<div class="auth-divider">hoặc</div>${button('Đăng nhập Google','google')}`;
  const forms = {
    login: `<form class="auth-form" data-account="login">${email}${passwordField('Mật khẩu','current-password')}<div class="auth-row"><button type="button" class="text-link" data-auth-view="forgot">Quên mật khẩu?</button></div><button class="btn btn-primary">Đăng nhập</button></form>${google}<div class="auth-row" style="justify-content:center;margin-top:12px"><button type="button" class="text-link" data-auth-view="resend">Chưa nhận được email xác nhận?</button></div>`,
    signup: `<form class="auth-form" data-account="signup">${field('Tên hiển thị','display_name','text','autocomplete="nickname" maxlength="100"')}${email}${passwordField('Mật khẩu','new-password','Ít nhất 8 ký tự.')}<button class="btn btn-primary">Tạo tài khoản</button></form>${google}<p class="auth-fineprint">Tài khoản mới có quyền học viên. Quyền giáo viên do quản trị viên cấp. Khi tạo tài khoản, bạn đồng ý với <a href="./terms.html" target="_blank" rel="noopener noreferrer">Điều khoản sử dụng</a> và <a href="./privacy.html" target="_blank" rel="noopener noreferrer">Chính sách quyền riêng tư</a>.</p>`,
    forgot: `<form class="auth-form" data-account="forgot">${email}<button class="btn btn-primary">Gửi liên kết đặt lại</button></form><div class="auth-row" style="justify-content:flex-start;margin-top:12px"><button type="button" class="text-link" data-auth-view="login">Quay lại đăng nhập</button></div>`,
    resend: `<form class="auth-form" data-account="resend">${email}<button class="btn btn-primary">Gửi lại email xác nhận</button></form><div class="auth-row" style="justify-content:flex-start;margin-top:12px"><button type="button" class="text-link" data-auth-view="login">Quay lại đăng nhập</button></div>`,
    verify: `<div class="auth-confirmation"><p class="auth-confirm-email">${h(authEmail)}</p><ol><li>Mở thư từ Hanzi Studio và bấm liên kết xác nhận.</li><li>Kiểm tra cả thư mục Spam nếu chưa thấy thư.</li><li>Quay lại đăng nhập sau khi xác nhận.</li></ol><button type="button" class="btn btn-primary" data-auth-view="login">Tôi đã xác nhận · Đăng nhập</button><form data-account="resend"><input type="hidden" name="email" value="${h(authEmail)}"><button class="btn" data-email-resend>Gửi lại email xác nhận</button></form><button type="button" class="text-link" data-auth-view="signup">Đổi địa chỉ email</button><p class="auth-fineprint">Nếu email đã có tài khoản, hãy đăng nhập hoặc chọn Quên mật khẩu. Chưa nhận được thư? Bạn có thể gửi lại sau một phút.</p></div>`,
    confirm: `<form class="auth-form" data-account="confirm"><button class="btn btn-primary">${emailLink?.type==='recovery'?'Tiếp tục đặt lại mật khẩu':'Xác nhận email'}</button></form><div class="auth-confirmation"><button type="button" class="text-link" data-auth-view="${emailLink?.type==='recovery'?'forgot':'resend'}">${emailLink?.type==='recovery'?'Liên kết lỗi? Gửi lại liên kết đặt lại':'Liên kết lỗi? Gửi lại email xác nhận'}</button><button type="button" class="text-link" data-auth-view="login">Đã xác nhận? Đăng nhập</button></div>`,
    reset: `<form class="auth-form" data-account="password">${passwordField('Mật khẩu mới','new-password','Ít nhất 8 ký tự.')}<button class="btn btn-primary">Lưu mật khẩu</button></form>`
  };
  authRoot.innerHTML = `<h1>${title}</h1><p class="auth-intro">${intro}</p>${tabs}<div id="auth-form-panel" ${tabs?`role="tabpanel" aria-labelledby="auth-tab-${view}"`:''}>${forms[view]}</div><p class="auth-status" data-cloud-status role="status" aria-live="polite"></p>`;
  updateGoogleButton();updateEmailCooldown();
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
  el.disabled=googleEnabled!==true||Boolean(authOperation);
  el.textContent=googleEnabled===true?'Đăng nhập Google':googleEnabled===false?'Google chưa được bật':googleEnabled==='unavailable'?'Google tạm chưa khả dụng':'Đang kiểm tra Google';
}
function updateEmailCooldown() {
  const button=authRoot?.querySelector('[data-email-resend]');if(!button)return;
  const update=()=>{if(!button.isConnected){clearInterval(authCooldownTimer);return;}const seconds=Math.max(0,Math.ceil(((emailCooldowns.get(authEmail.toLowerCase())||0)-Date.now())/1000));button.disabled=seconds>0;button.textContent=seconds?'Gửi lại sau '+seconds+' giây':'Gửi lại email xác nhận';if(!seconds)clearInterval(authCooldownTimer);};
  update();if(button.disabled)authCooldownTimer=setInterval(update,1000);
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
  if (initializing) { pendingSession=session; return sessionReadyPromise; }
  const next = session?.user || null;
  if (ready && user?.id === next?.id) return;
  initializing = true; clearTimeout(timer);
  let finishSession;sessionReadyPromise=new Promise(resolve=>{finishSession=resolve;});
  try {
    if (switchOwner(localStorage, next?.id || '')) { location.reload(); return; }
    user = next;
    profile = user ? await reply(client.from('profiles').select('*').eq('id',user.id).single()) : null;
    ready = true; render(); syllabus.setSession(client, profile); tutor.setSession(client, profile); videoAI.setSession(client, profile); speechFallback.setSession(client, profile);
    if (user) {
      if (location.hash === '#auth' && !recovery && !emailLink) { setMood('success'); window.nav?.(destination()); }
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
  } catch (error) { ready = true; render(); syllabus.setSession(client, profile); tutor.setSession(client, profile); videoAI.setSession(client, profile); speechFallback.setSession(client, profile); failure(error); }
  finally {
    initializing = false;finishSession();
    if (pendingSession !== undefined) { const nextSession=pendingSession; pendingSession=undefined; sessionChanged(nextSession); }
  }
}
async function onSubmit(event) {
  const form=event.target.closest('[data-account]');if(!form)return;
  event.preventDefault();if(authOperation)return;
  const values=Object.fromEntries(new FormData(form)),action=form.dataset.account;
  if(values.email){values.email=values.email.trim();authEmail=values.email;}
  if(action==='resend'&&(emailCooldowns.get(authEmail.toLowerCase())||0)>Date.now()){updateEmailCooldown();return;}
  const operation={controller:new AbortController()};authOperation=operation;
  const controls=[...form.querySelectorAll('button')],submit=form.querySelector('button:not([type="button"])'),caption=submit?.textContent;
  controls.forEach(x=>x.disabled=true);form.setAttribute('aria-busy','true');updateGoogleButton();
  if(submit)submit.textContent={login:'Đang đăng nhập…',signup:'Đang tạo tài khoản…',resend:'Đang gửi email…',forgot:'Đang gửi liên kết…',confirm:'Đang xác nhận…',password:'Đang lưu mật khẩu…'}[action]||'Đang lưu…';
  msg('Đang kết nối với máy chủ…');setMood('thinking');
  try {
    await authRequest(async signal=>{
      authSignal=signal;let data;
      switch(action){
        case 'login':data=await reply(client.auth.signInWithPassword({email:values.email,password:values.password}));break;
        case 'confirm':if(!emailLink)throw {code:'otp_expired'};data=await reply(client.auth.verifyOtp(emailLink));break;
        case 'signup':data=await reply(client.auth.signUp({email:values.email,password:values.password,options:{emailRedirectTo:confirmRedirect(),data:{display_name:values.display_name.trim()}}}));break;
        case 'resend':data=await reply(client.auth.resend({type:'signup',email:values.email,options:{emailRedirectTo:confirmRedirect()}}));break;
        case 'forgot':data=await reply(client.auth.resetPasswordForEmail(values.email,{redirectTo:confirmRedirect()}));break;
        case 'password':data=await reply(client.auth.updateUser({password:values.password}));break;
        case 'name':data=await reply(client.rpc('update_display_name',{name:values.name}));break;
      }
      if(signal.aborted||authOperation!==operation)return;
      if(action==='confirm'){
        const recovering=emailLink?.type==='recovery';emailLink=null;authEmail=data?.user?.email||authEmail;if(recovering)recovery=true;
        await sessionChanged(data?.session||null);renderAuth();window.nav?.(recovering?'auth':destination());msg(recovering?'Đã xác nhận liên kết. Chọn mật khẩu mới.':'Email đã được xác nhận.');setMood('success');return;
      }
      if(!form.isConnected)return;
      switch(action){
        case 'login':form.reset();break;
        case 'signup':
          if(!data?.session){emailCooldowns.set(authEmail.toLowerCase(),Date.now()+60000);authView='verify';renderAuth();msg('Đã gửi yêu cầu tạo tài khoản. Kiểm tra email để hoàn tất xác nhận.');setMood('excited','Kiểm tra hộp thư để xác nhận nhé!');}break;
        case 'resend':emailCooldowns.set(authEmail.toLowerCase(),Date.now()+60000);authView='verify';renderAuth();msg('Nếu email đã đăng ký và chưa xác nhận, liên kết mới đã được gửi. Kiểm tra cả thư mục Spam.');setMood('happy');break;
        case 'forgot':msg('Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Kiểm tra cả thư mục Spam.');setMood('happy');break;
        case 'password':recovery=false;try{sessionStorage.removeItem('hanzi-auth-recovery');}catch{}if(root.contains(form))form.remove();renderAuth();msg('Đã đổi mật khẩu.');setMood('success');break;
        case 'name':profile.display_name=values.name;msg('Đã lưu tên hiển thị.');break;
      }
    },{signal:operation.controller.signal});
  }catch(error){if(authOperation===operation&&form.isConnected)failure(error);}
  finally{
    if(authOperation===operation){authOperation=null;authSignal=null;updateGoogleButton();}
    if(form.isConnected){form.removeAttribute('aria-busy');controls.forEach(x=>x.disabled=false);if(submit)submit.textContent=caption;}
  }
}

async function onClick(event) {
  const target = event.target.closest('[data-cloud]');
  if (!target) return;
  target.disabled=true;
  try {
    switch (target.dataset.cloud) {
      case 'retry-auth':await initializeAccount();break;
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
      case 'google': await authRequest(async signal=>{authSignal=signal;try{return await reply(client.auth.signInWithOAuth({provider:'google',options:{redirectTo:confirmRedirect()}}));}finally{if(authSignal===signal)authSignal=null;}}); break;
      case 'password': passwordForm(); break;
      case 'logout': try{sessionStorage.removeItem('hanzi-auth-recovery');}catch{}await authRequest(async signal=>{authSignal=signal;try{return await reply(client.auth.signOut({scope:'local'}));}finally{if(authSignal===signal)authSignal=null;}}); break;
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
  if (view && AUTH_COPY[view]) { authOperation?.controller.abort();authOperation=null;authSignal=null;emailLink=null;authView=view;renderAuth();setMood(view==='signup'?'happy':'hello'); }
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
authRoot?.addEventListener('input',event=>{if(event.target.name==='email')authEmail=event.target.value;});
authRoot?.addEventListener('keydown',event=>{const tabs=[...authRoot.querySelectorAll('[role="tab"]')];const index=tabs.indexOf(event.target);if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;const view=tabs[next].dataset.authView;tabs[next].click();authRoot.querySelector('[data-auth-view="'+view+'"]')?.focus();});
render();
if (config.url && config.key) {
  client=createClient(config.url,config.key,{global:{fetch:(input,init={})=>fetch(input,{...init,signal:AbortSignal.any([...(init.signal?[init.signal]:[]),...(authSignal?[authSignal]:[]),AbortSignal.timeout(15000)])})},auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  client.auth.onAuthStateChange((event,session)=>{
    if (event==='PASSWORD_RECOVERY'){recovery=true;try{sessionStorage.setItem('hanzi-auth-recovery',session.user.id);}catch{}}
    if(bootstrapping)return;
    // Run database requests after Supabase releases its auth lock.
    setTimeout(()=>{sessionChanged(session);if(recovery&&ready&&user){passwordForm();renderAuth();window.nav?.('auth');}},0);
  });
  // initialize() reports what getSession() swallows: an expired email link or a PKCE code opened in another browser.
  initializeAccount();
  fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(10000)}).then(async response=>{
    if(!response.ok)throw Error('Auth settings unavailable');
    const settings=await response.json();googleEnabled=settings.external?.google===true;updateGoogleButton();
  }).catch(()=>{googleEnabled='unavailable';updateGoogleButton();});
  window.addEventListener('hanzi:progress',schedule);
  window.addEventListener('online',schedule);
  window.addEventListener('storage',event=>{
    if ((event.key===OWNER&&(localStorage.getItem(OWNER)||'')!==ownerAtLoad)||KEYS.includes(event.key)) location.reload();
  });
  setInterval(()=>{if(document.visibilityState==='visible')schedule();},60000);
}

async function initializeAccount() {
  bootstrapController?.abort();const controller=new AbortController();bootstrapController=controller;
  bootstrapping=true;ready=false;render();
  try {
    await authRequest(async signal=>{
      authSignal=signal;
      const [init,{data,error}]=await Promise.all([client.auth.initialize(),client.auth.getSession()]);
      if(signal.aborted)return;
      try{const marker=sessionStorage.getItem('hanzi-auth-recovery');if(marker&&marker===data?.session?.user?.id)recovery=true;else if(marker)sessionStorage.removeItem('hanzi-auth-recovery');}catch{}
      const problem=init?.error||error||(emailCallback&&!emailCallback.link?{code:'otp_expired'}:null);
      if(problem){const url=new URL(location.href);['code','error','error_code','error_description'].forEach(k=>url.searchParams.delete(k));history.replaceState(history.state,'',url.pathname+url.search+(/error/.test(location.hash)?'#auth':location.hash));}
      await sessionChanged(data?.session||null);
      if(signal.aborted)return;
      if(problem){window.nav?.('auth');failure(problem);}
    },{signal:controller.signal});
  }catch(error){if(!controller.signal.aborted){ready=true;render();failure(error);}}
  finally{if(bootstrapController===controller){authSignal=null;bootstrapping=false;}}
}
