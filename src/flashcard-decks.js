// Deck picker on the Flashcard page. "hsk3" keeps the original 500-word Vietnamese deck (app.js); an HSK level shows
// the HSK 1–9 library's stage cards right on the Flashcard page. There is one library instance: its container moves
// between the library page and the Flashcard slot, so data, progress and the open stage stay shared.
const KEY = 'hanzi-flashcard-deck', DECKS = ['hsk3', '1', '2', '3', '4', '5', '6', '7-9'];
const $ = id => document.getElementById(id);
export function mountFlashcardDecks(syllabus) {
  let deck = 'hsk3';
  try { const saved = localStorage.getItem(KEY); if (DECKS.includes(saved)) deck = saved; } catch {}
  function place(route) {
    const container = $('syllabus-container'), target = route === 'study' && deck !== 'hsk3' ? $('study-syllabus-slot') : $('page-hsk');
    if (container && target && container.parentElement !== target) target.appendChild(container);
  }
  function apply() {
    $('page-study')?.classList.toggle('deck-hsk', deck !== 'hsk3');
    const slot = $('study-syllabus-slot'); if (slot) slot.hidden = deck === 'hsk3';
    document.querySelectorAll('[data-study-deck]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.studyDeck === deck)));
  }
  // Words of the HSK 1–9 library due for review, counted from the on-device schedule.
  function reviewCard() {
    const box = $('review-hsk-due'); if (!box) return;
    let due = 0;
    try { const p = JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4') || '{}').progress || {}; const now = Date.now(); for (const [k, v] of Object.entries(p)) if (/^clec2025-\d+$/.test(k) && Number(v?.due) <= now) due++; } catch {}
    box.innerHTML = due ? `<div class="review-hsk"><div><strong>${due} từ HSK 1–9 đến hạn ôn</strong><p>Từ trong thư viện 11.000 từ bạn đã luyện thẻ.</p></div><button type="button" class="btn btn-primary" data-go="hsk" data-hsk-level="all" data-hsk-view="due">Ôn ngay</button></div>` : '';
  }
  document.addEventListener('click', event => {
    const pick = event.target.closest('[data-study-deck]'); if (!pick) return;
    deck = pick.dataset.studyDeck;
    try { localStorage.setItem(KEY, deck); } catch {}
    apply(); place('study');
    if (deck !== 'hsk3' && syllabus.level !== deck) syllabus.openLevel(deck);
  });
  window.addEventListener('hanzi:route', event => {
    place(event.detail);
    if (event.detail === 'study' && deck !== 'hsk3' && syllabus.level !== deck) syllabus.openLevel(deck);
    if (event.detail === 'review') reviewCard();
  });
  apply();
  if (location.hash === '#study') place('study');
  if (location.hash === '#review') reviewCard();
}
