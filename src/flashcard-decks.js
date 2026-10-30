const KEY = 'hanzi-flashcard-deck', DECKS = ['hsk3', '1', '2', '3', '4', '5', '6', '7-9'];
const $ = id => document.getElementById(id);
export function mountFlashcardDecks(syllabus) {
  let deck = 'hsk3';
  try { const saved = localStorage.getItem(KEY); if (DECKS.includes(saved)) deck = saved; } catch {}
  const strokes=document.createElement('button');strokes.type='button';strokes.className='btn';strokes.id='study-strokes';strokes.dataset.strokes='';strokes.textContent='Nét chữ';
  strokes.addEventListener('click',()=>{strokes.dataset.strokes=$('study-active').classList.contains('hidden')?'':$('card-back-hanzi').textContent;});
  document.querySelector('#page-study .tool-right').appendChild(strokes);
  function place(route) {
    const container = $('syllabus-container'), target = route === 'study' && deck !== 'hsk3' ? $('study-syllabus-slot') : $('page-hsk');
    if (container && target && container.parentElement !== target) target.appendChild(container);
  }
  function apply() {
    $('page-study')?.classList.toggle('deck-hsk', deck !== 'hsk3');
    const slot = $('study-syllabus-slot'); if (slot) slot.hidden = deck === 'hsk3';
    $('study-deck-select').value=deck;
    $('study-deck-note').textContent=deck==='hsk3'?'Nghĩa Việt, dùng được ngoại tuyến.':'Theo đề cương CLEC 2025, nghĩa Anh.';
  }
  // Words of the HSK 1–9 library due for review, counted from the on-device schedule.
  function reviewCard() {
    const box = $('review-hsk-due'); if (!box) return;
    let due = 0;
    try { const p = JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4') || '{}').progress || {}; const now = Date.now(); for (const [k, v] of Object.entries(p)) if (/^clec2025-\d+$/.test(k) && Number(v?.due) <= now) due++; } catch {}
    box.innerHTML = due ? `<div class="review-hsk"><div><strong>${due} từ HSK 1–9 đến hạn ôn</strong><p>Từ trong thư viện 11.000 từ bạn đã luyện thẻ.</p></div><button type="button" class="btn btn-primary" data-go="hsk" data-hsk-level="all" data-hsk-view="due">Ôn ngay</button></div>` : '';
  }
  function choose(next) {
    if(!DECKS.includes(next))return;
    deck = next;
    try { localStorage.setItem(KEY, deck); } catch {}
    apply(); place('study');
    if (deck !== 'hsk3') syllabus.openLevel(deck,'cards',true);
  }
  $('study-deck-select').addEventListener('change',event=>choose(event.target.value));
  window.addEventListener('hanzi:legacy-study',()=>choose('hsk3'));
  window.addEventListener('hanzi:route', event => {
    place(event.detail);
    if (event.detail === 'study' && deck !== 'hsk3' && syllabus.level !== deck) syllabus.openLevel(deck,'cards',true);
    if (event.detail === 'review') reviewCard();
  });
  apply();
  $('study-deck-select').disabled=false;
  $('study-deck-select').removeAttribute('aria-busy');
  if (location.hash === '#study') {place('study');if(deck!=='hsk3')syllabus.openLevel(deck,'cards',true);}
  if (location.hash === '#review') reviewCard();
}
