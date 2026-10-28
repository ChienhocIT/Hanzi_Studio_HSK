import { h, field } from './ui.js';
export function questionEditor(position) {
  return `<fieldset data-question><legend>Câu ${position+1}</legend>${field('Nội dung câu hỏi','prompt','text','maxlength="2000"')}<label>Các lựa chọn (mỗi dòng một lựa chọn, 2-6 dòng)<textarea name="options" required rows="4" maxlength="6006"></textarea></label>${field('Số thứ tự đáp án đúng (từ 1)','correct','number','min="1" max="6" step="1"')}</fieldset>`;
}
export function quizAuthor(contents) {
  return `<details id="quiz-author"><summary>Giao bài trắc nghiệm</summary><p>Mỗi học viên nộp một lần. Server tự chấm điểm; đáp án đúng không gửi cho học viên.</p><form data-work-form="quiz-assignment" class="cloud-form">${field('Tên bài trắc nghiệm','title','text','maxlength="160"')}<label>Hướng dẫn làm bài<textarea name="instructions" required maxlength="10000"></textarea></label><label>Học liệu nguồn đã duyệt<select name="item_id" required><option value="">Chọn học liệu</option>${contents.filter(x=>x.status==='published').map(x=>`<option value="${x.id}">${h(x.title)}</option>`).join('')}</select></label>${field('Hạn nộp trắc nghiệm (giờ thiết bị)','due_at','datetime-local')}<div data-question-editors>${questionEditor(0)}</div><button type="button" class="btn" data-work="add-question">Thêm câu hỏi</button><button class="btn">Giao bài trắc nghiệm</button></form></details>`;
}
export function readQuestions(form) {
  return [...form.querySelectorAll('[data-question]')].map(el=>{
    const prompt=el.querySelector('[name="prompt"]').value.trim();
    const options=el.querySelector('[name="options"]').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const correct=Number(el.querySelector('[name="correct"]').value)-1;
    if(!prompt || options.length<2 || options.length>6 || options.some(x=>x.length>1000) || new Set(options).size!==options.length || !Number.isInteger(correct) || correct<0 || correct>=options.length) throw Error('Câu hỏi cần 2-6 lựa chọn khác nhau và số đáp án đúng hợp lệ.');
    return {prompt,options,correct_index:correct};
  });
}
export function quizResponse(assignment,mine,questions,own,submissions,studentName) {
  const expired=new Date(assignment.due_at).getTime()<Date.now();
  const scores=own?submissions.filter(s=>s.assignment_id===assignment.id).map(s=>`<p>${h(studentName(s.student_id))}: ${h(s.score)}/100. ${h(s.feedback)}</p>`).join(''):'';
  if(!questions)return `${scores}<button type="button" class="btn" data-work="open-quiz" data-id="${assignment.id}">Xem bài trắc nghiệm</button>`;
  const chosen=mine?JSON.parse(mine.answer):[];
  const disabled=own||Boolean(mine)||expired;
  const body=questions.map(q=>`<fieldset class="cloud-question"><legend>${q.position+1}. ${h(q.prompt)}</legend>${q.options.map((option,i)=>`<label class="cloud-choice"><input type="radio" name="q-${q.position}" value="${i}" required ${disabled?'disabled':''} ${chosen[q.position]===i?'checked':''}><span>${h(option)}</span></label>`).join('')}</fieldset>`).join('');
  let status='';
  if(mine)status=`<p>Điểm: ${h(mine.score)}/100. ${h(mine.feedback)}</p><p>Đã nộp bài. Không thể làm lại bài này.</p>`;
  else if(expired)status='<p>Đã hết hạn nộp.</p>';
  else if(!own)status='<p>Kiểm tra các lựa chọn trước khi nộp. Bài này chỉ được nộp một lần.</p>';
  return `${scores}${status}<form data-work-form="quiz-submission" data-id="${assignment.id}" class="cloud-form">${body}${disabled?'':'<button class="btn">Nộp trắc nghiệm</button>'}</form>`;
}
