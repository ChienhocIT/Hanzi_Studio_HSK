import assert from 'node:assert/strict';
export async function exerciseLiveRooms(db) {
  const student='00000000-0000-4000-8000-000000000001',outsider='00000000-0000-4000-8000-000000000002',teacher='00000000-0000-4000-8000-000000000003',second='00000000-0000-4000-8000-000000000005';
  const classId=(await db.query('select id from public.classes limit 1')).rows[0].id;
  const itemId=(await db.query('select id from public.content_items limit 1')).rows[0].id;
  await db.query('insert into auth.users(id) values($1)',[second]);
  await db.query('insert into public.class_members values($1,$2,now())',[classId,second]);
  async function as(id,sql,args=[],role='authenticated') {
    await db.query('begin');
    try {
      await db.query(`set local role ${role}`);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
      const result=await db.query(sql,args);await db.query('commit');return result;
    }catch(error){await db.query('rollback');throw error;}
  }
  const rpc=async(id,sql,args)=>(await as(id,sql,args)).rows[0];
  const get=async(id,room)=>(await rpc(id,'select public.get_live_room($1) room',[room])).room;
  const questions=[{prompt:'你好 nghĩa là gì?',options:['Xin chào','Tạm biệt'],correct_index:0},{prompt:'谢谢 nghĩa là gì?',options:['Xin lỗi','Cảm ơn'],correct_index:1}];
  const quiz=(await rpc(teacher,"select public.create_quiz_assignment($1,'Live quiz','Chọn nghĩa',$2,now()+interval '1 day',$3) id",[classId,itemId,JSON.stringify(questions)])).id;
  let room,code,checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  await check('Live rooms enforce host ownership, quiz type, duration and anonymous denial',async()=>{
    await assert.rejects(as(student,'select public.create_live_room($1,60)',[quiz]),/forbidden/);
    await assert.rejects(as(null,'select public.create_live_room($1,60)',[quiz],'anon'),/permission denied/);
    await assert.rejects(as(teacher,'select public.create_live_room($1,0)',[quiz]),/check constraint/);
    const essay=(await db.query("select id from public.assignments where format='essay' limit 1")).rows[0].id;
    await assert.rejects(as(teacher,'select public.create_live_room($1,60)',[essay]),/quiz_required/);
    room=(await rpc(teacher,'select public.create_live_room($1,120) id',[quiz])).id;
    const state=await get(teacher,room);code=state.join_code;assert.equal(state.state,'waiting');assert.equal(state.questions.length,0);
  });
  await check('Only classmates join with a valid code, and repeat join is idempotent',async()=>{
    await assert.rejects(as(outsider,'select public.join_live_room($1)',[code]),/enrollment_required/);
    await assert.rejects(as(student,"select public.join_live_room('bad')"),/room_unavailable/);
    await assert.rejects(get(student,room),/enrollment_required/);
    await as(student,'select public.join_live_room($1)',[code.toLowerCase()]);await as(student,'select public.join_live_room($1)',[code]);
    await as(second,'select public.join_live_room($1)',[code]);
    assert.equal((await get(teacher,room)).participants.length,2);
    assert.equal((await get(student,room)).join_code,null);
    assert.equal((await rpc(student,'select public.list_live_rooms($1) rooms',[classId])).rooms.length,1);
    await assert.rejects(as(outsider,'select public.list_live_rooms($1)',[classId]),/enrollment_required/);
  });
  await check('Host alone starts; drafts and submissions require a running room',async()=>{
    await assert.rejects(as(student,"select public.submit_live_quiz($1,'[0,1]')",[room]),/room_not_running/);
    await assert.rejects(as(student,"select public.control_live_room($1,'start')",[room]),/forbidden/);
    await as(teacher,"select public.control_live_room($1,'start')",[room]);
    await assert.rejects(as(teacher,"select public.control_live_room($1,'start')",[room]),/room_unavailable/);
    const state=await get(student,room);assert.equal(state.state,'running');assert.equal(state.questions.length,2);
    assert.equal(state.questions[0].correct_index,undefined);assert.ok(new Date(state.ends_at)>new Date(state.server_now));
  });
  await check('Server saves nullable drafts, validates choices and restores them',async()=>{
    for(const bad of ['[0]','[0,9]','["0",1]','[0.5,1]'])await assert.rejects(as(student,'select public.save_live_answers($1,$2)',[room,bad]));
    await as(student,"select public.save_live_answers($1,'[0,null]')",[room]);
    assert.deepEqual((await get(student,room)).my_draft,[0,null]);
    assert.equal((await get(second,room)).my_draft,null);
    await assert.rejects(as(student,'select * from private.live_drafts'),/permission denied/);
    await assert.rejects(as(student,'select * from private.live_results'),/permission denied/);
    await assert.rejects(as(student,'select * from public.live_rooms'),/permission denied/);
  });
  await check('Submission is one attempt, scores stay hidden until room ends',async()=>{
    await as(student,"select public.submit_live_quiz($1,'[0,0]')",[room]);
    await assert.rejects(as(student,"select public.submit_live_quiz($1,'[0,1]')",[room]),/already_submitted/);
    const own=await get(student,room),host=await get(teacher,room);
    assert.equal(own.my_result.score,null);assert.deepEqual(own.my_result.answers,[0,0]);
    assert.ok(host.participants.every(p=>p.score===null&&p.submitted_at===null));
    assert.equal(host.participants.find(p=>p.user_id===student).submitted,true);
  });
  await check('Ending reveals server scores and automatically grades saved/blank drafts',async()=>{
    await as(second,"select public.save_live_answers($1,'[0,1]')",[room]);
    await as(teacher,"select public.control_live_room($1,'end')",[room]);
    const host=await get(teacher,room);assert.equal(host.state,'ended');assert.equal(host.participants[0].user_id,second);assert.equal(host.participants[0].score,100);
    assert.equal((await get(student,room)).my_result.score,50);
    await assert.rejects(as(second,"select public.save_live_answers($1,'[0,0]')",[room]),/room_not_running/);
    assert.equal((await db.query('select count(*)::integer total from public.submissions where assignment_id=$1',[quiz])).rows[0].total,0);
  });
  await check('Server timeout finalizes partial and empty work without a client submit',async()=>{
    const timed=(await rpc(teacher,'select public.create_live_room($1,60) id',[quiz])).id;
    const timedCode=(await get(teacher,timed)).join_code;
    await as(student,'select public.join_live_room($1)',[timedCode]);await as(second,'select public.join_live_room($1)',[timedCode]);
    await as(teacher,"select public.control_live_room($1,'start')",[timed]);
    await as(student,"select public.save_live_answers($1,'[0,null]')",[timed]);
    await db.query("update public.live_rooms set ends_at=clock_timestamp()-interval '1 second' where id=$1",[timed]);
    await assert.rejects(as(student,"select public.submit_live_quiz($1,'[0,1]')",[timed]),/room_not_running/);
    const state=await get(student,timed);assert.equal(state.state,'ended');assert.equal(state.my_result.score,50);
    assert.equal((await get(second,timed)).my_result.score,0);
    assert.equal((await get(teacher,timed)).participants.length,2);
  });
  await check('Expired codes and canceled rooms cannot start or accept new participants',async()=>{
    const expired=(await rpc(teacher,'select public.create_live_room($1,60) id',[quiz])).id;
    const expiredCode=(await get(teacher,expired)).join_code;
    await db.query("update public.live_rooms set expires_at=now()-interval '1 second' where id=$1",[expired]);
    await assert.rejects(as(student,'select public.join_live_room($1)',[expiredCode]),/room_unavailable/);
    await assert.rejects(as(teacher,"select public.control_live_room($1,'start')",[expired]),/room_unavailable/);
    assert.equal((await get(teacher,expired)).state,'expired');
    const canceled=(await rpc(teacher,'select public.create_live_room($1,60) id',[quiz])).id;
    await as(teacher,"select public.control_live_room($1,'end')",[canceled]);
    await assert.rejects(as(teacher,"select public.control_live_room($1,'start')",[canceled]),/room_unavailable/);
    assert.equal((await get(teacher,canceled)).participants.length,0);
  });
  console.log(`${checks} live-room database checks passed.`);
}
