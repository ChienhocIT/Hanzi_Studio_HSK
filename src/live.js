import { h, field } from './ui.js';
const reply=async request=>{const {data,error}=await request;if(error)throw error;return data;};
const states={waiting:'Chờ bắt đầu',running:'Đang thi',ended:'Đã kết thúc',expired:'Mã phòng hết hạn'};
const action=(label,name,extra='')=>`<button type="button" class="btn" data-live="${name}" ${extra}>${h(label)}</button>`;

export function mountLive(root,client,classes,user) {
  let disposed=false,room=null,selectedRoomId=null,classId=classes[0]?.id||'',answers=[],signature='',polling=false,saving=Promise.resolve(),saveVersion=0;
  let hostQuizzes=[];
  const storageKey=`hanzi-live-room:${user.id}`;
  const rpc=(name,args)=>reply(client.rpc(name,args));
  root.innerHTML=`<h3>Phòng thi trực tiếp</h3><p>Thi cùng lớp từ bài trắc nghiệm giáo viên đã soạn. Thời gian và điểm do server quyết định. Khi phòng đang chờ hoặc đang thi, trạng thái được cập nhật mỗi 3 giây.</p><p id="live-status" role="status" aria-live="polite"></p><form data-live-form="join" class="cloud-form">${field('Mã phòng thi','code','text','minlength="8" maxlength="8" pattern="[A-Za-z0-9]{8}" autocomplete="off"')}<p>Tên hiển thị và kết quả sẽ xuất hiện trong phòng cùng các học viên tham gia.</p><button class="btn">Vào phòng thi</button></form><label class="cloud-select">Lớp tổ chức thi<select id="live-class"><option value="">Chọn lớp</option>${classes.map(c=>`<option value="${c.id}" ${c.id===classId?'selected':''}>${h(c.title)}</option>`).join('')}</select></label><div id="live-create"></div><div id="live-history"></div><div id="live-room"></div>`;
  const status=(text,error=false)=>{
    if(disposed)return;
    const el=root.querySelector('#live-status');el.textContent=text;el.classList.toggle('cloud-error',error);
  };
  function fail(error) {
    const messages={enrollment_required:'Bạn cần tham gia lớp và phòng trước khi thi.',room_unavailable:'Mã phòng không đúng, đã hết hạn hoặc phòng đã bắt đầu.',forbidden:'Bạn không có quyền điều khiển phòng.',room_not_running:'Phòng đã hết giờ hoặc chưa bắt đầu.',already_submitted:'Bài đã được nộp.',room_full:'Phòng đã đủ 100 học viên.',room_limit:'Lớp đã có 10 phòng đang mở. Hãy kết thúc phòng cũ.',invalid_answer:'Có lựa chọn không hợp lệ. Hãy tải lại phòng.'};
    status(messages[error.message]||'Chưa kết nối được server. Hãy giữ trang mở và kiểm tra trạng thái đã lưu trước khi rời phòng.',true);
  }
  async function loadList() {
    if(disposed)return;
    if(!classId){root.querySelector('#live-history').innerHTML='<p>Chưa có lớp để hiển thị phòng thi. Tham gia lớp bằng mã lớp trước.</p>';root.querySelector('#live-create').innerHTML='';return;}
    const selected=classId;
    const rooms=await rpc('list_live_rooms',{class_uuid:selected});
    if(disposed||selected!==classId)return;
    root.querySelector('#live-history').innerHTML=`<h4>Phòng gần đây</h4>${action('Tải lại danh sách phòng','list')}<div class="cloud-list">${rooms.length?rooms.map(r=>`<div>${action(r.title,'open',`data-id="${r.id}"`)} <span>${states[r.state]||h(r.state)}</span></div>`).join(''):'<p>Bạn chưa có phòng thi trong lớp này.</p>'}</div><p class="panel-sub">Hiển thị 20 phòng gần nhất bạn tổ chức hoặc đã tham gia.</p>`;
    const own=classes.find(c=>c.id===selected)?.teacher_id===user.id;
    if(!own){root.querySelector('#live-create').innerHTML='';return;}
    hostQuizzes=await reply(client.from('assignments').select('id,title').eq('class_id',selected).eq('format','quiz').order('created_at',{ascending:false}).limit(100));
    if(disposed||selected!==classId)return;
    root.querySelector('#live-create').innerHTML=`<details><summary>Tạo phòng thi</summary><p>Mã có hiệu lực chờ 24 giờ. Học viên phải vào trước khi bắt đầu. Mỗi phòng tối đa 100 người.</p><p>Bài thi dùng lại câu hỏi của bài tập đã giao; phù hợp luyện tập cùng lớp, không phải đề thi bí mật.</p><form data-live-form="create" class="cloud-form"><label>Bài trắc nghiệm của lớp<select name="assignment" required><option value="">Chọn bài trắc nghiệm</option>${hostQuizzes.map(q=>`<option value="${q.id}">${h(q.title)}</option>`).join('')}</select></label>${field('Thời gian thi (phút)','minutes','number','min="1" max="120" step="1" value="10"')}<button class="btn">Tạo phòng</button></form></details>`;
  }
  function renderRoom(force=false) {
    if(disposed||!room)return;
    const next=`${room.id}:${room.state}:${Boolean(room.my_result)}`;
    const panel=root.querySelector('#live-room');
    if(force||next!==signature) {
      signature=next;
      answers=room.my_result?.answers||room.my_draft||room.questions.map(()=>null);
      const canAnswer=!room.host&&room.state==='running'&&!room.my_result;
      panel.innerHTML=`<article class="live-room"><h4>${h(room.title)}</h4><p><strong>${states[room.state]||h(room.state)}</strong> <span id="live-clock" role="timer"></span></p>${room.join_code?`<p>Mã phòng: <strong class="live-code">${h(room.join_code)}</strong></p><p>Học viên nhập mã ở mục “Phòng thi trực tiếp” sau khi vào lớp.</p>`:''}<p class="cloud-prose">${h(room.instructions)}</p><div class="cloud-actions">${action('Làm mới phòng','refresh')}${room.host&&room.state==='waiting'?action('Bắt đầu thi','start'):''}${room.host&&['waiting','running'].includes(room.state)?action(room.state==='waiting'?'Đóng phòng':'Kết thúc phòng','end'):''}</div>${room.state==='waiting'?'<p>Đang chờ giáo viên bắt đầu.</p>':''}${room.my_result&&room.state==='running'?'<p>Đã nhận bài. Điểm sẽ hiện khi phòng kết thúc.</p>':''}${room.my_result&&room.state==='ended'?`<p><strong>Điểm của bạn: ${h(room.my_result.score)}/100</strong></p>`:''}<div id="live-roster"></div>${room.questions.length?`<form data-live-form="answers" class="cloud-form"><p>Các lựa chọn được lưu lên server. Khi hết giờ, server chấm bản đã lưu; câu bỏ trống tính sai. Kiểm tra thông báo đã lưu trước khi đóng trang.</p><p id="live-save-status" role="status"></p>${room.questions.map(q=>`<fieldset><legend>${q.position+1}. ${h(q.prompt)}</legend>${q.options.map((o,i)=>`<label class="cloud-choice"><input type="radio" name="live-q-${q.position}" value="${i}" ${canAnswer?'':'disabled'} ${answers[q.position]===i?'checked':''}><span>${h(o)}</span></label>`).join('')}</fieldset>`).join('')}${canAnswer?'<button class="btn">Nộp bài phòng thi</button>':''}</form>`:''}</article>`;
    }
    renderRoster();tick();
  }
  function renderRoster() {
    const el=root.querySelector('#live-roster');if(!el)return;
    const ended=room.state==='ended';
    el.innerHTML=`<h4>${ended?'Kết quả phòng':'Học viên trong phòng'} (${room.participants.length})</h4>${room.participants.length?`<ol class="live-roster">${room.participants.map(p=>`<li><span>${h(p.display_name||'Học viên chưa đặt tên')}</span><strong>${ended?(p.score===null?'Chưa có bài':`${h(p.score)}/100`):(p.submitted?'Đã nộp':'Đang chờ')}</strong></li>`).join('')}</ol>`:'<p>Chưa có học viên tham gia.</p>'}`;
  }
  function tick() {
    if(disposed||!room||room.state!=='running')return;
    const seconds=Math.max(0,Math.ceil((new Date(room.ends_at).getTime()-(Date.now()+room.clockOffset))/1000));
    const el=root.querySelector('#live-clock');if(el)el.textContent=`Còn ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    if(seconds===0)root.querySelectorAll('[data-live-form="answers"] input,[data-live-form="answers"] button').forEach(el=>el.disabled=true);
  }
  async function refresh(id=selectedRoomId) {
    if(!id||disposed||polling)return;
    polling=true;
    try {
      const data=await rpc('get_live_room',{room_uuid:id});
      if(disposed)return;
      if(selectedRoomId!==id)return;
      data.clockOffset=new Date(data.server_now).getTime()-Date.now();room=data;
      if(root.querySelector('#live-status').classList.contains('cloud-error'))status('Đã kết nối lại phòng thi.');
      renderRoom();
    }catch(error){fail(error);}finally{polling=false;}
  }
  async function open(id) {
    await saving;
    if(disposed)return;
    room=null;signature='';selectedRoomId=id;
    root.querySelector('#live-room').innerHTML='<p>Đang mở phòng thi...</p>';
    localStorage.setItem(storageKey,id);
    await refresh(id);
  }
  function selectedAnswers() {
    const form=root.querySelector('[data-live-form="answers"]');
    const values=new FormData(form);
    return room.questions.map(q=>values.has(`live-q-${q.position}`)?Number(values.get(`live-q-${q.position}`)):null);
  }
  function saveDraft() {
    const id=room.id,captured=selectedAnswers(),version=++saveVersion;
    const el=root.querySelector('#live-save-status');if(el)el.textContent='Đang lưu lựa chọn...';
    // Keep requests in input order; a slower earlier save cannot replace a later choice.
    saving=saving.catch(()=>{}).then(()=>rpc('save_live_answers',{room_uuid:id,answers:captured})).then(()=>{
      if(!disposed&&room?.id===id&&version===saveVersion){answers=captured;const el=root.querySelector('#live-save-status');if(el)el.textContent='Đã lưu lựa chọn lên server.';}
    }).catch(error=>{
      if(!disposed){const el=root.querySelector('#live-save-status');if(el)el.textContent='Chưa lưu được lựa chọn. Giữ trang mở và thử nộp lại khi có mạng.';fail(error);}
    });
  }
  const onChange=event=>{
    if(disposed)return;
    if(event.target.id==='live-class'){classId=event.target.value;loadList().catch(fail);}
    else if(event.target.matches('[name^="live-q-"]'))saveDraft();
  };
  const onSubmit=async event=>{
    const form=event.target.closest('[data-live-form]');if(!form||disposed)return;
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    const selected=room&&form.dataset.liveForm==='answers'?selectedAnswers():null;
    const submissionRoomId=room?.id;
    let submitted=false;
    const controls=[...form.querySelectorAll('button,input,select')];controls.forEach(el=>el.disabled=true);
    try {
      if(form.dataset.liveForm==='join') {const id=await rpc('join_live_room',{code:values.code});await open(id);await loadList();status('Đã vào phòng thi.');}
      if(form.dataset.liveForm==='create') {const id=await rpc('create_live_room',{assignment_uuid:values.assignment,duration_seconds:Number(values.minutes)*60});await open(id);await loadList();status('Đã tạo phòng thi.');}
      if(form.dataset.liveForm==='answers') {
        await saving;await rpc('submit_live_quiz',{room_uuid:submissionRoomId,answers:selected});submitted=true;
        if(selectedRoomId===submissionRoomId){await refresh(submissionRoomId);status('Đã nhận bài. Điểm hiển thị khi kết thúc phòng.');}
      }
    }catch(error){fail(error);}finally{controls.forEach(el=>{if(el.isConnected)el.disabled=submitted;});tick();}
  };
  const onClick=async event=>{
    const target=event.target.closest('[data-live]');if(!target||disposed)return;
    target.disabled=true;
    try {
      const name=target.dataset.live;
      if(name==='list')await loadList();
      if(name==='open')await open(target.dataset.id);
      if(name==='refresh')await refresh();
      if(name==='start'||name==='end') {
        if(name==='end'&&!window.confirm('Kết thúc phòng? Lựa chọn đã lưu sẽ được chấm và không thể sửa.'))return;
        await rpc('control_live_room',{room_uuid:room.id,command:name});await refresh();await loadList();
      }
    }catch(error){fail(error);}finally{target.disabled=false;}
  };
  root.addEventListener('change',onChange);
  root.addEventListener('submit',onSubmit);
  root.addEventListener('click',onClick);
  const poll=setInterval(()=>{
    if(!root.isConnected){destroy();return;}
    // Finished rooms no longer change; "Làm mới phòng" still fetches on demand.
    if(room&&['ended','expired'].includes(room.state))return;
    if(document.visibilityState==='visible'&&root.getClientRects().length)refresh();
  },3000);
  const clock=setInterval(tick,1000);
  function destroy(){disposed=true;clearInterval(poll);clearInterval(clock);root.removeEventListener('change',onChange);root.removeEventListener('submit',onSubmit);root.removeEventListener('click',onClick);}
  loadList().catch(fail);
  const previous=localStorage.getItem(storageKey);if(previous)open(previous).catch(fail);
  return {destroy};
}
