import {h} from './ui.js';

export const studyRatings = ['again', 'hard', 'good', 'easy'];
const labels = {again:'Chưa nhớ',hard:'Khó nhớ',good:'Đã nhớ',easy:'Rất dễ'};
const sessions = new Map();
let originalTemplate;

export function recordStudyRating(namespace, rating) {
  const session = sessions.get(namespace) || {total:0,correct:0,hard:0};
  session.total++;
  if (rating === 'good' || rating === 'easy') session.correct++; else session.hard++;
  sessions.set(namespace, session);
}
export function resetStudySession(namespace) { sessions.delete(namespace); }
export function isStudyBookmarked(id) {
  try { return JSON.parse(localStorage.getItem('hanzi-studio-curriculum-v4') || '{}').bookmarks?.includes(id) || false; } catch { return false; }
}
export function toggleStudyBookmark(id) {
  const detail = {id, saved:false};
  window.dispatchEvent(new CustomEvent('hanzi:study-bookmark', {detail}));
  return detail.saved;
}
export function matchesStudyMode(record, mode, saved = false) {
  if (mode === 'saved') return saved;
  if (mode === 'new') return !record;
  if (mode === 'due') return record && record.due <= Date.now();
  const mastered = record && (record.reps >= 2 || record.lastRating === 'easy');
  if (mode === 'mastered') return mastered;
  if (mode === 'learning') return record && !mastered;
  return true;
}
export function createStudyControls() {
  const ranks = new Map();
  return {
    reversed:false, randomized:false,
    shuffle() { this.randomized = !this.randomized; ranks.clear(); },
    reset() { this.reversed = false; this.randomized = false; ranks.clear(); },
    order(rows, key) {
      if (!this.randomized) return rows;
      for (const row of rows) if (!ranks.has(key(row))) ranks.set(key(row), Math.random());
      return [...rows].sort((a,b) => ranks.get(key(a)) - ranks.get(key(b)));
    }
  };
}
export function preserveStudyFocus(root, render) {
  const focused = root.contains(document.activeElement) ? document.activeElement.id : '';
  render();
  if (focused) root.querySelector('#'+CSS.escape(focused))?.focus({preventScroll:true});
}

