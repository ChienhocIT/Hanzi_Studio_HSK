import { h } from './ui.js';
// "Trợ giảng AI" page: chat with Mây Long and sentence grading through POST /api/tutor (server/tutor.mjs).
// The conversation stays in memory only; the server checks the Supabase session and a 30-message daily quota.
const ERRORS = {
  not_authenticated: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  tutor_quota_exceeded: 'Bạn đã dùng hết 30 lượt hôm nay. Mây Long gặp lại bạn vào ngày mai nhé!',
  tutor_rate_limited: 'Bạn gửi hơi nhanh. Chờ vài giây rồi gửi lại nhé.',
  tutor_not_configured: 'Trợ giảng AI chưa được bật trên máy chủ. Hãy báo quản trị viên.',
  invalid_request: 'Tin nhắn quá dài hoặc không hợp lệ. Hãy rút gọn rồi gửi lại.',
  model_bad_output: 'Mây Long chưa chấm được câu này. Hãy thử lại.'
};
const SUGGESTIONS = ['Phân biệt 了 và 过', 'Cách dùng câu chữ 把', 'Giải thích 的, 得, 地', 'Đặt câu với 因为…所以…'];
// Escape first, then allow **bold** and "- " bullets only.
export function richText(text) {
  const lines = h(text).split(/\r?\n/);
  let html = '', list = false;
  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet && !list) { html += '<ul>'; list = true; }
    if (!bullet && list) { html += '</ul>'; list = false; }
    const inline = (bullet ? bullet[1] : line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html += bullet ? `<li>${inline}</li>` : inline ? `<p>${inline}</p>` : '';
  }
  return html + (list ? '</ul>' : '');
}
export function mountTutor(root) {
  if (!root) return { setSession() {} };
  let client = null, profile = null, tab = 'chat', busy = false, left = null;
  let generation=0,controller=null;
  const messages = [];
  const quota = () => left === null ? '' : `Còn ${left}/30 lượt hôm nay`;
  function shell() {
    root.innerHTML = `<div class="tutor-head"><img src="./assets/mascot/learn-online.webp" alt="" width="256" height="256"><div><h1>Trợ giảng AI Mây Long</h1><p>Hỏi về từ vựng, ngữ pháp, phát âm; nhờ chấm câu tiếng Trung của bạn.</p></div><span class="tutor-quota" id="tutor-quota" aria-live="polite">${quota()}</span></div><div id="tutor-body"></div><p class="tutor-note">Mây Long dùng AI (Google Gemini) nên có thể sai, hãy đối chiếu với giáo viên khi cần. Đừng nhập thông tin cá nhân: ở gói miễn phí, Google có thể dùng nội dung trò chuyện để cải thiện dịch vụ. <a href="./privacy.html">Quyền riêng tư</a></p>`;
    render();
  }
  const body = () => root.querySelector('#tutor-body');
  function render() {
    if (!body()) return;
    if (!client) { body().innerHTML = window.HANZI_CLOUD_CONFIG?.url ? '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>' : '<div class="gate"><p>Trợ giảng AI cần máy chủ tài khoản. Tính năng này chưa được kết nối.</p></div>'; return; }
    if (!profile) { body().innerHTML = '<div class="gate"><p>Đăng nhập để trò chuyện với Mây Long và nhờ chấm câu. Mỗi tài khoản có 30 lượt mỗi ngày.</p><button type="button" class="btn btn-primary" data-go="auth" data-auth-view="login">Đăng nhập để dùng trợ giảng</button></div>'; return; }
    body().innerHTML = `<div class="seg tutor-tabs" role="tablist" aria-label="Chế độ trợ giảng"><button type="button" role="tab" aria-selected="${tab === 'chat'}" data-tutor-tab="chat">Hỏi đáp</button><button type="button" role="tab" aria-selected="${tab === 'grade'}" data-tutor-tab="grade">Chấm câu</button></div>${tab === 'chat' ? chatView() : gradeView()}<p class="tutor-status" id="tutor-status" role="status" aria-live="polite"></p>`;
    const log = root.querySelector('.tutor-log'); if (log) log.scrollTop = log.scrollHeight;
  }
  const bubble = m => `<div class="tutor-msg ${m.role === 'user' ? 'from-user' : 'from-tutor'}">${m.role === 'user' ? `<p>${h(m.text)}</p>` : richText(m.text) || '<p class="cloud-loading">Mây Long đang suy nghĩ...</p>'}</div>`;
  const chatView = () => `<div class="tutor-log" aria-live="polite">${messages.length ? messages.map(bubble).join('') : `<div class="tutor-empty"><p>Chào bạn! Mình là Mây Long. Bạn muốn hỏi gì về tiếng Trung?</p><div class="tutor-chips">${SUGGESTIONS.map(s => `<button type="button" class="chip" data-tutor-ask="${h(s)}">${h(s)}</button>`).join('')}</div></div>`}</div><form class="tutor-form" data-tutor-form="chat"><label class="sr-only" for="tutor-input">Câu hỏi cho Mây Long</label><textarea id="tutor-input" name="text" rows="2" maxlength="2000" required placeholder="Nhập câu hỏi, ví dụ: 吧 dùng khi nào?" ${busy ? 'disabled' : ''}></textarea><div class="tutor-actions">${messages.length ? '<button type="button" class="btn" data-tutor-clear>Cuộc trò chuyện mới</button>' : ''}<button class="btn btn-primary" ${busy ? 'disabled' : ''}>Gửi</button></div></form>`;
  const gradeView = () => `<form class="tutor-form cloud-form" data-tutor-form="grade"><label>Câu tiếng Trung của bạn<textarea name="sentence" rows="2" maxlength="300" required placeholder="我昨天去学校了"></textarea></label><label>Bạn muốn nói gì? (tiếng Việt, không bắt buộc)<input name="meaning" maxlength="300" placeholder="Hôm qua tôi đã đến trường"></label><button class="btn btn-primary" ${busy ? 'disabled' : ''}>Chấm câu</button></form><div id="tutor-result"></div>`;
  const status = (text, error = false) => { const el = root.querySelector('#tutor-status'); if (el) { el.textContent = text; el.classList.toggle('cloud-error', error); } };
  function setLeft(value) { if (value !== null && Number.isFinite(value)) { left = value; const el = root.querySelector('#tutor-quota'); if (el) el.textContent = quota(); } }
  async function call(payload,owner) {
    const { data } = await client.auth.getSession();
    if(owner!==generation)throw Error('stale_session');
    const token = data.session?.access_token;
    if (!token) throw Error('not_authenticated');
    controller=new AbortController();
    const response = await fetch('./api/tutor', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(payload),signal:controller.signal });
    if(owner!==generation){await response.body?.cancel();throw Error('stale_session');}
    setLeft(Number(response.headers.get('x-tutor-remaining') ?? NaN));
    if (!response.ok) { let code = ''; try { code = (await response.json()).error; } catch {} if (code === 'tutor_quota_exceeded') setLeft(0); throw Error(code || 'request_failed'); }
    return response;
  }
  const failure = error => status(ERRORS[error.message] || 'Mây Long đang bận. Hãy thử lại sau ít phút.', true);
  async function ask(text) {
    if (busy || !text.trim()) return;
    const owner=generation;
    busy = true; messages.push({ role: 'user', text: text.trim() }, { role: 'model', text: '' }); render();
    const answer = messages.at(-1);
    try {
      const response = await call({ mode: 'chat', messages: messages.slice(0, -1) },owner);
      const reader = response.body.getReader(), decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();if(owner!==generation){await reader.cancel();return;} if (done) break;
        answer.text += decoder.decode(value, { stream: true });
        const last = root.querySelectorAll('.tutor-msg.from-tutor'); if (last.length) last[last.length - 1].innerHTML = richText(answer.text);
        const log = root.querySelector('.tutor-log'); if (log) log.scrollTop = log.scrollHeight;
      }
    } catch (error) {if(owner!==generation)return; messages.splice(-2, 2); busy = false; render(); failure(error); root.querySelector('#tutor-input').value = text; return; }
    busy = false; render(); root.querySelector('#tutor-input')?.focus();
  }
  async function grade(sentence, meaning) {
    if (busy) return;
    const owner=generation;
    busy = true; render(); status('Mây Long đang chấm...');
    const form = root.querySelector('[data-tutor-form="grade"]'); form.sentence.value = sentence; form.meaning.value = meaning;
    try {
      const { result } = await (await call({ mode: 'grade', sentence, meaning },owner)).json();
      if(owner!==generation)return;
      busy = false; render();
      const again = root.querySelector('[data-tutor-form="grade"]'); again.sentence.value = sentence; again.meaning.value = meaning;
      root.querySelector('#tutor-result').innerHTML = `<article class="tutor-score"><div class="score-ring" style="--score:${Number(result.score) || 0}"><strong>${Number(result.score) || 0}</strong><span>/100</span></div><div><p class="tutor-corrected" lang="zh-Hans">${h(result.corrected)}</p><p lang="zh-Latn" class="panel-sub">${h(result.pinyin)}</p><p>${h(result.feedback)}</p></div></article>${result.errors.length ? `<ul class="tutor-errors">${result.errors.map(e => `<li><strong lang="zh-Hans">${h(e.part)}</strong><span>${h(e.issue)}</span><span>Sửa: <span lang="zh-Hans">${h(e.fix)}</span></span></li>`).join('')}</ul>` : '<p class="tutor-perfect">Câu của bạn không có lỗi. Tuyệt vời!</p>'}`;
      status('');
    } catch (error) {if(owner!==generation)return; busy = false; render(); const again = root.querySelector('[data-tutor-form="grade"]'); again.sentence.value = sentence; again.meaning.value = meaning; failure(error); }
  }
  root.addEventListener('submit', event => {
    const form = event.target.closest('[data-tutor-form]'); if (!form) return;
    event.preventDefault();
    if (form.dataset.tutorForm === 'chat') ask(form.text.value);
    else grade(form.sentence.value.trim(), form.meaning.value.trim());
  });
  root.addEventListener('keydown', event => {
    if (event.target.id === 'tutor-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); event.target.form.requestSubmit(); }
  });
  root.addEventListener('click', event => {
    const tabButton = event.target.closest('[data-tutor-tab]');
    if (tabButton && !busy) { tab = tabButton.dataset.tutorTab; render(); return; }
    const chip = event.target.closest('[data-tutor-ask]'); if (chip) { ask(chip.dataset.tutorAsk); return; }
    if (event.target.closest('[data-tutor-clear]') && !busy) { messages.length = 0; render(); }
  });
  shell();
  return {
    async setSession(nextClient, nextProfile) {
      if (client === nextClient && profile?.id === nextProfile?.id) return;
      const owner=++generation;controller?.abort();controller=null;busy=false;
      client = nextClient; profile = nextProfile; messages.length = 0; left = null; shell();
      if (client && profile) { const { data } = await client.rpc('tutor_quota_left'); if(owner===generation&&typeof data === 'number') setLeft(data); }
    }
  };
}
