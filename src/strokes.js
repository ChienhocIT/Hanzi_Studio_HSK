// Stroke order and handwriting practice for any word: buttons with data-strokes="<word>" open a dialog per character.
// Hanzi Writer (MIT) draws and grades; stroke data is hanzi-writer-data (Make Me a Hanzi, Arphic Public License),
// fetched one character at a time from a pinned jsDelivr version. Works for guests; needs a connection for new characters.
import HanziWriter from 'hanzi-writer';
import { h } from './ui.js';

export const STROKE_DATA = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
const HAN = /\p{Script=Han}/u;

export function strokeChars(word) { return [...new Set([...String(word || '')].filter(ch => HAN.test(ch)))]; }

export function mountStrokes() {
  const cache = new Map();
  let dialog = null, writer = null, drawing = null, chars = [], index = 0, mode = 'watch', hints = true, run = 0;
  // A missing character stays cached as missing; a network failure is dropped so "Thử lại" fetches again.
  function load(ch) {
    if (!cache.has(ch)) cache.set(ch, fetch(STROKE_DATA + encodeURIComponent(ch) + '.json', { signal: AbortSignal.timeout(15000) }).then(async r => {
      if (r.status === 404) throw Error('missing');
      if (!r.ok) throw Error('network');
      const data = await r.json();
      if (!Array.isArray(data?.strokes) || !data.strokes.length || !data.strokes.every(s => typeof s === 'string' && s.length) || !Array.isArray(data.medians) || data.medians.length !== data.strokes.length || !data.medians.every(points => Array.isArray(points) && points.length >= 2 && points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)))) throw Error('network');
      return data;
    }).catch(error => { if (error.message !== 'missing') cache.delete(ch); throw error.message === 'missing' ? error : Error('network'); }));
    return cache.get(ch);
  }
  const $ = sel => dialog.querySelector(sel);
  const status = text => { $('[data-stroke-status]').textContent = text; };
  function stopWriter() { run++; try { writer?.cancelQuiz(); writer?.pauseAnimation(); } catch {} drawing?.remove(); }
  function controls() {
    $('[data-stroke-chars]').innerHTML = chars.length > 1 ? chars.map((ch, i) => `<button type="button" class="level-chip" data-stroke-char="${i}" aria-pressed="${i === index}" lang="zh-Hans">${h(ch)}</button>`).join('') : '';
    dialog.querySelectorAll('[data-stroke-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.strokeMode === mode)));
    $('[data-stroke-hints]').setAttribute('aria-pressed', String(hints));
    $('[data-stroke-hints]').hidden = mode !== 'quiz';
  }
  async function show() {
    stopWriter(); controls();
    const id = run, ch = chars[index], stage = $('[data-stroke-stage]'), retry = $('[data-stroke-retry]');
    retry.hidden = true; status(`Đang tải nét chữ ${ch}...`);
    let data;
    try { data = await load(ch); }
    catch (error) {
      if (id !== run) return;
      status(error.message === 'missing' ? `Chưa có dữ liệu nét cho chữ ${ch}.` : 'Không tải được dữ liệu nét. Hãy kiểm tra kết nối mạng rồi thử lại.');
      retry.hidden = error.message === 'missing'; return;
    }
    if (id !== run) return;
    const css = getComputedStyle(document.documentElement), color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const size = Math.max(180, Math.min(280, window.innerWidth - 96)), total = data.strokes.length;
    // Hanzi Writer attaches pointer-end handlers to document without a public destroy API. Reuse one instance,
    // detaching its drawing on close, so restarting or switching characters does not accumulate handlers.
    if (!writer) {
      drawing = document.createElement('div');
      writer = HanziWriter.create(drawing, ch, {
        width: size, height: size, padding: 14, showOutline: true, showCharacter: false,
        strokeColor: color('--txt', '#242b41'), outlineColor: color('--stroke', '#e9eaf2'), drawingColor: color('--primary', '#6b5ce7'), highlightColor: color('--teal', '#29aa95'), radicalColor: null,
        charDataLoader: character => load(character)
      });
    }
    stage.appendChild(drawing);
    writer.updateDimensions({width: size, height: size});
    await writer.setCharacter(ch);
    if (id !== run) return;
    for (const [name, value] of Object.entries({strokeColor: color('--txt', '#242b41'), outlineColor: color('--stroke', '#e9eaf2'), drawingColor: color('--primary', '#6b5ce7'), highlightColor: color('--teal', '#29aa95')})) writer.updateColor(name, value, {duration: 0});
    if (mode === 'watch') {
      status(`Chữ ${ch} có ${total} nét. Bấm "Xem thứ tự nét" để xem lại.`);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) writer.showCharacter({duration: 0});
      else writer.animateCharacter();
      return;
    }
    status(`Viết chữ ${ch}: ${total} nét, theo đúng thứ tự và hướng nét.`);
    writer.quiz({
      showHintAfterMisses: hints ? 3 : false,
      onMistake: s => { if (id === run) status(`Nét ${s.strokeNum + 1} chưa đúng. Đã sai ${s.totalMistakes} lần.`); },
      onCorrectStroke: s => { if (id === run) status(s.strokesRemaining ? `Đúng nét ${s.strokeNum + 1}/${total}. Còn ${s.strokesRemaining} nét.` : `Đúng nét ${total}/${total}.`); },
      onComplete: s => { if (id === run) status(`Hoàn thành chữ ${ch} với ${s.totalMistakes} lỗi.${index < chars.length - 1 ? ` Chọn chữ ${chars[index + 1]} để viết tiếp.` : ''}`); }
    });
  }
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'stroke-dialog'; dialog.setAttribute('aria-labelledby', 'stroke-title');
    dialog.innerHTML = `<div class="stroke-body"><div class="stroke-head"><h2 id="stroke-title"></h2><button type="button" class="btn" data-stroke-close>Đóng</button></div>
<div class="deck-chips" data-stroke-chars></div>
<div class="stroke-stage" data-stroke-stage></div>
<p class="stroke-status" role="status" data-stroke-status></p>
<div class="cloud-actions"><button type="button" class="btn" data-stroke-mode="watch" aria-pressed="true">Xem thứ tự nét</button><button type="button" class="btn" data-stroke-mode="quiz" aria-pressed="false">Luyện viết</button><button type="button" class="btn" data-stroke-hints aria-pressed="true" hidden>Gợi ý sau 3 lần sai</button><button type="button" class="btn" data-stroke-again>Viết lại</button><button type="button" class="btn" data-stroke-retry hidden>Thử lại</button></div>
<p class="stroke-note">Phản hồi so với nét mẫu, không phải chấm thư pháp. Dữ liệu nét: Make Me a Hanzi (Arphic Public License); thư viện Hanzi Writer (<a href="./data/HANZI-WRITER-LICENSE.txt" target="_blank" rel="noopener">MIT</a>). <a href="https://hanziwriter.org/license.html" target="_blank" rel="noopener">Giấy phép dữ liệu</a></p></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', stopWriter);
    dialog.addEventListener('click', event => {
      const t = event.target;
      if (t === dialog || t.closest('[data-stroke-close]')) dialog.close();
      else if (t.closest('[data-stroke-char]')) { index = Number(t.closest('[data-stroke-char]').dataset.strokeChar); show(); }
      else if (t.closest('[data-stroke-mode]')) { mode = t.closest('[data-stroke-mode]').dataset.strokeMode; show(); }
      else if (t.closest('[data-stroke-hints]')) { hints = !hints; show(); }
      else if (t.closest('[data-stroke-again], [data-stroke-retry]')) show();
    });
  }
  function open(word, startMode = 'watch') {
    chars = strokeChars(word); if (!chars.length) return;
    if (!dialog) build();
    index = 0; mode = startMode === 'quiz' ? 'quiz' : 'watch';
    $('#stroke-title').innerHTML = `Thứ tự nét · <span lang="zh-Hans">${h(word)}</span>`;
    if (!dialog.open) dialog.showModal();
    show();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-strokes]');
    if (button) open(button.dataset.strokes, button.dataset.strokesMode);
  });
  window.addEventListener('hanzi:route', () => { if (dialog?.open) dialog.close(); });
  return { open };
}
