import assert from 'node:assert/strict';
import {seedVocabulary} from '../scripts/seed-vocabulary.mjs';
import {seedExamples} from '../scripts/seed-examples.mjs';
import {seedExampleAudio} from '../scripts/example-audio.mjs';
export async function exerciseVocabulary(db) {
  const student='00000000-0000-4000-8000-000000000001',teacher='00000000-0000-4000-8000-000000000003',admin='00000000-0000-4000-8000-000000000004';
  async function as(id,sql,args=[]) {
    await db.query('begin');
    try {
      await db.query(id?'set local role authenticated':'set local role anon');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
      const result=await db.query(sql,args);await db.query('commit');return result;
    }catch(error){await db.query('rollback');throw error;}
  }
  let checks=0;
  const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
  const entry=(seq,word,pinyin,level='1')=>({seq,page:80,level,extraLevels:[],word,homograph:null,pinyin,pos:['动'],posExtra:[]});
  const dataset={format:'hanzi-vocabulary-v1',syllabus:'HSK 3.0 (CLEC 2025)',
    source:{id:'fixture-syllabus',title:'Fixture syllabus',url:'https://example.com/fixture.pdf',sha256:'a'.repeat(64),license:'Fixture only',attribution:'Fixture',retrievedAt:'2026-10-29T00:00:00Z'},
    entries:[entry(1,'爱','ài'),entry(2,'八','bā'),entry(3,'吧','ba','2')]};
  const listed='select seq from public.vocab_entries order by seq';
  await check('Vocabulary seed inserts once and is idempotent',async()=>{
    assert.deepEqual(await seedVocabulary(db,dataset),{inserted:3,updated:0,keptReviewed:[]});
    assert.deepEqual(await seedVocabulary(db,dataset),{inserted:0,updated:0,keptReviewed:[]});
    await assert.rejects(seedVocabulary(db,{...dataset,entries:[{...entry(4,'abc','abc')}]}));
    assert.equal((await db.query('select count(*)::integer n from public.vocab_entries')).rows[0].n,3);
  });
  await check('Learners see only published words; teachers see drafts; anonymous users see nothing',async()=>{
    assert.equal((await as(student,listed)).rowCount,0);
    assert.equal((await as(teacher,listed)).rowCount,3);
    await assert.rejects(as(null,listed),/permission denied/);
    assert.equal((await as(student,'select * from public.data_sources')).rowCount,1);
  });
  await check('Only administrators publish words and direct writes are forbidden',async()=>{
    const review="select public.review_vocab_entries('HSK 3.0 (CLEC 2025)',$1,'published') n";
    await assert.rejects(as(teacher,review,[[1]]),/admin_required/);
    await assert.rejects(as(student,"update public.vocab_entries set review_status='published'"),/permission denied/);
    await assert.rejects(as(teacher,"insert into public.data_sources(id,title,url,sha256,license,attribution,retrieved_at) values('x-forged','x','https://x.test',repeat('a',64),'x','x',now())"),/permission denied/);
    await assert.rejects(as(admin,"select public.review_vocab_entries('HSK 3.0 (CLEC 2025)',$1,'approved')",[[1]]),/invalid_transition/);
    assert.equal((await as(admin,review,[[1,2]])).rows[0].n,2);
    assert.deepEqual((await as(student,listed)).rows.map(r=>r.seq),[1,2]);
  });
  await check('Re-import updates drafts but never overwrites reviewed words',async()=>{
    const changed={...dataset,entries:[entry(1,'爱','ài','2'),entry(2,'八','bā'),entry(3,'吧','bā','2')]};
    assert.deepEqual(await seedVocabulary(db,changed),{inserted:0,updated:1,keptReviewed:[1]});
    const rows=(await db.query('select seq,level,pinyin,review_status from public.vocab_entries order by seq')).rows;
    assert.equal(rows[0].level,'1');assert.equal(rows[0].review_status,'published');assert.equal(rows[2].pinyin,'bā');
    await assert.rejects(seedVocabulary(db,{...dataset,source:{...dataset.source,sha256:'b'.repeat(64)}}),/Source content changed/);
    assert.equal((await db.query('select sha256 from public.data_sources where id=$1',[dataset.source.id])).rows[0].sha256,'a'.repeat(64));
  });
  await check('Example sentences load as drafts, only administrators publish them and re-import keeps reviews',async()=>{
    const source={id:'fixture-tatoeba',title:'Fixture Tatoeba',url:'https://example.com/tatoeba',sha256:'c'.repeat(64),license:'CC BY 2.0 FR',attribution:'Fixture',retrievedAt:'2026-10-30T00:00:00Z'};
    const row=(seq,zh_id,zh)=>({seq,zh_id,zh,zh_author:'amy',vi_id:zh_id+1000,vi:'Câu '+zh_id,vi_author:null});
    const rows=[row(1,11,'我爱你。'),row(2,12,'八个人。'),row(99,13,'不在大纲。')];
    assert.equal(await seedExamples(db,dataset.syllabus,source,rows),2);
    assert.equal(await seedExamples(db,dataset.syllabus,source,rows),0);
    const examples='select seq,zh_id from public.example_sentences order by zh_id';
    assert.equal((await as(student,examples)).rowCount,0);
    assert.equal((await as(teacher,examples)).rowCount,2);
    await assert.rejects(as(null,examples),/permission denied/);
    const review="select public.review_example_sentences($1,$2,$3,$4) n";
    await assert.rejects(as(teacher,review,[dataset.syllabus,1,[11],'published']),/admin_required/);
    await assert.rejects(as(student,"update public.example_sentences set review_status='published'"),/permission denied/);
    await assert.rejects(as(admin,review,[dataset.syllabus,1,[11],'approved']),/invalid_transition/);
    await assert.rejects(as(admin,review,[dataset.syllabus,1,[11],null]),/invalid_transition/);
    await assert.rejects(as(admin,review,[dataset.syllabus,1,[],'published']),/invalid_selection/);
    await assert.rejects(as(admin,review,[dataset.syllabus,1,null,'published']),/invalid_selection/);
    assert.equal((await as(admin,review,[dataset.syllabus,1,[11,12],'published'])).rows[0].n,1);
    assert.deepEqual((await as(student,examples)).rows,[{seq:1,zh_id:11}]);
    assert.equal(await seedExamples(db,dataset.syllabus,source,[{...rows[0],zh:'改过的句子。'}]),0);
    const kept=(await db.query('select zh,review_status,reviewer_id from public.example_sentences where zh_id=11')).rows[0];
    assert.equal(kept.zh,'我爱你。');assert.equal(kept.review_status,'published');assert.equal(kept.reviewer_id,admin);
    await assert.rejects(seedExamples(db,dataset.syllabus,{...source,sha256:'d'.repeat(64)},rows),/Source content changed/);
    assert.equal((await as(admin,review,[dataset.syllabus,1,[11],'rejected'])).rows[0].n,1);
    assert.equal((await as(student,examples)).rowCount,0);
    await as(admin,review,[dataset.syllabus,1,[11],'draft']);
    const reset=(await db.query('select reviewer_id,reviewed_at from public.example_sentences where zh_id=11')).rows[0];
    assert.deepEqual(reset,{reviewer_id:null,reviewed_at:null});
  });
  await check('Question reports preserve author isolation, reject invalid snapshots and require admin resolution',async()=>{
    const sql='select public.report_vocab_question($1,$2,$3,$4,$5::jsonb,$6) id',args=[1,'meaning','ambiguous','Two choices overlap',JSON.stringify(['one','two','three','four']),0];
    await assert.rejects(as(null,sql,args),/permission denied/);
    await assert.rejects(as(student,sql,[...args.slice(0,4),'{}',0]),/invalid_report/);
    await assert.rejects(as(student,sql,[3,...args.slice(1)]),/entry_unavailable/);
    await assert.rejects(as(student,sql,[1,'forged',...args.slice(2)]),/invalid_report/);
    const id=(await as(student,sql,args)).rows[0].id;
    assert.equal((await as(student,sql,args)).rows[0].id,id);
    assert.equal((await as('00000000-0000-4000-8000-000000000002','select * from public.vocab_reports')).rowCount,0);
    assert.equal((await as(teacher,'select * from public.vocab_reports')).rowCount,0);
    assert.equal((await as(admin,'select * from public.vocab_reports')).rowCount,1);
    await assert.rejects(as(student,"update public.vocab_reports set status='resolved'"),/permission denied/);
    const resolve='select public.resolve_vocab_report($1,$2) n';
    await assert.rejects(as(student,resolve,[id,'Checked']),/admin_required/);
    await assert.rejects(as(teacher,resolve,[id,'Checked']),/admin_required/);
    await assert.rejects(as(admin,resolve,[id,' ']),/review_note_required/);
    assert.equal((await as(admin,resolve,[id,'Checked; keep editorial review separate'])).rows[0].n,1);
    assert.equal((await as(admin,resolve,[id,'Repeated check'])).rows[0].n,0);
    assert.equal((await as(student,'select status from public.vocab_reports where id=$1',[id])).rows[0].status,'resolved');
  });
  await check('Report rate limits remain enforced after previous reports are resolved',async()=>{
    for(let i=1;i<20;i++){
      const id=(await as(student,"select public.report_vocab_question(1,'pinyin','incorrect','check', '[\"a\",\"b\",\"c\",\"d\"]',0) id")).rows[0].id;
      await as(admin,"select public.resolve_vocab_report($1,'Reviewed')",[id]);
    }
    await assert.rejects(as(student,"select public.report_vocab_question(1,'pinyin','incorrect','check','[\"a\",\"b\",\"c\",\"d\"]',0)"),/report_quota/);
  });
  await check('Licensed audio is idempotent, admin reviewed and hidden when its sentence is withdrawn',async()=>{
    const source={...dataset.source,id:'fixture-audio',sha256:'e'.repeat(64),license:'Per recording'};
    const row={seq:1,zh_id:11,audio_id:71,author:'fixture-reader',license:'CC BY 4.0',attribution_url:'https://tatoeba.org/en/audio/of/fixture-reader',sha256:'f'.repeat(64)};
    assert.equal(await seedExampleAudio(db,dataset.syllabus,source,[row]),1);
    assert.equal(await seedExampleAudio(db,dataset.syllabus,source,[row]),0);
    await assert.rejects(seedExampleAudio(db,dataset.syllabus,source,[{...row,license:'CC BY-NC 4.0'}]),/rights/);
    const list='select audio_id from public.example_audio';
    await assert.rejects(as(null,list),/permission denied/);
    assert.equal((await as(student,list)).rowCount,0);assert.equal((await as(teacher,list)).rowCount,1);
    const review='select public.review_example_audio($1,1,11,71,$2) n';
    await assert.rejects(as(teacher,review,[dataset.syllabus,'published']),/admin_required/);
    await assert.rejects(as(admin,review,[dataset.syllabus,'published']),/publish_sentence_first/);
    await assert.rejects(as(student,"update public.example_audio set review_status='published'"),/permission denied/);
    await as(admin,"select public.review_example_sentences($1,1,array[11],'published')",[dataset.syllabus]);
    assert.equal((await as(admin,review,[dataset.syllabus,'published'])).rows[0].n,1);
    assert.equal((await as(student,list)).rowCount,1);
    await seedExampleAudio(db,dataset.syllabus,source,[{...row,author:'changed'}]);
    assert.equal((await db.query('select author from public.example_audio where audio_id=71')).rows[0].author,'fixture-reader');
    await as(admin,"select public.review_example_sentences($1,1,array[11],'draft')",[dataset.syllabus]);
    assert.equal((await as(student,list)).rowCount,0);
  });
  console.log(`${checks} vocabulary database checks passed.`);
}
