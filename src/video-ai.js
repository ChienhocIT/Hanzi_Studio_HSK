// Video Lab AI helpers: subtitles from a YouTube link (server/tutor.mjs mode "transcript") and voice role-play
// built from the lesson's dialogue. Video Lab (video.js) receives subtitles through the hanzi:video-transcript event.
const ERRORS = {
  not_authenticated: 'Đăng nhập để tạo phụ đề bằng AI.',
  tutor_quota_exceeded: 'Bạn đã dùng hết 30 lượt AI hôm nay.',
  tutor_rate_limited: 'Bạn bấm hơi nhanh. Chờ vài giây rồi thử lại.',
  tutor_not_configured: 'Trợ giảng AI chưa được bật trên máy chủ.',
  invalid_request: 'Liên kết chưa đúng. Dán link video YouTube công khai (youtube.com/watch?v=… hoặc youtu.be/…).',
  video_unreadable: 'AI không đọc được video này. Video cần ở chế độ công khai (không riêng tư hay không công khai).',
  video_no_chinese: 'Không tìm thấy lời nói tiếng Trung trong video này.',
  model_unavailable: 'Máy chủ AI miễn phí đang quá tải. Hãy thử lại sau ít phút.'
};
const $ = id => document.getElementById(id);
function message(text, type = 'info') { const box = $('video-message'); if (box) { box.textContent = text; box.className = 'vl-message ' + type; box.hidden = !text; } }
// Lesson lines without "00:01 --> 00:03" timing rows.
export function dialogueLines(raw) { return String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(s => s && !/-->/.test(s) && /[㐀-鿿]/.test(s)); }
export function mountVideoAI() {
  let client = null, profile = null, busy = false, generation = 0;
  function ensure() {
    const head = document.querySelector('#page-video .vl-input-head'), actions = document.querySelector('#page-video .vl-editor-actions');
    if (head && !$('vl-ai-transcript')) head.insertAdjacentHTML('beforeend', '<button type="button" class="vl-text-link vl-ai-link" id="vl-ai-transcript">✦ Tạo phụ đề bằng AI</button>');
    if (actions && !$('vl-ai-voice')) actions.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-listen" id="vl-ai-voice"><span class="ico-mic" aria-hidden="true"></span>Luyện nói với Mây Long</button>');
  }
  async function transcribe(button) {
    if (busy) return;
    if (!client || !profile) { message(ERRORS.not_authenticated, 'warn'); return; }
    const link = $('vl-youtube-link')?.value.trim() || '';
    const videoId = link.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)?.[1];
    if (!videoId) { message(ERRORS.invalid_request, 'warn'); return; }
    const id = ++generation, original = $('vl-transcript-input')?.value;
    busy = true; button.disabled = true; message('Mây Long đang xem video và chép lời (tối đa 10 phút đầu video). Có thể mất 1–2 phút...', 'info');
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token; if (!token) throw Error('not_authenticated');
      const response = await fetch('./api/tutor', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: 'transcript', url: link }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(result.error || 'model_unavailable');
      const current = $('vl-youtube-link')?.value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)?.[1];
      if (id !== generation || current !== videoId || $('vl-transcript-input')?.value !== original) { message('Đã bỏ phụ đề AI vừa nhận vì bạn đã đổi video hoặc sửa lời thoại trong lúc chờ.', 'warn'); return; }
      window.dispatchEvent(new CustomEvent('hanzi:video-transcript', { detail: { videoId, title: result.title || $('vl-title-input')?.value || 'Bài học từ video', segments: result.segments } }));
    } catch (error) { if (id === generation) message(ERRORS[error.message] || ERRORS.model_unavailable, 'error'); }
    finally { busy = false; button.disabled = false; }
  }
  function practice() {
    const lines = dialogueLines($('vl-transcript-input')?.value);
    if (!lines.length) { message('Chưa có lời thoại tiếng Trung. Dán lời thoại hoặc bấm “Tạo phụ đề bằng AI” trước.', 'warn'); return; }
    window.dispatchEvent(new CustomEvent('hanzi:voice-context', { detail: { title: $('vl-title-input')?.value || 'Video', text: lines.join('\n').slice(0, 4000), lines: lines.length } }));
    window.nav?.('tutor');
  }
  window.addEventListener('hanzi:route', event => { if (event.detail === 'video') setTimeout(ensure, 0); });
  document.addEventListener('click', event => {
    const button = event.target.closest('#vl-ai-transcript'); if (button) { transcribe(button); return; }
    if (event.target.closest('#vl-ai-voice')) practice();
  });
  if (location.hash === '#video') setTimeout(ensure, 0);
  return { setSession(nextClient, nextProfile) { if (profile?.id !== nextProfile?.id) generation++; client = nextClient; profile = nextProfile; } };
}
