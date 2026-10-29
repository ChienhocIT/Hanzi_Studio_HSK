import { h } from './ui.js';
// Voice practice with Gemini Live. The server (server/tutor.mjs, mode "live") checks the session and quota, then
// returns a one-use ephemeral token with the setup locked in; the browser talks to Gemini directly over WebSocket.
// Microphone: AudioWorklet -> 16 kHz 16-bit PCM in 100 ms chunks. Speaker: 24 kHz PCM queued on an AudioContext.
export const MODES = {
  talk: { label: 'Hội thoại', hint: 'Mây Long nói chuyện bằng tiếng Trung đơn giản và sửa lỗi cho bạn.' },
  natural: { label: 'Giọng tự nhiên', hint: 'Giọng đọc tự nhiên hơn (Gemini Native Audio), phản hồi nhanh.' },
  'translate-zh': { label: 'Việt → Trung', hint: 'Bạn nói tiếng Việt, Mây Long nói lại bằng tiếng Trung.' },
  'translate-vi': { label: 'Trung → Việt', hint: 'Bạn nói tiếng Trung, Mây Long dịch sang tiếng Việt để bạn kiểm tra.' },
  transcribe: { label: 'Chép lời', hint: 'Đọc to tiếng Trung, xem máy chép lại chữ Hán bạn vừa nói.' }
};
const WORKLET = `class HanziMic extends AudioWorkletProcessor{constructor(){super();this.step=sampleRate/16000;this.pos=0;this.sum=0;this.n=0;this.out=[];}
process(inputs){const ch=inputs[0][0];if(!ch)return true;for(let i=0;i<ch.length;i++){this.sum+=ch[i];this.n++;this.pos++;if(this.pos>=this.step){this.pos-=this.step;this.out.push(this.sum/this.n);this.sum=0;this.n=0;}}
while(this.out.length>=1600){const part=this.out.splice(0,1600),pcm=new Int16Array(1600);for(let i=0;i<1600;i++){const v=Math.max(-1,Math.min(1,part[i]));pcm[i]=v<0?v*32768:v*32767;}this.port.postMessage(pcm.buffer,[pcm.buffer]);}return true;}}
registerProcessor('hanzi-mic',HanziMic);`;
const toBase64 = buffer => { let s = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromBase64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const ERRORS = {
  NotAllowedError: 'Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép rồi thử lại.',
  NotFoundError: 'Không tìm thấy micro trên thiết bị này.',
  tutor_quota_exceeded: 'Bạn đã dùng hết 30 lượt hôm nay. Mỗi phiên luyện nói tính 1 lượt.',
  tutor_rate_limited: 'Bạn bấm hơi nhanh. Chờ vài giây rồi thử lại.',
  not_authenticated: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  tutor_not_configured: 'Trợ giảng AI chưa được bật trên máy chủ.'
};
export function createVoice(request) {
  let el = null, mode = 'talk', context = null, state = 'idle', log = [], interim = '', note = '';
  let ws = null, micStream = null, micCtx = null, speakerCtx = null, nextAt = 0, sources = new Set(), stopTimer = null;
  // Bumped by every stop: a start() still awaiting the microphone prompt or the token must not resume afterwards.
  let run = 0;
  const set = (next, message = '') => { state = next; note = message; paint(); };
  function add(who, text) {
    const last = log.at(-1);
    if (last && last.who === who && !last.done) last.text += text; else log.push({ who, text, done: false });
    if (log.length > 60) log.shift();
    paintLog();
  }
  const closeTurn = () => { for (const item of log) item.done = true; };
  function paintLog() {
    const box = el?.querySelector('.voice-log'); if (!box) return;
    box.innerHTML = log.length || interim ? log.map(item => `<p class="voice-line ${item.who}"><span>${item.who === 'you' ? 'Bạn' : 'Mây Long'}</span>${h(item.text)}</p>`).join('') + (interim ? `<p class="voice-line you interim"><span>Bạn</span>${h(interim)}</p>` : '') : `<p class="voice-empty">${h(MODES[mode].hint)}</p>`;
    box.scrollTop = box.scrollHeight;
  }
  function paint() {
    if (!el) return;
    const live = state === 'live', busy = state === 'connecting';
    el.innerHTML = `<div class="voice-modes" role="group" aria-label="Chế độ luyện nói">${Object.entries(MODES).map(([id, m]) => `<button type="button" class="level-chip" data-voice-mode="${id}" aria-pressed="${id === mode}" ${live || busy ? 'disabled' : ''}>${m.label}</button>`).join('')}</div>${context ? `<div class="voice-context"><span>Kịch bản: <strong>${h(context.title)}</strong> (${context.lines} câu). Mây Long sẽ đóng vai cùng bạn.</span><button type="button" class="text-link" data-voice-drop ${live ? 'disabled' : ''}>Bỏ kịch bản</button></div>` : ''}<div class="voice-stage"><button type="button" class="voice-mic${live ? ' is-live' : ''}" data-voice-toggle ${busy ? 'disabled' : ''} aria-pressed="${live}"><span class="ico-mic" aria-hidden="true"></span><span>${live ? 'Dừng' : busy ? 'Đang kết nối...' : 'Bắt đầu nói'}</span></button><p class="voice-note" role="status" aria-live="polite">${h(note || (live ? 'Đang nghe. Bạn cứ nói tự nhiên; nói chen vào để ngắt Mây Long.' : 'Mỗi phiên tối đa 10 phút và tính 1 lượt trong 30 lượt mỗi ngày. Nên dùng tai nghe.'))}</p></div><div class="voice-log" aria-live="polite"></div>`;
    paintLog();
  }
  function play(base64) {
    if (!speakerCtx) return;
    const bytes = fromBase64(base64), pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    const buffer = speakerCtx.createBuffer(1, pcm.length, 24000), data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
    const source = speakerCtx.createBufferSource(); source.buffer = buffer; source.connect(speakerCtx.destination);
    const at = Math.max(speakerCtx.currentTime + 0.05, nextAt); source.start(at); nextAt = at + buffer.duration;
    sources.add(source); source.onended = () => sources.delete(source);
  }
  function silence() { for (const s of sources) { try { s.stop(); } catch {} } sources.clear(); nextAt = 0; }
  function teardown() {
    run++; clearTimeout(stopTimer); stopTimer = null;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; try { ws.close(); } catch {} ws = null; }
    micStream?.getTracks().forEach(t => t.stop()); micStream = null;
    micCtx?.close().catch(() => {}); micCtx = null;
    silence(); speakerCtx?.close().catch(() => {}); speakerCtx = null;
    interim = ''; closeTurn();
  }
  function onMessage(event) {
    let message; try { message = JSON.parse(typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)); } catch { return; }
    if (message.setupComplete) {
      set('live');
      // Conversation modes: a text kick-off so Mây Long opens the session.
      if (mode === 'talk' || mode === 'natural') ws?.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: context ? `Mình muốn đóng vai theo kịch bản này:\n${context.text}\nBắt đầu nhé.` : 'Chào Mây Long, mình muốn luyện nói.' }] }], turnComplete: true } }));
      return;
    }
    if (message.goAway) { note = 'Phiên sắp hết thời gian.'; paint(); }
    const c = message.serverContent; if (!c) return;
    if (c.interrupted) silence();
    if (c.interimInputTranscription?.text) { interim = c.interimInputTranscription.text; paintLog(); }
    if (c.inputTranscription?.text) { interim = ''; add('you', c.inputTranscription.text); }
    if (c.outputTranscription?.text) add('tutor', c.outputTranscription.text);
    // Audio modes show only the transcription of what was spoken; text parts can carry the model's internal reasoning.
    for (const part of c.modelTurn?.parts || []) if (part.inlineData?.data) play(part.inlineData.data);
    if (c.turnComplete) closeTurn();
  }
  async function start() {
    if (state !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode || !window.WebSocket) { set('idle', 'Trình duyệt này chưa hỗ trợ luyện nói trực tiếp. Hãy dùng Chrome, Edge hoặc Safari mới.'); return; }
    set('connecting'); log = []; interim = '';
    const id = ++run, stale = () => id !== run;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (stale()) { stream.getTracks().forEach(t => t.stop()); return; }
      micStream = stream;
      const [kind, target] = mode.startsWith('translate-') ? ['translate', mode.slice(10)] : [mode, undefined];
      const session = await (await request({ mode: 'live', kind, target })).json();
      if (stale()) return;
      speakerCtx = new AudioContext({ sampleRate: 24000 });
      micCtx = new AudioContext();
      const module = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
      try { await micCtx.audioWorklet.addModule(module); } finally { URL.revokeObjectURL(module); }
      if (stale()) return;
      const node = new AudioWorkletNode(micCtx, 'hanzi-mic');
      micCtx.createMediaStreamSource(micStream).connect(node);
      ws = new WebSocket(`${session.url}?access_token=${encodeURIComponent(session.token)}`);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => ws.send(JSON.stringify({ setup: session.setup }));
      ws.onmessage = onMessage;
      ws.onerror = () => {};
      ws.onclose = event => { const was = state; teardown(); set('idle', was === 'connecting' || event.code !== 1000 ? 'Kết nối với Mây Long bị gián đoạn. Bấm Bắt đầu nói để thử lại.' : 'Đã kết thúc phiên.'); };
      node.port.onmessage = e => { if (ws?.readyState === 1 && state === 'live') ws.send(JSON.stringify({ realtimeInput: { audio: { data: toBase64(e.data), mimeType: 'audio/pcm;rate=16000' } } })); };
      stopTimer = setTimeout(stop, 600000);
    } catch (error) { if (stale()) return; teardown(); set('idle', ERRORS[error.name] || ERRORS[error.message] || 'Chưa bắt đầu được. Kiểm tra micro, kết nối và thử lại.'); }
  }
  function stop() {
    if (ws?.readyState === 1) try { ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch {}
    teardown(); set('idle', 'Đã kết thúc phiên.');
  }
  function onClick(event) {
    const pick = event.target.closest('[data-voice-mode]');
    if (pick && state === 'idle') { mode = pick.dataset.voiceMode; log = []; note = ''; paint(); return; }
    if (event.target.closest('[data-voice-drop]') && state === 'idle') { context = null; paint(); return; }
    if (event.target.closest('[data-voice-toggle]')) state === 'live' ? stop() : start();
  }
  return {
    mount(target) { if (el) el.removeEventListener('click', onClick); el = target; el.addEventListener('click', onClick); paint(); },
    unmount() { if (state !== 'idle') stop(); el?.removeEventListener('click', onClick); el = null; },
    setContext(next) { if (state !== 'idle') stop(); context = next; mode = 'talk'; paint(); },
    stop() { if (state !== 'idle') stop(); },
    get state() { return state; }
  };
}
