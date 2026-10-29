import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {migrationConnection} from './migrate.mjs';
import {managementClient} from './management-api.mjs';
import {cedictEntries} from './reference-data.mjs';
import {pickGlosses} from './cedict-glosses.mjs';
// Attach CC-CEDICT English glosses to the syllabus rows already in vocab_entries. Idempotent: only rows
// whose glosses changed are written, and review status is never touched.
export function glossRows(dataset,dictionary) {
  return dataset.entries.map(e=>({seq:e.seq,gloss:pickGlosses(dictionary.get(e.word),e.pinyin)}));
}
export async function seedGlosses(db,syllabus,source,rows) {
  await db.query(`insert into public.data_sources(id,title,url,sha256,license,attribution,retrieved_at) values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do nothing`,
    [source.id,source.title,source.url,source.sha256,source.license,source.attribution,source.retrievedAt]);
  const changed=await db.query(`update public.vocab_entries v set gloss_en=e.gloss,gloss_source_id=$2
    from jsonb_to_recordset($3::jsonb) as e(seq integer,gloss text[])
    where v.syllabus=$1 and v.seq=e.seq and (v.gloss_en,v.gloss_source_id) is distinct from (e.gloss,$2) returning v.seq`,[syllabus,source.id,JSON.stringify(rows)]);
  return changed.rows.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    const dataset=JSON.parse(await readFile('.sources/hsk3-2025-vocabulary.json','utf8'));
    const archive=await readFile('.sources/cedict.txt.gz'),text=gunzipSync(archive).toString('utf8');
    const date=text.match(/^#! date=(\S+)/m)?.[1];
    if(!date)throw Error('Tệp CC-CEDICT thiếu dòng "#! date=". Chạy lại npm run data:import-reference để tải bản mới.');
    const source={id:`cc-cedict-${date.slice(0,10)}`,title:'CC-CEDICT',url:'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
      sha256:createHash('sha256').update(archive).digest('hex'),license:'CC BY-SA 4.0',
      attribution:'CC-CEDICT contributors, distributed by MDBG; original CEDICT by Paul Denisowski.',retrievedAt:date};
    const rows=glossRows(dataset,cedictEntries(text));
    const direct=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
    if(direct){db=new pg.Client(migrationConnection());await db.connect();}else db=managementClient().database;
    let changed=0;
    for(let i=0;i<rows.length;i+=1000)changed+=await seedGlosses(db,dataset.syllabus,source,rows.slice(i,i+1000));
    const covered=rows.filter(r=>r.gloss.length).length;
    console.log(`${dataset.syllabus}: ${covered}/${rows.length} mục có nghĩa CC-CEDICT, ${changed} mục được cập nhật.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
  finally{if(db?.end)await db.end().catch(()=>{});}
}
