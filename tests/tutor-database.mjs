import assert from 'node:assert/strict';
import {seedGlosses} from '../scripts/seed-glosses.mjs';
// Runs before the lifecycle suite, which deletes the fixture accounts.
export async function exerciseTutor(db) {
  const student='00000000-0000-4000-8000-000000000001',outsider='00000000-0000-4000-8000-000000000002';
  async function as(id,sql,args=[]) {
    await db.query('begin');
    try {
      await db.query(id?'set local role authenticated':'set local role anon');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
      const result=await db.query(sql,args);await db.query('commit');return result;
    }catch(error){await db.query('rollback');throw error;}
  }
  let checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  await check('Tutor quota allows 30 messages per learner per day, then refuses',async()=>{
    assert.equal((await as(student,'select public.tutor_quota_left() n')).rows[0].n,30);
    // Each message must wait 3 seconds; age the last one instead of sleeping.
    const age=()=>db.query("update public.tutor_usage set last_at=last_at-interval '4 seconds' where user_id=$1",[student]);
    assert.equal((await as(student,'select public.consume_tutor_quota() n')).rows[0].n,29);
    await assert.rejects(as(student,'select public.consume_tutor_quota()'),/tutor_rate_limited/);
    for(let i=28;i>=0;i--){await age();assert.equal((await as(student,'select public.consume_tutor_quota() n')).rows[0].n,i);}
    await age();
    await assert.rejects(as(student,'select public.consume_tutor_quota()'),/tutor_quota_exceeded/);
    assert.equal((await as(student,'select public.tutor_quota_left() n')).rows[0].n,0);
    assert.equal((await as(outsider,'select public.tutor_quota_left() n')).rows[0].n,30);
  });
  await check('Learners read only their own usage and cannot write it directly',async()=>{
    assert.equal((await as(outsider,'select * from public.tutor_usage')).rowCount,0);
    assert.equal((await as(student,'select used from public.tutor_usage')).rows[0].used,30);
    await assert.rejects(as(student,"update public.tutor_usage set used=0"),/permission denied/);
    await assert.rejects(as(null,'select public.consume_tutor_quota()'),/permission denied/);
  });
  await check('Gloss seeding is idempotent and keeps review status',async()=>{
    const row=(await db.query("select seq,review_status from public.vocab_entries where syllabus='HSK 3.0 (CLEC 2025)' order by seq limit 1")).rows[0];
    const source={id:'fixture-gloss',title:'Fixture dictionary',url:'https://example.com/dict',sha256:'b'.repeat(64),license:'CC BY-SA 4.0',attribution:'Fixture',retrievedAt:'2026-10-28T00:00:00Z'};
    assert.equal(await seedGlosses(db,'HSK 3.0 (CLEC 2025)',source,[{seq:row.seq,gloss:['to love']}]),1);
    assert.equal(await seedGlosses(db,'HSK 3.0 (CLEC 2025)',source,[{seq:row.seq,gloss:['to love']}]),0);
    const after=(await db.query('select review_status,gloss_en,gloss_source_id from public.vocab_entries where seq=$1',[row.seq])).rows[0];
    assert.deepEqual([after.review_status,after.gloss_en,after.gloss_source_id],[row.review_status,['to love'],'fixture-gloss']);
    await assert.rejects(db.query("update public.vocab_entries set gloss_en=array['1','2','3','4','5','6','7','8','9'] where seq=$1",[row.seq]),/check/);
  });
  console.log(`${checks} tutor database checks passed.`);
}
