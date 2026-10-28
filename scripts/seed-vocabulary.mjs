import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {migrationConnection} from './migrate.mjs';

// Upsert one syllabus word list. Reviewed rows are never overwritten; their differences are reported.
export async function seedVocabulary(db,dataset) {
  if(dataset?.format!=='hanzi-vocabulary-v1'||!Array.isArray(dataset.entries)||!dataset.entries.length||!dataset.source?.id)throw Error('Invalid vocabulary dataset.');
  const {source,syllabus}=dataset;
  const rows=JSON.stringify(dataset.entries.map(e=>({seq:e.seq,level:e.level,extra_levels:e.extraLevels,word:e.word,homograph:e.homograph,pinyin:e.pinyin,pos:e.pos,pos_extra:e.posExtra,source_page:e.page})));
  const recordset=n=>`jsonb_to_recordset($${n}::jsonb) as e(seq integer,level text,extra_levels text[],word text,homograph smallint,pinyin text,pos text[],pos_extra text[],source_page integer)`;
  const changed=`(v.level,v.extra_levels,v.word,v.homograph,v.pinyin,v.pos,v.pos_extra,v.source_page) is distinct from (e.level,e.extra_levels,e.word,e.homograph,e.pinyin,e.pos,e.pos_extra,e.source_page)`;
  await db.query('begin');
  try {
    await db.query(`insert into public.data_sources(id,title,url,sha256,license,attribution,retrieved_at) values($1,$2,$3,$4,$5,$6,$7)
      on conflict(id) do nothing`,
      [source.id,source.title,source.url,source.sha256,source.license,source.attribution,source.retrievedAt]);
    const existing=(await db.query('select sha256 from public.data_sources where id=$1 for update',[source.id])).rows[0];
    if(existing.sha256!==source.sha256)throw Error('Source content changed. Use a new source ID to preserve reviewed provenance.');
    const kept=(await db.query(`select v.seq from public.vocab_entries v join ${recordset(2)} on v.seq=e.seq where v.syllabus=$1 and v.review_status<>'draft' and ${changed} order by v.seq`,[syllabus,rows])).rows.map(r=>r.seq);
    const written=(await db.query(`insert into public.vocab_entries as v(syllabus,seq,level,extra_levels,word,homograph,pinyin,pos,pos_extra,source_id,source_page)
      select $1,e.seq,e.level,e.extra_levels,e.word,e.homograph,e.pinyin,e.pos,e.pos_extra,$2,e.source_page from ${recordset(3)}
      on conflict(syllabus,seq) do update set level=excluded.level,extra_levels=excluded.extra_levels,word=excluded.word,homograph=excluded.homograph,pinyin=excluded.pinyin,
        pos=excluded.pos,pos_extra=excluded.pos_extra,source_id=excluded.source_id,source_page=excluded.source_page
        where v.review_status='draft' and (v.level,v.extra_levels,v.word,v.homograph,v.pinyin,v.pos,v.pos_extra,v.source_page) is distinct from (excluded.level,excluded.extra_levels,excluded.word,excluded.homograph,excluded.pinyin,excluded.pos,excluded.pos_extra,excluded.source_page)
      returning (xmax=0) inserted`,[syllabus,source.id,rows])).rows;
    await db.query('commit');
    return {inserted:written.filter(r=>r.inserted).length,updated:written.filter(r=>!r.inserted).length,keptReviewed:kept};
  }catch(error){await db.query('rollback');throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    const dataset=JSON.parse(await readFile(process.argv[2]||'.sources/hsk3-2025-vocabulary.json','utf8'));
    db=new pg.Client(migrationConnection());await db.connect();
    const result=await seedVocabulary(db,dataset);
    console.log(`${dataset.syllabus}: ${result.inserted} mục mới, ${result.updated} mục nháp được cập nhật, ${result.keptReviewed.length} mục đã duyệt giữ nguyên dù nguồn khác.`);
    if(result.keptReviewed.length)console.log('序号 cần biên tập xem lại: '+result.keptReviewed.join(', '));
  }catch(error){console.error(db?`Nạp danh mục từ thất bại${/^[0-9A-Z]{5}$/.test(error.code||'')?` (SQLSTATE ${error.code})`:''}. Kiểm tra migration và kết nối database.`:error.message);process.exitCode=1;}
  finally{if(db)await db.end().catch(()=>{});}
}
