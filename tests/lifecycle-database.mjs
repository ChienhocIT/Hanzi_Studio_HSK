import assert from 'node:assert/strict';
import pg from 'pg';
// Runs last: it deletes the fixture accounts created by the earlier suites.
export async function exerciseLifecycle(db) {
  const student='00000000-0000-4000-8000-000000000001',outsider='00000000-0000-4000-8000-000000000002',teacher='00000000-0000-4000-8000-000000000003',admin='00000000-0000-4000-8000-000000000004',second='00000000-0000-4000-8000-000000000005';
  async function as(id,sql,args=[]) {
    await db.query('begin');
    try {
      await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
      const result=await db.query(sql,args);await db.query('commit');return result;
    }catch(error){await db.query('rollback');throw error;}
  }
  const count=async(sql,args=[])=>(await db.query(sql,args)).rows[0].n;
  const classId=(await db.query('select id from public.classes where teacher_id=$1 limit 1',[teacher])).rows[0].id;
  let checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  await check('Teachers read the names of their own students only',async()=>{
    await as(second,"select public.update_display_name('Lê Hoa')");
    const roster=(await as(teacher,'select * from public.class_roster($1)',[classId])).rows;
    assert.ok(roster.some(r=>r.student_id===second&&r.display_name==='Lê Hoa'));
    assert.ok(roster.every(r=>r.student_id!==teacher));
    await assert.rejects(as(student,'select * from public.class_roster($1)',[classId]),/forbidden/);
    await assert.rejects(as(outsider,'select * from public.class_roster($1)',[classId]),/forbidden/);
    assert.equal((await as(teacher,'select id from public.profiles where id=$1',[second])).rowCount,0);
  });
  await check('Reading a finalized live room does not wait for its row lock',async()=>{
    const room=(await db.query('select id from public.live_rooms where finalized limit 1')).rows[0].id;
    const holder=new pg.Client(db.connectionParameters);await holder.connect();
    try {
      await holder.query('begin');await holder.query('select 1 from public.live_rooms where id=$1 for update',[room]);
      await db.query('begin');
      try {
        await db.query("set local lock_timeout='500ms'");await db.query('set local role authenticated');
        await db.query("select set_config('request.jwt.claim.sub',$1,true)",[teacher]);
        assert.equal((await db.query('select public.get_live_room($1) room',[room])).rows[0].room.state,'ended');
      }finally{await db.query('rollback');}
    }finally{await holder.query('rollback');await holder.end();}
  });
  await check('Deleting a student account removes their class work but keeps the class',async()=>{
    assert.ok(await count('select count(*)::integer n from public.live_participants where user_id=$1',[student]));
    await db.query('delete from auth.users where id=$1',[student]);
    for(const table of ['public.class_members where student_id','public.submissions where student_id','public.live_participants where user_id','private.live_results where user_id','private.live_drafts where user_id','public.learning_progress where user_id'])
      assert.equal(await count(`select count(*)::integer n from ${table}=$1`,[student]),0,table);
    assert.equal(await count('select count(*)::integer n from public.classes where id=$1',[classId]),1);
  });
  await check('Deleting a teacher removes owned classes and keeps shared content without an author',async()=>{
    const authored=await count('select count(*)::integer n from public.content_items where author_id=$1',[teacher]);
    assert.ok(authored>0);
    await db.query('delete from auth.users where id=$1',[teacher]);
    assert.equal(await count('select count(*)::integer n from public.classes where teacher_id=$1',[teacher]),0);
    assert.equal(await count('select count(*)::integer n from public.live_rooms where host_id=$1',[teacher]),0);
    assert.ok(await count('select count(*)::integer n from public.content_items where author_id is null')>=authored);
    const orphan=(await db.query('select id,revision from public.content_items where author_id is null limit 1')).rows[0];
    await db.query("update public.content_items set status='draft' where id=$1",[orphan.id]);
    await assert.rejects(as(admin,"select public.review_content($1,$2,'in_review')",[orphan.id,orphan.revision]),/forbidden/);
    await db.query('delete from auth.users where id=$1',[admin]);
    assert.equal(await count('select count(*)::integer n from public.content_audit where actor_id=$1',[admin]),0);
  });
  console.log(`${checks} account lifecycle database checks passed.`);
}