// Both the toolbar and the layout come from the original HSK 3 workspace.
function cloneOriginalWorkspace() {
  if (!originalTemplate) {
    originalTemplate = document.createElement('template');
    originalTemplate.content.append(document.querySelector('#page-study > .study-workspace').cloneNode(true));
  }
  return originalTemplate.content.firstElementChild.cloneNode(true);
}
export function renderStudyCard({namespace,word='',homograph=null,reading='',answerHtml='',partHtml='',examplesHtml='',exampleText='',exampleReading='',exampleTranslation='',examplesId='',position=0,total=0,record,revealed=false,source='',controls={},bookmarked=false,stageOptions=null,stage='all',mode='all'}) {
  const workspace = cloneOriginalWorkspace();
  const get = id => workspace.querySelector('#'+id);
  const action = (element, name) => element.setAttribute('data-'+namespace, namespace === 'hs' ? ({reveal:'flip',previous:'prev'}[name] || name) : name);
  const options = stageOptions || [{value:'all',label:'Tất cả '+total.toLocaleString('vi-VN')+' từ'}];
  get('study-chapter').innerHTML = options.map(o=>`<option value="${h(o.value)}" ${String(o.value)===String(stage)?'selected':''}>${h(o.label)}</option>`).join('');
  get('study-chapter').setAttribute('data-'+namespace+'-stage-select','');
  get('study-filter').value = mode;
  get('study-filter').querySelectorAll('option').forEach(option=>{option.toggleAttribute('selected',option.value===mode);});
  get('study-filter').setAttribute('data-'+namespace+'-mode','');
  for (const [id,name] of [['reverse-btn','reverse'],['shuffle-btn','shuffle'],['study-audio','speak'],['study-bookmark','bookmark'],['study-prev','previous'],['study-next','next'],['empty-study-reset','reset']]) action(get(id),name);
  get('reverse-btn').classList.toggle('selected',Boolean(controls.reversed));get('reverse-btn').setAttribute('aria-pressed',String(Boolean(controls.reversed)));
  get('shuffle-btn').classList.toggle('selected',Boolean(controls.randomized));get('shuffle-btn').setAttribute('aria-pressed',String(Boolean(controls.randomized)));
  get('study-bookmark').classList.toggle('selected',bookmarked);get('study-bookmark').setAttribute('aria-pressed',String(bookmarked));
  get('study-strokes').dataset.strokes=word;
  for(const id of ['reverse-btn','shuffle-btn','study-audio','study-bookmark','study-strokes'])get(id).disabled=!total;
  get('study-prev').dataset.studyPrevious='';get('study-next').dataset.studyNext='';get('study-next').setAttribute('aria-label','Thẻ sau');
  get('study-active').classList.toggle('hidden',!total);get('study-empty').classList.toggle('hidden',Boolean(total));
  const session=sessions.get(namespace)||{total:0,correct:0,hard:0};
  for (const field of ['total','correct','hard']) get('session-'+field).textContent=session[field];
  if(total) {
    const wordHtml=h(word)+(Number.isInteger(homograph)?`<sup>${homograph}</sup>`:'');
    const state=record?(record.reps>=2||record.lastRating==='easy'?'mastered':'learning'):'new';
    const counter=`${position+1} / ${total.toLocaleString('vi-VN')}`;
    const answer=document.createElement('div');answer.innerHTML=answerHtml;
    if(!reading){const firstReading=answer.querySelector('[lang="zh-Latn"]');reading=firstReading?.textContent||'';firstReading?.remove();}
    get('study-counter').textContent='Thẻ '+counter;get('study-progress').style.width=(position+1)/total*100+'%';
    get('study-card-status').className='status-pip '+(state==='new'?'':state);get('study-card-status').textContent={new:'Chưa học',learning:'Đang học',mastered:'Đã nhớ'}[state];
    const answerLang=answer.querySelector('[lang]')?.lang||'vi';
    get('front-label').textContent=controls.reversed?'MẶT TRƯỚC · NGHĨA TIẾNG '+(answerLang==='en'?'ANH':'VIỆT'):'MẶT TRƯỚC · CHỮ HÁN';get('card-index').textContent='#'+String(position+1).padStart(3,'0');
    const front=get('card-front'),back=get('card-back-hanzi');
    front.className=controls.reversed?'card-meaning-front':'card-hanzi'+(word.length>=8?' long':word.length>=5?' mid':'');
    if(controls.reversed)front.textContent=answer.textContent.trim();else front.innerHTML=wordHtml;
    front.lang=controls.reversed?answerLang:'zh-Hans';back.lang='zh-Hans';back.innerHTML=wordHtml;
    get('card-back-py').textContent=reading;get('card-back-py').lang='zh-Latn';get('card-back-vi').innerHTML=answer.innerHTML;get('card-part').innerHTML=partHtml;
    const examples=get('card-example-zh');examples.innerHTML=examplesHtml||'<p class="panel-sub">Chưa có ví dụ đã duyệt cho mục này.</p>';
    if(exampleText)examples.textContent=exampleText;
    for(const [id,value] of [['card-example-py',exampleReading],['card-example-vi',exampleTranslation]]){get(id).textContent=value;get(id).hidden=!value;}
    const card=get('flashcard');card.dataset.studyFlip='';card.dataset.studyNamespace=namespace;card.dataset.studyCounter=counter;card.dataset.studyReading=reading;action(card,'reveal');
    get('rating-buttons').querySelectorAll('[data-rating]').forEach(button=>{const rating=button.dataset.rating;action(button,namespace==='hs'?'rate':rating);button.dataset.studyRating=rating;button.setAttribute('aria-label',labels[rating]);button.setAttribute('aria-keyshortcuts',String(studyRatings.indexOf(rating)+1));});
  }
  workspace.querySelectorAll('[id]').forEach(element=>{element.id=namespace+'-'+element.id;});
  workspace.querySelectorAll('[for]').forEach(element=>{element.htmlFor=namespace+'-'+element.htmlFor;});
  if(examplesId)workspace.querySelector('#'+namespace+'-card-example-zh').id=examplesId;
  const root=document.createElement('article');root.className='original-study syllabus-study-card';root.dataset.studySource=namespace;root.setAttribute('aria-label',source);root.append(workspace);
  if(total)setStudyRevealed(root,revealed);
  return root.outerHTML;
}

