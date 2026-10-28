import { h, field } from './ui.js';
import { quizAuthor, questionEditor, readQuestions, quizResponse } from './quizzes.js';
import { mountLive } from './live.js';
const action=(label,name,extra='')=>`<button type="button" class="btn" data-work="${name}" ${extra}>${label}</button>`;
const statuses={draft:'Bản nháp',in_review:'Đang chờ duyệt',published:'Đã xuất bản',rejected:'Cần chỉnh sửa'};
const kinds={vocabulary:'Từ vựng',grammar:'Ngữ pháp',reading:'Đọc hiểu',listening:'Luyện nghe',dialogue:'Hội thoại'};
const stamp=value=>value?new Date(value).toLocaleString('vi-VN'):'Chưa nộp';
const reply=async request=>{const{data,error}=await request;if(error)throw error;return data;};

export async function mountWorkspace(root,client,user,profile,msg,failure) {
  let contents=[],classes=[],assignments=[],submissions=[],people=[],roster=new Map(),selectedClass='',tab='library',loading=false;
  const quizQuestions=new Map();
  let liveController;
  const rpc=(name,args)=>reply(client.rpc(name,args));
  const teaching=['teacher','admin'].includes(profile.role);
  const studentName=id=>roster.get(id)||'Học viên chưa đặt tên';
  root.innerHTML=`<div class="cloud-tabs" role="group" aria-label="Không gian học tập">${action('Học liệu','tab','data-tab="library"')}${action('Lớp học','tab','data-tab="classes"')}${action('Phòng thi','tab','data-tab="live"')}${profile.role==='admin'?action('Phân quyền','tab','data-tab="roles"'):''}</div><div id="cloud-view" class="cloud-loading">Đang tải học liệu...</div>`;
  const view=root.querySelector('#cloud-view');
  function contentForm(item={}) {
    return `<form data-work-form="content" data-id="${h(item.id||'')}" data-revision="${item.revision||0}" class="cloud-form">${field('Tiêu đề','title','text',`maxlength="160" value="${h(item.title)}"`)}<label>Loại học liệu<select name="kind">${['vocabulary','grammar','reading','listening','dialogue'].map(x=>`<option value="${x}" ${x===item.kind?'selected':''}>${kinds[x]}</option>`).join('')}</select></label><label>Cấp độ<select name="level">${['1','2','3','4','5','6','7-9'].map(x=>`<option ${x===item.level?'selected':''}>${x}</option>`).join('')}</select></label>${field('Phiên bản đề cương (ví dụ HSK 2.0)','syllabus','text',`maxlength="120" value="${h(item.syllabus)}"`)}<label>Nội dung / transcript<textarea name="body" required maxlength="30000" rows="7">${h(item.body)}</textarea></label>${field('Nguồn HTTPS','source_url','url',`pattern="https://.*" maxlength="2000" value="${h(item.source_url)}"`)}${field('Giấy phép / quyền sử dụng','license','text',`maxlength="500" value="${h(item.license)}"`)}<button class="btn">Lưu bản nháp</button></form>`;
  }
  function renderLibrary() {
    view.innerHTML=`<h3>Học liệu đa cấp</h3><p>Chỉ học liệu đã được duyệt mới hiển thị cho học viên. Các tài liệu tích hợp cũ vẫn nằm trong các màn học hiện tại.</p>${action('Tải lại học liệu','refresh')}${teaching?`<details><summary>Tạo học liệu</summary>${contentForm()}</details>`:''}<div class="cloud-list">${contents.length?contents.map(item=>`<article><h4>${h(item.title)}</h4><p>HSK ${h(item.level)} / ${h(item.syllabus)} / ${h(statuses[item.status]||item.status)}</p><p class="cloud-prose">${h(item.body)}</p><p><a href="${h(item.source_url)}" target="_blank" rel="noopener noreferrer">Nguồn học liệu</a> | ${h(item.license)}</p>${item.review_note?`<p>Nhận xét: ${h(item.review_note)}</p>`:''}<div class="cloud-actions">${item.author_id===user.id&&['draft','rejected'].includes(item.status)?action('Sửa bản nháp','edit',`data-id="${item.id}"`)+action('Gửi duyệt','review',`data-id="${item.id}" data-revision="${item.revision}" data-decision="in_review"`):''}${profile.role==='admin'&&item.status==='in_review'&&item.author_id!==user.id?action('Xuất bản','review',`data-id="${item.id}" data-revision="${item.revision}" data-decision="published"`)+action('Trả lại','review',`data-id="${item.id}" data-revision="${item.revision}" data-decision="rejected"`):''}</div><div id="edit-${item.id}"></div></article>`).join(''):'<p>Chưa có học liệu phù hợp. Giáo viên có thể tạo bản nháp để gửi duyệt.</p>'}</div><p class="panel-sub">Hiển thị tối đa 200 học liệu gần nhất.</p>`;
  }
  function assignmentCard(a,own) {
    const mine=submissions.find(s=>s.assignment_id===a.id&&s.student_id===user.id);
    const late=new Date(a.due_at).getTime()<Date.now();
    let response;
    if(a.format==='quiz') response=quizResponse(a,mine,quizQuestions.get(a.id),own,submissions,studentName);
    else if (own) response=submissions.filter(s=>s.assignment_id===a.id).map(s=>`<details><summary>${h(studentName(s.student_id))}: ${s.score===null?'Chưa chấm':`${s.score}/100`}</summary><p class="cloud-prose">${h(s.answer)}</p><p>Nộp lúc ${stamp(s.submitted_at)}</p><form data-work-form="grade" data-assignment="${a.id}" data-student="${s.student_id}" class="cloud-form">${field('Điểm (0-100)','grade','number',`min="0" max="100" step="1" value="${s.score??''}"`)}<label>Nhận xét<textarea name="comment" maxlength="5000">${h(s.feedback)}</textarea></label><button class="btn">Lưu điểm</button></form></details>`).join('')||'<p>Chưa có bài nộp.</p>';
    else response=`${mine?`<p>Nộp lúc ${stamp(mine.submitted_at)}. ${mine.score===null?'Đang chờ chấm.':`Điểm: ${mine.score}/100`}</p><p class="cloud-prose">${h(mine.feedback)}</p>`:''}${!late&&mine?.score==null?`<form data-work-form="submission" data-id="${a.id}" class="cloud-form"><label>Câu trả lời<textarea name="answer" required maxlength="30000" rows="5">${h(mine?.answer)}</textarea></label><button class="btn">${mine?'Cập nhật bài nộp':'Nộp bài'}</button></form>`:`<p>${late?'Đã hết hạn nộp.':'Bài đã được chấm.'}</p><p class="cloud-prose">${h(mine?.answer)}</p>`}`;
    return `<article><h4>${h(a.title)}</h4><p>Hạn nộp: ${stamp(a.due_at)}</p><p class="cloud-prose">${h(a.instructions)}</p><details><summary>${h(a.lesson.title)} (HSK ${h(a.lesson.level)})</summary><p class="cloud-prose">${h(a.lesson.body)}</p><a href="${h(a.lesson.source_url)}" target="_blank" rel="noopener noreferrer">Nguồn</a><p>${h(a.lesson.license)}</p></details>${response}</article>`;
  }
  function renderClasses() {
    const current=classes.find(x=>x.id===selectedClass),own=current?.teacher_id===user.id;
    const items=assignments.filter(x=>x.class_id===selectedClass);
    view.innerHTML=`<h3>Lớp học & bài tập</h3><form data-work-form="join" class="cloud-form">${field('Mã tham gia lớp','code','text','maxlength="32" minlength="32" autocomplete="off"')}<button class="btn">Tham gia lớp</button></form>${teaching?`<details><summary>Tạo lớp học</summary><form data-work-form="class" class="cloud-form">${field('Tên lớp','title','text','maxlength="160"')}<button class="btn">Tạo lớp</button></form></details>`:''}${action('Tải lại lớp học','refresh')}<label class="cloud-select">Chọn lớp<select id="cloud-class"><option value="">Chọn một lớp</option>${classes.map(x=>`<option value="${x.id}" ${x.id===selectedClass?'selected':''}>${h(x.title)}</option>`).join('')}</select></label>${!classes.length?'<p>Bạn chưa tham gia lớp nào. Nhập mã được giáo viên cung cấp.</p>':''}${current?`<h4>${h(current.title)}</h4>${own?`<p>Mã tham gia: <code>${h(current.join_code)}</code></p><p>${current.open?'Đang nhận học viên':'Đã đóng nhận học viên'}</p>${action(current.open?'Đóng nhận học viên':'Mở nhận học viên','class-open',`data-id="${current.id}" data-open="${!current.open}"`)}${action('Xem báo cáo lớp','report',`data-id="${current.id}"`)}<div id="cloud-report"></div><details><summary>Giao bài tự luận</summary><form data-work-form="assignment" class="cloud-form">${field('Tên bài tập','title','text','maxlength="160"')}<label>Yêu cầu<textarea name="instructions" required maxlength="10000"></textarea></label><label>Học liệu đã xuất bản<select name="item_id" required><option value="">Chọn học liệu</option>${contents.filter(x=>x.status==='published').map(x=>`<option value="${x.id}">${h(x.title)}</option>`).join('')}</select></label>${field('Hạn nộp (giờ thiết bị)','due_at','datetime-local')}<button class="btn">Giao bài</button></form></details>`:''}<div class="cloud-list">${items.length?items.map(a=>assignmentCard(a,own)).join(''):'<p>Lớp chưa có bài tập.</p>'}</div>`:''}<p class="panel-sub">Tối đa 100 lớp, 100 bài tập mỗi lớp và 1.000 bài nộp trong lần tải.</p>`;
    if(own)view.insertAdjacentHTML('beforeend',quizAuthor(contents));
  }
  function renderRoles() {
    if(profile.role!=='admin')return;
    view.innerHTML=`<h3>Phân quyền tài khoản</h3><p>Chỉ quản trị viên được cấp quyền giáo viên và quản trị.</p>${action('Tải lại tài khoản','refresh')}<div class="cloud-list">${people.map(p=>`<form data-work-form="role" data-id="${p.id}" class="cloud-form"><strong>${h(p.display_name||p.id)}</strong><label>Quyền<select name="role">${['student','teacher','admin'].map(x=>`<option ${p.role===x?'selected':''}>${x}</option>`).join('')}</select></label><button class="btn">Lưu quyền</button></form>`).join('')}</div><p class="panel-sub">Hiển thị 200 tài khoản gần nhất.</p>`;
  }
  function render() {
    liveController?.destroy();liveController=null;
    root.querySelectorAll('[data-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.tab===tab)));
    if(tab==='library')renderLibrary();else if(tab==='classes')renderClasses();else if(tab==='live')liveController=mountLive(view,client,classes,user);else renderRoles();
  }
  async function loadClass() {
    assignments=[];submissions=[];roster=new Map();
    if(!selectedClass)return;
    if(classes.find(c=>c.id===selectedClass)?.teacher_id===user.id)roster=new Map((await rpc('class_roster',{class_uuid:selectedClass})).map(r=>[r.student_id,r.display_name]));
    assignments=await reply(client.from('assignments').select('*').eq('class_id',selectedClass).order('created_at',{ascending:false}).limit(100));
    if(assignments.length)submissions=await reply(client.from('submissions').select('*').in('assignment_id',assignments.map(a=>a.id)).limit(1000));
  }
  async function load() {
    const result=await Promise.all([
      reply(client.from('content_items').select('*').order('updated_at',{ascending:false}).limit(200)),
      reply(client.from('classes').select('*').order('created_at',{ascending:false}).limit(100)),
      profile.role==='admin'?reply(client.from('profiles').select('*').order('created_at',{ascending:false}).limit(200)):[]
    ]);
    [contents,classes,people]=result;
    if(!classes.some(c=>c.id===selectedClass))selectedClass=classes[0]?.id||'';
    await loadClass();render();
  }
  root.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-work-form]');if(!form)return;
    event.preventDefault();if(loading)return;
    loading=true;const values=Object.fromEntries(new FormData(form));
    const controls=[...form.querySelectorAll('button')];controls.forEach(x=>x.disabled=true);msg('Đang lưu...');
    try {
      switch(form.dataset.workForm) {
        case 'content':await rpc('save_content',{item_id:form.dataset.id||null,expected_revision:Number(form.dataset.revision),item:values});break;
        case 'class':selectedClass=await rpc('create_class',{class_title:values.title});break;
        case 'join':selectedClass=await rpc('join_class',{code:values.code.trim()});break;
        case 'assignment':await rpc('create_assignment',{class_uuid:selectedClass,assignment_title:values.title,instructions:values.instructions,item_id:values.item_id,due_at:new Date(values.due_at).toISOString()});break;
        case 'quiz-assignment':await rpc('create_quiz_assignment',{class_uuid:selectedClass,assignment_title:values.title,instructions:values.instructions,item_id:values.item_id,due_at:new Date(values.due_at).toISOString(),questions:readQuestions(form)});break;
        case 'quiz-submission':{
          const questions=quizQuestions.get(form.dataset.id);
          if(!questions?.length)throw Error('Hãy mở lại bài trắc nghiệm.');
          await rpc('submit_quiz',{assignment_uuid:form.dataset.id,answers:questions.map(q=>Number(values[`q-${q.position}`]))});break;
        }
        case 'submission':await rpc('submit_assignment',{assignment_uuid:form.dataset.id,answer_text:values.answer});break;
        case 'grade':await rpc('grade_submission',{assignment_uuid:form.dataset.assignment,student_uuid:form.dataset.student,grade:Number(values.grade),comment:values.comment});break;
        case 'role':await rpc('set_user_role',{user_uuid:form.dataset.id,new_role:values.role});break;
      }
      await load();msg('Đã lưu thành công.');
    }catch(error){failure(error);}finally{loading=false;controls.forEach(x=>x.disabled=false);}
  });
  root.addEventListener('change',async event=>{
    if(event.target.id!=='cloud-class')return;
    selectedClass=event.target.value;
    try{await loadClass();render();}catch(error){failure(error);}
  });
  root.addEventListener('click',async event=>{
    const target=event.target.closest('[data-work]');if(!target||loading)return;
    loading=true;target.disabled=true;
    try {
      switch(target.dataset.work) {
        case 'add-question':{
          const container=view.querySelector('[data-question-editors]');
          const count=container.children.length;
          if(count>=50)throw Error('Bài trắc nghiệm có tối đa 50 câu.');
          container.insertAdjacentHTML('beforeend',questionEditor(count));break;
        }
        case 'open-quiz':{
          const questions=await reply(client.from('assignment_questions').select('position,prompt,options').eq('assignment_id',target.dataset.id).order('position').limit(50));
          if(!questions.length)throw Error('Không có câu hỏi. Hãy tải lại lớp.');
          quizQuestions.set(target.dataset.id,questions);render();break;
        }
        case 'tab':tab=target.dataset.tab;render();break;
        case 'refresh':await load();msg('Đã tải dữ liệu mới.');break;
        case 'edit':{const item=contents.find(x=>x.id===target.dataset.id);view.querySelector(`#edit-${item.id}`).innerHTML=contentForm(item);break;}
        case 'review':{
          const note=target.dataset.decision==='rejected'?window.prompt('Lý do trả lại học liệu:'):'';if(note===null)return;
          await rpc('review_content',{item_id:target.dataset.id,expected_revision:Number(target.dataset.revision),decision:target.dataset.decision,note});await load();msg('Đã cập nhật trạng thái duyệt.');break;
        }
        case 'class-open':await rpc('set_class_open',{class_uuid:target.dataset.id,is_open:target.dataset.open==='true'});await load();break;
        case 'report':{
          const rows=await rpc('class_report',{class_uuid:target.dataset.id});
          root.querySelector('#cloud-report').innerHTML=rows.length?`<div class="cloud-table"><table><caption>Báo cáo bài tập lớp</caption><thead><tr><th>Học viên</th><th>Bài tập</th><th>Nộp lúc</th><th>Điểm</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${h(r.display_name||r.student_id)}</td><td>${h(r.assignment_title||'Chưa giao bài')}</td><td>${stamp(r.submitted_at)}</td><td>${r.score??'Chưa chấm'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Chưa có học viên trong lớp.</p>';break;
        }
      }
    }catch(error){failure(error);}finally{loading=false;target.disabled=false;}
  });
  await load();
}
