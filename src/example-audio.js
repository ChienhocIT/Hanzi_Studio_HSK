import {h} from './ui.js';
export function exampleAudio(rows,zhId,admin){
  return (rows||[]).map(a=>{
    const id=Number(a.audio_id);if(!Number.isSafeInteger(id)||id<1)return '';
    let credit=`https://tatoeba.org/audio/download/${id}`;
    try{const url=new URL(a.attribution_url);if(url.protocol==='https:'&&url.hostname==='tatoeba.org')credit=url.href;}catch{}
    return `<div class="example-recording"><audio controls preload="none" aria-label="Bản ghi câu #${Number(zhId)} của ${h(a.author)}" src="https://tatoeba.org/audio/download/${id}"></audio><p class="panel-sub"><a href="${h(credit)}" target="_blank" rel="noopener noreferrer">${h(a.author)}</a> - ${h(a.license)}${admin?` - ${h(a.review_status)}`:''}</p><p class="audio-status" role="status"></p><button type="button" class="btn" data-audio-retry hidden>Thử tải bản ghi</button>${admin?`<div class="cloud-actions">${['published','rejected','draft'].filter(s=>s!==a.review_status).map(s=>`<button type="button" class="btn" data-syl="audio-review" data-zh="${Number(zhId)}" data-audio="${id}" data-decision="${s}">${({published:'Duyệt bản ghi',rejected:'Từ chối bản ghi',draft:'Bản ghi về nháp'})[s]}</button>`).join('')}</div>`:''}</div>`;
  }).join('');
}
export function mountExampleAudio(root){
  root.addEventListener('error',event=>{
    if(event.target.tagName!=='AUDIO')return;
    const box=event.target.closest('.example-recording');if(!box)return;
    box.querySelector('.audio-status').textContent='Không tải được bản ghi. Thử lại hoặc dùng nút Nghe giọng thiết bị.';
    box.querySelector('[data-audio-retry]').hidden=false;
  },true);
  root.addEventListener('click',event=>{const button=event.target.closest('[data-audio-retry]');if(button){const box=button.closest('.example-recording');box.querySelector('.audio-status').textContent='Đang tải lại...';button.hidden=true;box.querySelector('audio').load();}});
  window.addEventListener('hanzi:route',()=>root.querySelectorAll('audio').forEach(audio=>audio.pause()));
}
