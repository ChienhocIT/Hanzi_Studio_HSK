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

// The live HSK 3 layout is the source template. No second card markup is maintained.
function cloneOriginalLayout() {
  if (!originalTemplate) {
    originalTemplate = document.createElement('template');
    originalTemplate.content.append(document.querySelector('#page-study .study-layout').cloneNode(true));
  }
  return originalTemplate.content.firstElementChild.cloneNode(true);
}

export function renderStudyCard({namespace,word,homograph=null,reading='',answerHtml,partHtml='',examplesHtml='',exampleText='',exampleReading='',exampleTranslation='',examplesId='',position,total,record,revealed,source=''}) {
  const layout = cloneOriginalLayout();
  const get = id => layout.querySelector('#'+id);
  const action = (element, name) => element.setAttribute('data-'+namespace, namespace === 'hs' ? ({reveal:'flip',previous:'prev'}[name] || name) : name);
  const wordHtml = h(word)+(Number.isInteger(homograph)?`<sup>${homograph}</sup>`:'');
  const state = record ? (record.reps>=2 || record.lastRating==='easy'?'mastered':'learning') : 'new';
  const counter = `${position+1} / ${total.toLocaleString('vi-VN')}`;
  const answer = document.createElement('div'); answer.innerHTML = answerHtml;
  if (!reading) { const firstReading=answer.querySelector('[lang="zh-Latn"]');reading=firstReading?.textContent||'';firstReading?.remove(); }
  get('study-active').classList.remove('hidden');get('study-empty').classList.add('hidden');get('study-empty').hidden=true;
  get('study-counter').textContent='Thẻ '+counter;
  get('study-progress').style.width=(position+1)/total*100+'%';
  get('study-card-status').className='status-pip '+(state==='new'?'':state);
  get('study-card-status').textContent={new:'Chưa học',learning:'Đang học',mastered:'Đã nhớ'}[state];
  get('front-label').textContent='MẶT TRƯỚC · CHỮ HÁN';get('card-index').textContent='#'+String(position+1).padStart(3,'0');
  const front=get('card-front'), back=get('card-back-hanzi');
  front.className='card-hanzi'+(word.length>=8?' long':word.length>=5?' mid':'')+(revealed?'':' reference-word');front.lang='zh-Hans';front.innerHTML=wordHtml;
  back.className='card-back-hanzi'+(revealed?' reference-word':'');back.lang='zh-Hans';back.innerHTML=wordHtml;
  get('card-back-py').textContent=reading;get('card-back-py').lang='zh-Latn';
  get('card-back-vi').innerHTML=answer.innerHTML;get('card-part').innerHTML=partHtml;
  const examples=get('card-example-zh');examples.innerHTML=examplesHtml||'<p class="panel-sub">Chưa có ví dụ đã duyệt cho mục này.</p>';
  if(exampleText)examples.textContent=exampleText;
  for (const id of ['card-example-py','card-example-vi']) {get(id).textContent='';get(id).hidden=true;}
  if(exampleReading){get('card-example-py').textContent=exampleReading;get('card-example-py').hidden=false;}
  if(exampleTranslation){get('card-example-vi').textContent=exampleTranslation;get('card-example-vi').hidden=false;}
  const card=get('flashcard');card.classList.toggle('flipped',revealed);card.dataset.studyFlip='';action(card,'reveal');
  card.querySelectorAll('.card-face').forEach((face,i)=>{const hidden=i===0?revealed:!revealed;face.setAttribute('aria-hidden',String(hidden));face.inert=hidden;});
  card.dataset.studyNamespace=namespace;
  refreshStudyCard(layout);
  action(get('study-prev'),'previous');get('study-prev').dataset.studyPrevious='';
  action(get('study-next'),'next');get('study-next').dataset.studyNext='';get('study-next').setAttribute('aria-label','Thẻ sau');
  get('study-nav-label').textContent=counter+' · '+(revealed?reading:'Nhấn thẻ để lật');
  get('rating-buttons').classList.toggle('hidden',!revealed);get('rating-buttons').classList.add('study-card-rating');get('rating-buttons').hidden=!revealed;
  get('rating-buttons').querySelectorAll('[data-rating]').forEach(button=>{const rating=button.dataset.rating;action(button,namespace==='hs'?'rate':rating);button.dataset.studyRating=rating;button.setAttribute('aria-label',labels[rating]);button.setAttribute('aria-keyshortcuts',String(studyRatings.indexOf(rating)+1));});
  const session=sessions.get(namespace)||{total:0,correct:0,hard:0};
  for (const field of ['total','correct','hard']) get('session-'+field).textContent=session[field];
  layout.querySelectorAll('[id]').forEach(element=>{element.id=namespace+'-'+element.id;});
  layout.querySelectorAll('[for]').forEach(element=>element.htmlFor=namespace+'-'+element.htmlFor);
  if (examplesId) examples.id=examplesId;
  const root=document.createElement('article');root.className='original-study classic-study syllabus-study-card';root.dataset.studySource=namespace;root.setAttribute('aria-label',source);
  root.innerHTML=`<div class="study-card-tools"><button type="button" class="btn btn-listen" data-${namespace}="speak"><span class="ico-listen" aria-hidden="true"></span>Nghe</button><button type="button" class="btn" data-strokes="${h(word)}">Thứ tự nét</button></div>`;
  root.append(layout);
  if(record?.due){const note=document.createElement('p');note.className='study-card-schedule panel-sub';note.textContent='Lần ôn: '+new Date(record.due).toLocaleString('vi-VN');root.append(note);}
  return root.outerHTML;
}

export function refreshStudyCard(root) {
  const card=root.matches?.('.flashcard')?root:root.querySelector('.flashcard');if(!card)return;
  const revealed=card.classList.contains('flipped'),face=card.querySelector('.card-face[aria-hidden="false"]');if(!face)return;
  card.setAttribute('aria-label',face.textContent.trim()+' '+(revealed?'Ẩn đáp án':'Mở đáp án'));
  if(revealed&&face.querySelector('a,button,audio')){
    card.setAttribute('role','group');card.removeAttribute('aria-pressed');card.tabIndex=-1;
    const hint=face.querySelector('.card-hint'),namespace=card.dataset.studyNamespace;
    hint.setAttribute('role','button');hint.tabIndex=0;hint.dataset.studyFlip='';hint.style.minHeight='44px';hint.setAttribute('aria-label',hint.textContent+' Ẩn đáp án');hint.setAttribute('data-'+namespace,namespace==='hs'?'flip':'reveal');
  }else{card.setAttribute('role','button');card.setAttribute('aria-pressed',String(revealed));card.tabIndex=0;}
}

export function focusStudyCard(root,scroll=false) {
  const card=root.querySelector('.original-study .flashcard');if(!card)return;
  if(scroll)card.scrollIntoView({block:'start',behavior:'instant'});
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
