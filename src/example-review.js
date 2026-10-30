import {h} from './ui.js';
const reply=async request=>{const {data,error}=await request;if(error)throw error;return data;};
export function mountExampleReview(root,context,onReviewed){
  let generation=0,page=0;
  async function load(box){
    const owner=++generation;box.textContent='Đang tải câu nháp...';
    try{
      const rows=await reply(context().client.from('example_sentences').select('seq,zh_id,zh,zh_author,vi_id,vi,vi_author,license,vocab_entries(word,pinyin,level)').eq('review_status','draft').order('seq').order('zh_id').range(page*20,page*20+19));
      if(owner!==generation||!box.isConnected)return;
      box.innerHTML=rows.length?`<p>Nhóm ${page+1}, tối đa 20 câu. Đối chiếu nghĩa, cấp và nguồn trước khi duyệt.</p>${rows.map(r=>`<article class="vocab-report-item"><h4>#${r.seq} ${h(r.vocab_entries?.word||'')} (${h(r.vocab_entries?.pinyin||'')})</h4><p lang="zh-Hans">${h(r.zh)}</p><p>${h(r.vi)}</p><p class="panel-sub"><a href="https://tatoeba.org/vi/sentences/show/${Number(r.zh_id)}" target="_blank" rel="noopener noreferrer">${h(r.zh_author||'Không rõ tác giả')} #${Number(r.zh_id)}</a>; bản dịch <a href="https://tatoeba.org/vi/sentences/show/${Number(r.vi_id)}" target="_blank" rel="noopener noreferrer">${h(r.vi_author||'Không rõ tác giả')} #${Number(r.vi_id)}</a>; ${h(r.license)}</p><div class="cloud-actions"><button type="button" class="btn" data-example-decision="published" data-seq="${r.seq}" data-zh="${Number(r.zh_id)}">Duyệt câu này</button><button type="button" class="btn" data-example-decision="rejected" data-seq="${r.seq}" data-zh="${Number(r.zh_id)}">Từ chối câu này</button></div><p role="status"></p></article>`).join('')}`:'<p>Không có câu nháp trong nhóm này. Tải lại hoặc chọn nhóm trước.</p>';
      if(rows.length||page)box.insertAdjacentHTML('beforeend',`<div class="cloud-actions"><button type="button" class="btn" data-example-page="-1" ${page?'':'disabled'}>Nhóm trước</button><button type="button" class="btn" data-example-page="1" ${rows.length===20?'':'disabled'}>Nhóm sau</button></div>`);
    }catch{if(owner===generation&&box.isConnected)box.textContent='Chưa tải được câu nháp. Bấm tải lại để thử lại.';}
  }
  root.addEventListener('click',async event=>{
    const box=root.querySelector('[data-example-queue]');if(!box)return;
    if(event.target.closest('[data-example-load]')){page=0;load(box);return;}
    const next=event.target.closest('[data-example-page]');if(next){page=Math.max(0,page+Number(next.dataset.examplePage));load(box);return;}
    const button=event.target.closest('[data-example-decision]');if(!button)return;
    const item=button.closest('article'),owner=generation;item.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      const n=await reply(context().client.rpc('review_example_sentences',{entry_syllabus:'HSK 3.0 (CLEC 2025)',entry_seq:Number(button.dataset.seq),entry_zh_ids:[Number(button.dataset.zh)],decision:button.dataset.exampleDecision}));
      if(owner!==generation||!item.isConnected)return;
      item.querySelector('[role="status"]').textContent=n===1?(button.dataset.exampleDecision==='published'?'Đã xuất bản câu.':'Đã từ chối câu.'):'Câu không còn trong danh sách.';
      onReviewed(Number(button.dataset.seq));
    }catch{if(owner===generation&&item.isConnected){item.querySelector('[role="status"]').textContent='Không lưu được trạng thái câu.';item.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  });
  return {reset(){generation++;page=0;},adminTools(){return context().profile?.role==='admin'?'<details class="syllabus-admin"><summary>Câu ví dụ chờ duyệt</summary><button type="button" class="btn" data-example-load>Tải lại câu nháp</button><div data-example-queue></div></details>':'';}};
}
