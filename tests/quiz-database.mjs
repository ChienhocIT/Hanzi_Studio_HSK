import assert from 'node:assert/strict';
export async function exerciseQuizzes(db) {
  const student='00000000-0000-4000-8000-000000000001',outsider='00000000-0000-4000-8000-000000000002',teacher='00000000-0000-4000-8000-000000000003';
  const classId=(await db.query('select id from public.classes limit 1')).rows[0].id;
  const itemId=(await db.query('select id from public.content_items limit 1')).rows[0].id;
  async function as(id,sql,args=[]) {
    await db.query('begin');
    try {
      await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
      const result=await db.query(sql,args);await db.query('commit');return result;
    }catch(error){await db.query('rollback');throw error;}
  }
  let checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  const questions=[{prompt:'你好 nghĩa là gì?',options:['Xin chào','Tạm biệt'],correct_index:0},{prompt:'谢谢 nghĩa là gì?',options:['Xin lỗi','Cảm ơn'],correct_index:1}];
  const create='select public.create_quiz_assignment($1,\'Quiz\',\'Chọn câu trả lời\',$2,now()+interval \'1 day\',$3) id';
  let quizId;
  await check('Quiz authoring enforces class ownership and question validation',async()=>{
    await assert.rejects(as(student,create,[classId,itemId,JSON.stringify(questions)]),/forbidden/);
    for(const bad of [[],[{...questions[0],correct_index:2}],[{...questions[0],options:['same','same']}],[{...questions[0],prompt:null}],[{...questions[0],correct_index:0.5}]]) {
      await assert.rejects(as(teacher,create,[classId,itemId,JSON.stringify(bad)]));
    }
    quizId=(await as(teacher,create,[classId,itemId,JSON.stringify(questions)])).rows[0].id;
    assert.equal((await as(student,'select format from public.assignments where id=$1',[quizId])).rows[0].format,'quiz');
  });
  await check('Learners read questions but cannot access answer keys or write questions',async()=>{
    const rows=(await as(student,'select * from public.assignment_questions where assignment_id=$1',[quizId])).rows;
    assert.equal(rows.length,2);assert.equal(rows[0].correct_index,undefined);
    assert.equal((await as(outsider,'select * from public.assignment_questions where assignment_id=$1',[quizId])).rowCount,0);
    await assert.rejects(as(student,'select * from private.quiz_answers'),/permission denied/);
    await assert.rejects(as(teacher,'select * from private.quiz_answers'),/permission denied/);
    await assert.rejects(as(student,"update public.assignment_questions set prompt='Fake'"),/permission denied/);
  });
  await check('Quiz rejects outsiders, partial answers, forged values and essay bypass',async()=>{
    await assert.rejects(as(outsider,'select public.submit_quiz($1,$2)',[quizId,'[0,1]']),/enrollment_required/);
    for(const bad of ['[0]','[0,6]','[null,1]','["0",1]','[0.5,1]','{"score":100}'])await assert.rejects(as(student,'select public.submit_quiz($1,$2)',[quizId,bad]));
    await assert.rejects(as(student,"select public.submit_assignment($1,'[]')",[quizId]),/essay_required/);
  });
  await check('Server computes score and permits one attempt only',async()=>{
    const score=(await as(student,"select public.submit_quiz($1,'[0,0]') score",[quizId])).rows[0].score;
    assert.equal(score,50);
    await assert.rejects(as(student,"select public.submit_quiz($1,'[0,1]')",[quizId]),/already_submitted/);
    await assert.rejects(as(teacher,"select public.grade_submission($1,$2,100,'override')",[quizId,student]),/essay_required/);
    assert.equal((await as(student,'select score from public.submissions where assignment_id=$1',[quizId])).rows[0].score,50);
  });
  await check('Quiz deadline and class reports use server records',async()=>{
    const nextId=(await as(teacher,create,[classId,itemId,JSON.stringify(questions)])).rows[0].id;
    await db.query("update public.assignments set due_at=now()-interval '1 second' where id=$1",[nextId]);
    await assert.rejects(as(student,"select public.submit_quiz($1,'[0,1]')",[nextId]),/deadline_passed/);
    const report=(await as(teacher,'select * from public.class_report($1)',[classId])).rows;
    assert.equal(report.find(x=>x.assignment_id===quizId).score,50);
  });
  console.log(`${checks} quiz database checks passed.`);
}
