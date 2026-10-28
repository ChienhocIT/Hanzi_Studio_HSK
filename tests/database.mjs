import assert from 'node:assert/strict';
export async function exerciseDatabase(db) {
  const ids={student:'00000000-0000-4000-8000-000000000001',other:'00000000-0000-4000-8000-000000000002',teacher:'00000000-0000-4000-8000-000000000003',admin:'00000000-0000-4000-8000-000000000004'};
  await db.query('insert into auth.users(id,raw_user_meta_data) select x::uuid,\'{"role":"admin","display_name":"Test user"}\'::jsonb from unnest($1::text[]) x',[Object.values(ids)]);
  await db.query("update public.profiles set role='teacher' where id=$1",[ids.teacher]);
  await db.query("update public.profiles set role='admin' where id=$1",[ids.admin]);
  let checks=0;
  async function as(id,sql,args=[],role='authenticated') {
    await db.query('begin');
    try {
      await db.query(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
      const result=await db.query(sql,args);await db.query('commit');return result;
    } catch(error){await db.query('rollback');throw error;}
  }
  async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
  await check('Signup metadata cannot grant admin',async()=>assert.equal((await as(ids.student,'select role from public.profiles')).rows[0].role,'student'));
  await check('Anonymous cannot read progress or invoke writes',async()=>{
    await assert.rejects(as(null,'select * from public.learning_progress',[],'anon'),/permission denied/);
    await assert.rejects(as(null,"select public.save_progress(0,'{}')",[],'anon'),/permission denied/);
  });
  await check('First snapshot is saved and CAS rejects a stale writer',async()=>{
    assert.equal((await as(ids.student,"select public.save_progress(0,'{}') r")).rows[0].r,1);
    await assert.rejects(as(ids.student,"select public.save_progress(0,'{}')"),/progress_conflict/);
    assert.equal((await as(ids.student,"select public.save_progress(1,'{}') r")).rows[0].r,2);
    await assert.rejects(as(ids.student,"select public.save_progress(1,'{}')"),/progress_conflict/);
  });
  await check('Another student and admin cannot read private progress',async()=>{
    assert.equal((await as(ids.other,'select * from public.learning_progress')).rowCount,0);
    assert.equal((await as(ids.admin,'select * from public.learning_progress')).rowCount,0);
  });
  await check('A changed JWT cannot upload the prior account snapshot',async()=>{
    await assert.rejects(as(ids.other,"select public.save_progress(0,'{}',$1)",[ids.student]),/progress_owner_changed/);
    assert.equal((await as(ids.other,'select * from public.learning_progress')).rowCount,0);
  });
  await check('Direct writes and role escalation are forbidden',async()=>{
    await assert.rejects(as(ids.student,"update public.profiles set role='admin'"),/permission denied/);
    await assert.rejects(as(ids.student,'select public.set_user_role($1,\'admin\')',[ids.student]),/admin_required/);
    await assert.rejects(as(ids.student,"insert into public.learning_progress(user_id,snapshot) values($1,'{}')",[ids.other]),/permission denied/);
  });
  await check('Unknown snapshot group is rejected',()=>assert.rejects(as(ids.student,'select public.save_progress(2,$1)',[{token:{secret:'fake'}}]),/invalid_progress/));
  const item={title:'Test reading',kind:'reading',level:'3',syllabus:'Test syllabus (not official)',body:'你好。这是测试。',source_url:'https://example.com/test',license:'Test fixture only'};
  let itemId,classId,assignmentId,code;
  await check('Only teachers can author content',async()=>{
    await assert.rejects(as(ids.student,'select public.save_content(null,0,$1)',[item]),/teacher_required/);
    itemId=(await as(ids.teacher,'select public.save_content(null,0,$1) id',[item])).rows[0].id;
    assert.equal((await as(ids.student,'select * from public.content_items')).rowCount,0);
  });
  await check('Review state machine, revisions and independent approval',async()=>{
    await as(ids.teacher,"select public.review_content($1,1,'in_review','')",[itemId]);
    await assert.rejects(as(ids.teacher,"select public.review_content($1,2,'published','')",[itemId]),/independent_reviewer_required/);
    await as(ids.admin,"select public.review_content($1,2,'rejected','Check example')",[itemId]);
    await assert.rejects(as(ids.teacher,'select public.save_content($1,2,$2)',[itemId,item]),/content_conflict_or_forbidden/);
    await as(ids.teacher,'select public.save_content($1,3,$2)',[itemId,item]);
    await as(ids.teacher,"select public.review_content($1,4,'in_review','')",[itemId]);
    await as(ids.admin,"select public.review_content($1,5,'published','')",[itemId]);
    assert.equal((await as(ids.student,'select * from public.content_items')).rowCount,1);
    assert.equal((await as(ids.teacher,'select * from public.content_audit')).rowCount,6);
    await assert.rejects(as(ids.teacher,'select public.save_content($1,6,$2)',[itemId,item]),/content_conflict_or_forbidden/);
  });
  await check('Teacher creates class; strangers cannot enumerate classes',async()=>{
    await assert.rejects(as(ids.student,"select public.create_class('Forbidden')"),/teacher_required/);
    classId=(await as(ids.teacher,"select public.create_class('Test class') id")).rows[0].id;
    code=(await as(ids.teacher,'select join_code from public.classes where id=$1',[classId])).rows[0].join_code;
    assert.equal((await as(ids.student,'select * from public.classes')).rowCount,0);
    await assert.rejects(as(ids.student,"select public.join_class('bad-code')"),/invalid_or_closed_class/);
  });
  await check('Joining is idempotent; closing admission is enforced',async()=>{
    await as(ids.student,'select public.join_class($1)',[code]);await as(ids.student,'select public.join_class($1)',[code]);
    assert.equal((await as(ids.teacher,'select * from public.class_members')).rowCount,1);
    await as(ids.teacher,'select public.set_class_open($1,false)',[classId]);
    await assert.rejects(as(ids.other,'select public.join_class($1)',[code]),/invalid_or_closed_class/);
    await assert.rejects(as(ids.student,'select public.set_class_open($1,true)',[classId]),/forbidden/);
  });
  await check('Only teacher assigns published content with future deadline',async()=>{
    await assert.rejects(as(ids.student,"select public.create_assignment($1,'Read','Answer',$2,now()+interval '1 day')",[classId,itemId]),/forbidden/);
    await assert.rejects(as(ids.teacher,"select public.create_assignment($1,'Read','Answer',$2,now()-interval '1 day')",[classId,itemId]),/future_deadline_required/);
    assignmentId=(await as(ids.teacher,"select public.create_assignment($1,'Read','Answer',$2,now()+interval '1 day') id",[classId,itemId])).rows[0].id;
    assert.equal((await as(ids.other,'select * from public.assignments')).rowCount,0);
    assert.equal((await as(ids.student,'select * from public.assignments')).rows[0].lesson.body,item.body);
  });
  await check('Only enrolled student submits; other users cannot see answers',async()=>{
    await assert.rejects(as(ids.other,"select public.submit_assignment($1,'Steal')",[assignmentId]),/enrollment_required/);
    await as(ids.student,"select public.submit_assignment($1,'我的答案')",[assignmentId]);
    await as(ids.student,"select public.submit_assignment($1,'更新答案')",[assignmentId]);
    assert.equal((await as(ids.other,'select * from public.submissions')).rowCount,0);
    assert.equal((await as(ids.teacher,'select answer from public.submissions')).rows[0].answer,'更新答案');
  });
  await check('Grading is teacher-only and immutable to the student',async()=>{
    await assert.rejects(as(ids.student,"select public.grade_submission($1,$2,100,'Fake')",[assignmentId,ids.student]),/forbidden/);
    await assert.rejects(as(ids.teacher,"select public.grade_submission($1,$2,101,'Invalid')",[assignmentId,ids.student]),/check constraint/);
    await as(ids.teacher,"select public.grade_submission($1,$2,85,'Good')",[assignmentId,ids.student]);
    await assert.rejects(as(ids.student,"select public.submit_assignment($1,'Changed')",[assignmentId]),/already_graded/);
    assert.equal((await as(ids.student,'select score from public.submissions')).rows[0].score,85);
  });
  await check('Class report includes enrolled students and enforces teacher scope',async()=>{
    const report=await as(ids.teacher,'select * from public.class_report($1)',[classId]);
    assert.equal(report.rows[0].score,85);assert.equal(report.rows[0].student_id,ids.student);
    await assert.rejects(as(ids.other,'select * from public.class_report($1)',[classId]),/forbidden/);
  });
  await check('Server deadline is enforced regardless of client clock',async()=>{
    await db.query("update public.assignments set due_at=now()-interval '1 second' where id=$1",[assignmentId]);
    await assert.rejects(as(ids.student,"select public.submit_assignment($1,'Late')",[assignmentId]),/deadline_passed/);
  });
  await check('Admin assigns roles without losing own access',async()=>{
    await as(ids.admin,"select public.set_user_role($1,'teacher')",[ids.other]);
    assert.equal((await as(ids.other,'select role from public.profiles')).rows[0].role,'teacher');
    await assert.rejects(as(ids.admin,"select public.set_user_role($1,'student')",[ids.admin]),/cannot_demote_self/);
  });
  console.log(`${checks} database integration checks passed.`);
}