export function setStudyRevealed(root, revealed) {
  const card=root.querySelector('.flashcard'),namespace=card.dataset.studyNamespace;
  card.classList.toggle('flipped',revealed);
  card.querySelectorAll('.card-face').forEach((face,i)=>{const hidden=i===0?revealed:!revealed;face.setAttribute('aria-hidden',String(hidden));face.inert=hidden;});
  const front=card.querySelector('.card-hanzi,.card-meaning-front'),back=card.querySelector('.card-back-hanzi');
  front.classList.toggle('reference-word',!revealed);back.classList.toggle('reference-word',revealed);
  const rating=root.querySelector('.rating');rating.classList.toggle('hidden',!revealed);rating.hidden=!revealed;
  root.querySelector('#'+namespace+'-study-nav-label').textContent=card.dataset.studyCounter+' · '+(revealed?card.dataset.studyReading:'Nhấn thẻ để lật');
  refreshStudyCard(root);
}
export function refreshStudyCard(root) {
  const card=root.matches?.('.flashcard')?root:root.querySelector('.flashcard');if(!card)return;
  const revealed=card.classList.contains('flipped'),face=card.querySelector('.card-face[aria-hidden="false"]');if(!face)return;
  const hint=face.querySelector('.card-hint'),namespace=card.dataset.studyNamespace;
  hint.removeAttribute('role');hint.removeAttribute('tabindex');hint.removeAttribute('data-study-flip');hint.removeAttribute('data-'+namespace);hint.removeAttribute('aria-label');
  card.setAttribute('aria-label',face.textContent.trim()+' '+(revealed?'Ẩn đáp án':'Mở đáp án'));
  if(revealed&&face.querySelector('a,button,audio')){
    card.setAttribute('role','group');card.removeAttribute('aria-pressed');card.tabIndex=-1;
    hint.setAttribute('role','button');hint.tabIndex=0;hint.dataset.studyFlip='';hint.setAttribute('aria-label',hint.textContent+' Ẩn đáp án');hint.setAttribute('data-'+namespace,namespace==='hs'?'flip':'reveal');
  }else{card.setAttribute('role','button');card.setAttribute('aria-pressed',String(revealed));card.tabIndex=0;}
}
export function ensureStudyVisible(card) {
  const rating=card.closest('.study-workspace').querySelector('.rating:not(.hidden)');
  const box=card.getBoundingClientRect(),end=rating?.getBoundingClientRect().bottom||box.bottom;
  const top=document.querySelector('.topbar')?.getBoundingClientRect().bottom||0;
  const nav=document.querySelector('.bottom-nav'),bottom=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;
  if(box.top>=top&&end<=bottom)return;
  const safeTop=Math.min(parseFloat(getComputedStyle(card).scrollMarginTop)||top,Math.max(top,bottom-(end-box.top)));
  window.scrollBy({top:box.top-safeTop,behavior:'instant'});
}
export function focusStudyCard(root,scroll=false) {
  const card=root.querySelector('.original-study .flashcard');if(!card)return;
  if(scroll)ensureStudyVisible(card);
  (card.tabIndex===0?card:card.querySelector('[data-study-flip][tabindex="0"]'))?.focus({preventScroll:true});
}
export function mountStudyKeyboard(root) {
  if(!root)return;
  document.addEventListener('keydown',event=>{
    if(!root.closest('.page.active')||event.repeat||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]'))return;
    if(event.target.isContentEditable||event.target.closest('input,select,textarea,audio,video'))return;
    const card=root.querySelector('.original-study');if(!card)return;
    let button;
    if(event.key==='ArrowRight')button=card.querySelector('[data-study-next]');
    if(event.key==='ArrowLeft')button=card.querySelector('[data-study-previous]');
    if((event.code==='Space'&&!event.target.closest('button,a'))||(event.key==='Enter'&&event.target.matches('[data-study-flip]')))button=card.querySelector('[data-study-flip][tabindex="0"]');
    if(/^[1-4]$/.test(event.key))button=card.querySelector('.rating:not([hidden]) [data-study-rating="'+studyRatings[Number(event.key)-1]+'"]');
    if(button){event.preventDefault();button.click();}
  });
}
