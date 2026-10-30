import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {migrationConnection} from './migrate.mjs';
import {managementClient} from './management-api.mjs';
export const AUDIO_LICENSES=['CC0 1.0','CC BY 2.0','CC BY 2.0 FR','CC BY 3.0','CC BY 4.0'];
export function selectExampleAudio(metadata,examples,limit=20){
  const byId=new Map(examples.map(r=>[r.zh_id,r])),seen=new Set(),rows=[];
  for(const [sentence,audio,author,license,url]of metadata){
    const example=byId.get(Number(sentence)),audioId=Number(audio);
    if(!example||!Number.isSafeInteger(audioId)||audioId<1||seen.has(Number(sentence))||!AUDIO_LICENSES.includes(license)||!author||author==='\\N'||!url||!/^https:\/\/tatoeba\.org\//.test(url))continue;
    seen.add(Number(sentence));rows.push({seq:example.seq,zh_id:example.zh_id,audio_id:audioId,author,license,attribution_url:url});
    if(rows.length===limit)break;
  }
  return rows;
}
export async function seedExampleAudio(db,syllabus,source,rows){
  for(const row of rows)if(!AUDIO_LICENSES.includes(row.license)||!/^https:\/\/tatoeba\.org\//.test(row.attribution_url)||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('Audio rights or snapshot hash missing.');
  const registered=await db.query(`insert into public.data_sources as s(id,title,url,sha256,license,attribution,retrieved_at) values($1,$2,$3,$4,$5,$6,$7)
    on conflict(id) do update set id=excluded.id where s.sha256=excluded.sha256 returning id`,[source.id,source.title,source.url,source.sha256,source.license,source.attribution,source.retrievedAt]);
  if(!registered.rows.length)throw Error('Source content changed. Use a new source ID.');
  const result=await db.query(`insert into public.example_audio(syllabus,seq,zh_id,audio_id,author,license,attribution_url,sha256,source_id)
    select $1,r.seq,r.zh_id,r.audio_id,r.author,r.license,r.attribution_url,r.sha256,$2 from jsonb_to_recordset($3::jsonb) r(seq integer,zh_id integer,audio_id integer,author text,license text,attribution_url text,sha256 text)
    join public.example_sentences e on e.syllabus=$1 and e.seq=r.seq and e.zh_id=r.zh_id on conflict do nothing returning audio_id`,[syllabus,source.id,JSON.stringify(rows)]);
  return result.rows.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  let db;
  try{
    const pilot=JSON.parse(await readFile('data/tatoeba-pilot.json','utf8'));
    console.log(`Pilot: ${pilot.audio.length} audio có giấy phép cho phép tái sử dụng và hash.`);
    if(process.argv.includes('--dry-run')||!pilot.audio.length){console.log('Không ghi database. Không thay audio thiếu quyền bằng TTS rồi gắn nhãn bản ghi nguồn.');}
    else{
      const direct=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
      if(direct){db=new pg.Client(migrationConnection());await db.connect();}else db=managementClient().database;
      console.log(`Thêm ${await seedExampleAudio(db,pilot.syllabus,pilot.audioSource,pilot.audio)} audio nháp.`);
    }
  }catch(error){console.error(error.message);process.exitCode=1;}finally{if(db?.end)await db.end().catch(()=>{});}
}
