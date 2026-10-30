import {h} from './ui.js';

export const studyRatings = ['again', 'hard', 'good', 'easy'];
const ratingLabels = ['Chưa nhớ', 'Khó nhớ', 'Đã nhớ', 'Rất dễ'];

// HTML fragments are produced by the source adapters with escaped content, never raw database text.
export function renderStudyCard({namespace, word, homograph = null, reading = '', answerHtml, partHtml = '', examplesHtml = '', examplesId = '', position, total, record, revealed, source = ''}) {
  const action = name => `data-${namespace}="${namespace === 'hs' ? ({reveal: 'flip', previous: 'prev'}[name] || name) : name}"`;
  const state = record ? (record.reps >= 2 || record.lastRating === 'easy' ? 'mastered' : 'learning') : 'new';
  const stateLabel = {new: 'Chưa học', learning: 'Đang học', mastered: 'Đã nhớ'}[state];
  const wordHtml = h(word) + (Number.isInteger(homograph) ? `<sup>${homograph}</sup>` : '');
  const counter = `${position + 1} / ${total.toLocaleString('vi-VN')}`;
  const front = `<button type="button" class="study-face-button" ${revealed ? '' : action('reveal')} data-study-flip aria-pressed="false" ${revealed ? 'disabled tabindex="-1"' : ''}><span class="card-head"><span>MẶT TRƯỚC · CHỮ HÁN</span><span>${h(source)}</span></span><span class="card-center"><span class="card-hanzi ${[...word].length>=8?'long':[...word].length>=5?'mid':''} ${revealed ? '' : 'reference-word'}" lang="zh-Hans">${wordHtml}</span></span><span class="card-hint">Mở đáp án <small>(Space)</small></span></button>`;
  const back = `<div class="card-head"><button type="button" class="study-back-toggle" ${revealed ? action('reveal') : ''} data-study-flip aria-pressed="true" ${revealed ? '' : 'disabled tabindex="-1"'}>MẶT SAU · ĐÁP ÁN <span class="study-flip-caption">Ẩn đáp án</span></button><span>${partHtml}</span></div><div class="card-center"><div class="card-back-hanzi ${revealed ? 'reference-word' : ''}" lang="zh-Hans">${wordHtml}</div>${reading ? `<p class="card-back-py syllabus-pinyin" lang="zh-Latn">${h(reading)}</p>` : ''}<div class="card-meaning">${answerHtml}</div><div class="example-section" ${examplesId ? `id="${h(examplesId)}"` : ''}>${examplesHtml || '<p class="panel-sub">Chưa có ví dụ đã duyệt cho mục này.</p>'}</div></div><p class="card-hint">Đánh giá mức độ ghi nhớ ở bên dưới</p>`;
  return `
    <article class="classic-study syllabus-study-card" data-study-source="${namespace}"><div class="study-card-tools"><button type="button" class="btn btn-listen" ${action('speak')}><span class="ico-listen" aria-hidden="true"></span>Nghe</button><button type="button" class="btn" data-strokes="${h(word)}">Thứ tự nét</button></div>
      <div class="study-info study-card-meta"><span>Thẻ ${counter}</span><span class="status-pip ${state === 'new' ? '' : state}">${stateLabel}</span></div>
      <div class="thin-progress" aria-hidden="true"><div style="width:${(position + 1) / total * 100}%"></div></div>
      <div class="flip-stage"><div class="flashcard ${revealed ? 'flipped' : ''}"><div class="flashcard-inner"><div class="card-face" aria-hidden="${revealed}" ${revealed ? 'inert' : ''}>${front}</div>
      <div class="card-face reverse" aria-hidden="${!revealed}" ${revealed ? '' : 'inert'}>${back}</div></div></div></div>
      <div class="nav-arrows"><button type="button" class="nav-arrow" ${action('previous')} data-study-previous aria-label="Thẻ trước">←</button><span>${counter}${revealed && reading ? ` · ${h(reading)}` : ' · Nhấn thẻ để lật'}</span><button type="button" class="nav-arrow" ${action('next')} data-study-next aria-label="Thẻ sau">→</button></div>
      <div class="rating study-card-rating" ${revealed ? '' : 'hidden'}>${studyRatings.map((rating, i) => `<button type="button" class="rate-btn ${rating}" ${action(namespace === 'hs' ? 'rate' : rating)} ${namespace === 'hs' ? `data-rating="${rating}"` : ''} data-study-rating="${rating}" aria-keyshortcuts="${i + 1}">${ratingLabels[i]}</button>`).join('')}</div>${record?.due ? `<p class="study-card-schedule panel-sub">Lần ôn: ${new Date(record.due).toLocaleString('vi-VN')}</p>` : ''}</article>`;
}

export function focusStudyCard(root, scroll = false) {
  const card = root.querySelector('.classic-study');
  if (!card) return;
  if (scroll) card.querySelector('.flashcard').scrollIntoView({block: 'start', behavior: 'instant'});
  card.querySelector('.card-face:not([inert]) [data-study-flip]')?.focus({preventScroll: true});
}

export function mountStudyKeyboard(root) {
  if (!root) return;
  document.addEventListener('keydown', event => {
    if (!root.closest('.page.active') || event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    const target = event.target;
    if (target.isContentEditable || target.closest('input,select,textarea')) return;
    const card = root.querySelector('.classic-study');
    if (!card) return;
    let button;
    if (event.key === 'ArrowRight') button = card.querySelector('[data-study-next]');
    if (event.key === 'ArrowLeft') button = card.querySelector('[data-study-previous]');
    if (event.code === 'Space' && !target.closest('button,a')) button = card.querySelector('.card-face:not([inert]) [data-study-flip]');
    if (/^[1-4]$/.test(event.key)) button = card.querySelector(`.rating:not([hidden]) [data-study-rating="${studyRatings[Number(event.key) - 1]}"]`);
    if (button) { event.preventDefault(); button.click(); }
  });
}
