import assert from 'node:assert/strict';
import {seedVocabulary} from '../scripts/seed-vocabulary.mjs';
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
  console.log(`${checks} vocabulary database checks passed.`);
}
