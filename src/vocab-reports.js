import {h} from './ui.js';
const reply=async request=>{const {data,error}=await request;if(error)throw error;return data;};
export function mountVocabReports(root,context){
  let dialog=null,question=null,generation=0;
  const current=owner=>owner===generation;
  function open(q){
    if(!context().profile)return;
    generation++;
    question=q;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='report-dialog';dialog.setAttribute('aria-labelledby','report-title');
      dialog.innerHTML='<form class="cloud-form"><h2 id="report-title">Báo câu cần kiểm tra</h2><p data-report-word></p><label>Lý do<select name="reason"><option value="ambiguous">Có nhiều đáp án phù hợp</option><option value="incorrect">Đáp án có vẻ sai</option><option value="missing">Thiếu nghĩa hoặc ngữ cảnh</option></select></label><label>Ghi chú (không bắt buộc)<textarea name="message" maxlength="500" rows="3"></textarea></label><p role="status" data-report-status></p><div class="cloud-actions"><button type="button" class="btn" data-report-close>Đóng</button><button type="submit" class="btn btn-primary">Gửi báo cáo</button></div></form>';
      document.body.appendChild(dialog);
      dialog.querySelector('[data-report-close]').addEventListener('click',()=>dialog.close());
      dialog.querySelector('form').addEventListener('submit',async event=>{
        event.preventDefault();const owner=generation,{client}=context(),q=question,form=event.target,button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-report-status]');
        button.disabled=true;status.textContent='Đang gửi...';
        try{
          const values=new FormData(form);
          await reply(client.rpc('report_vocab_question',{entry_seq:q.seq,question_kind:q.kind,report_reason:values.get('reason'),report_message:values.get('message'),question_options:q.options,correct_index:q.answer}));
          if(current(owner)){status.textContent='Đã gửi vào hàng đợi quản trị viên. Điểm và lịch ôn được giữ nguyên.';q.reported=true;}
        }catch{if(current(owner)){status.textContent='Chưa gửi được. Kiểm tra kết nối, hạn mức gửi hoặc thử lại sau.';button.disabled=false;}}
      });
    }
    dialog.querySelector('form').reset();dialog.querySelector('[data-report-word]').textContent=`Từ ${q.word} - ${q.kind==='pinyin'?'pinyin':'nghĩa Anh'}`;
    dialog.querySelector('[type="submit"]').disabled=Boolean(q.reported);dialog.querySelector('[data-report-status]').textContent=q.reported?'Bạn đã báo câu này trong phiên học.':'';
    dialog.showModal();
  }
  async function queue(box){
    const owner=++generation;box.textContent='Đang tải báo cáo...';
    try{
      const rows=await reply(context().client.from('vocab_reports').select('id,seq,kind,reason,message,options,correct_option,created_at').eq('status','open').order('created_at').limit(50));
      if(!current(owner)||!box.isConnected)return;
      box.innerHTML=rows.length?rows.map(r=>`<form class="vocab-report-item" data-report-id="${h(r.id)}"><h4>Từ #${r.seq} - ${h(r.kind)}</h4><p>${h(r.reason)}: ${h(r.message)}</p><ol>${r.options.map((v,i)=>`<li>${h(v)}${i===r.correct_option?' (đáp án được hiển thị)':''}</li>`).join('')}</ol><label>Kết quả kiểm tra<textarea name="note" required minlength="3" maxlength="500" rows="2"></textarea></label><button class="btn" type="submit">Đánh dấu đã xử lý</button><p role="status"></p></form>`).join(''):'Không có báo cáo đang chờ.';
    }catch{if(current(owner)&&box.isConnected)box.textContent='Chưa tải được báo cáo. Bấm tải lại để thử lại.';}
  }
  root.addEventListener('click',event=>{if(event.target.closest('[data-report-load]'))queue(root.querySelector('[data-report-list]'));});
  root.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-report-id]');if(!form)return;
    event.preventDefault();const owner=generation,button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;
    try{const n=await reply(context().client.rpc('resolve_vocab_report',{report_id:form.dataset.reportId,note:new FormData(form).get('note')}));if(current(owner)&&form.isConnected){status.textContent=n===1?'Đã xử lý. Nội dung học liệu chỉ đổi qua quy trình biên tập riêng.':'Báo cáo đã được xử lý trước đó.';}}
    catch{if(current(owner)&&form.isConnected){status.textContent='Không lưu được kết quả kiểm tra.';button.disabled=false;}}
  });
  return {open,reset(){generation++;question=null;dialog?.close();},adminTools(){return context().profile?.role==='admin'?'<details class="syllabus-admin"><summary>Câu cần kiểm tra</summary><button type="button" class="btn" data-report-load>Tải báo cáo đang chờ</button><div data-report-list></div></details>':'';}};
}
