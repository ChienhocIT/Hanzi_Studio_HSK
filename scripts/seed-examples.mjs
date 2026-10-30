import pg from 'pg';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {migrationConnection} from './migrate.mjs';
import {managementClient} from './management-api.mjs';
// Chinese–Vietnamese example sentences from Tatoeba, attached to syllabus words as drafts for an administrator
// to review. Only new rows are inserted: re-running never changes a reviewed (or still pending) sentence.
export function parseTsv(text) { return text.split('\n').filter(Boolean).map(line=>line.replace(/\r$/,'').split('\t')); }
// Characters that only appear on the traditional side of CC-CEDICT, used to skip traditional-script sentences.
export function traditionalOnly(cedictText) {
  const traditional=new Set(),simplified=new Set();
  for(const line of cedictText.split(/\r?\n/)) {
    const match=!line.startsWith('#')&&line.match(/^(\S+) (\S+) \[/);if(!match)continue;
    const t=[...match[1]],s=[...match[2]];s.forEach(ch=>simplified.add(ch));
    if(t.length===s.length)t.forEach((ch,i)=>{if(ch!==s[i])traditional.add(ch);});
  }
  simplified.forEach(ch=>traditional.delete(ch));
  return traditional;
}
// Splits a sentence into syllabus words by longest match from the left, so 爱 is not found inside 爱好.
export function segment(text,words,maxWord=8) {
  const chars=[...text],found=[];
  for(let i=0;i<chars.length;) {
    let length=Math.min(maxWord,chars.length-i);
    while(length>1&&!words.has(chars.slice(i,i+length).join('')))length--;
    const piece=chars.slice(i,i+length).join('');if(words.has(piece))found.push(piece);i+=length;
  }
  return found;
}
// Each Chinese sentence (one Vietnamese translation, the oldest) goes to the longest syllabus word in it, earliest in
// the syllabus on a tie, skipping words that already have perWord examples. Shorter sentences go first.
export function buildExamples({links,cmn,vie,entries,traditional,perWord=2,maxLength=40}) {
  const sentence=(rows,language)=>new Map(rows.filter(([id,lang,text])=>Number.isSafeInteger(Number(id))&&Number(id)>0&&lang===language&&text?.trim()).map(([id,,text,user])=>[Number(id),{text:text.trim(),author:user&&user!=='\\N'?user:null}]));
  const zh=sentence(cmn,'cmn'),vi=sentence(vie,'vie'),pairs=new Map();
  for(const [a,b] of links) {
    const z=Number(a),v=Number(b);
    if(zh.has(z)&&vi.has(v)&&(!pairs.has(z)||v<pairs.get(z)))pairs.set(z,v);
  }
  const bySeq=[...entries].sort((a,b)=>a.seq-b.seq),words=new Map(),used=new Map(),rows=[];
  for(const e of bySeq)words.set(e.word,[...(words.get(e.word)||[]),e]);
  const order=[...pairs.keys()].sort((a,b)=>[...zh.get(a).text].length-[...zh.get(b).text].length||a-b);
  for(const z of order) {
    const text=zh.get(z).text;
    if(!text||[...text].length>maxLength||!/\p{Script=Han}/u.test(text)||[...text].some(ch=>traditional.has(ch)))continue;
    const candidates=[...new Set(segment(text,words))].sort((a,b)=>[...b].length-[...a].length||words.get(a)[0].seq-words.get(b)[0].seq).flatMap(w=>words.get(w));
    const word=candidates.find(w=>(used.get(w.seq)||0)<perWord);if(!word)continue;
    used.set(word.seq,(used.get(word.seq)||0)+1);
    const v=pairs.get(z);
    rows.push({seq:word.seq,zh_id:z,zh:text,zh_author:zh.get(z).author,vi_id:v,vi:vi.get(v).text,vi_author:vi.get(v).author});
  }
  return rows.sort((a,b)=>a.seq-b.seq||a.zh_id-b.zh_id);
}
export async function seedExamples(db,syllabus,source,rows) {
  const registered=await db.query(`insert into public.data_sources as s(id,title,url,sha256,license,attribution,retrieved_at) values($1,$2,$3,$4,$5,$6,$7)
    on conflict(id) do update set id=excluded.id where s.sha256=excluded.sha256 returning id`,
    [source.id,source.title,source.url,source.sha256,source.license,source.attribution,source.retrievedAt]);
  if(!registered.rows.length)throw Error('Source content changed. Use a new source ID to preserve reviewed provenance.');
  const inserted=await db.query(`insert into public.example_sentences(syllabus,seq,zh_id,zh,zh_author,vi_id,vi,vi_author,license,source_id)
    select $1,e.seq,e.zh_id,e.zh,e.zh_author,e.vi_id,e.vi,e.vi_author,'CC BY 2.0 FR',$2
    from jsonb_to_recordset($3::jsonb) as e(seq integer,zh_id integer,zh text,zh_author text,vi_id integer,vi text,vi_author text)
    join public.vocab_entries v on v.syllabus=$1 and v.seq=e.seq
    on conflict do nothing returning seq`,[syllabus,source.id,JSON.stringify(rows)]);
  return inserted.rows.length;
}
const BASE='https://downloads.tatoeba.org/exports/per_language/',DIR='.sources/tatoeba';
const FILES=['cmn/cmn_sentences_detailed.tsv.bz2','vie/vie_sentences_detailed.tsv.bz2','cmn/cmn-vie_links.tsv.bz2'];
const bunzip=file=>execFileSync('python',['-I','-c','import bz2,sys;sys.stdout.buffer.write(bz2.decompress(open(sys.argv[1],"rb").read()))',file],{maxBuffer:1<<28}).toString('utf8');
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let db;
  try {
    await mkdir(DIR,{recursive:true});
    for(const file of FILES) {
      const target=`${DIR}/${file.split('/').pop()}`;if(existsSync(target))continue;
      const response=await fetch(BASE+file);if(!response.ok)throw Error(`Không tải được ${BASE+file} (HTTP ${response.status}).`);
      await writeFile(target,Buffer.from(await response.arrayBuffer()));
    }
    const paths=FILES.map(file=>`${DIR}/${file.split('/').pop()}`),hash=createHash('sha256');
    for(const path of paths)hash.update(await readFile(path));
    const retrieved=(await stat(paths[0])).mtime.toISOString();
    const [cmn,vie,links]=paths.map(path=>parseTsv(bunzip(path)));
    const dataset=JSON.parse(await readFile('.sources/hsk3-2025-vocabulary.json','utf8'));
    const traditional=traditionalOnly(gunzipSync(await readFile('.sources/cedict.txt.gz')).toString('utf8'));
    const rows=buildExamples({links,cmn,vie,entries:dataset.entries,traditional});
    console.log(`${links.length} liên kết Trung–Việt → ${rows.length} câu ví dụ cho ${new Set(rows.map(r=>r.seq)).size} từ.`);
    if(process.argv.includes('--dry-run')){for(const r of rows.slice(0,10))console.log(`${r.seq}\t${r.zh}\t${r.vi}`);process.exit(0);}
    const source={id:`tatoeba-${retrieved.slice(0,10)}`,title:'Tatoeba (câu Mandarin–Việt)',url:'https://tatoeba.org/en/downloads',sha256:hash.digest('hex'),
      license:'CC BY 2.0 FR',attribution:'Tatoeba contributors (tatoeba.org); tác giả từng câu lưu trong example_sentences.',retrievedAt:retrieved};
    const direct=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
    if(direct){db=new pg.Client(migrationConnection());await db.connect();}else db=managementClient().database;
    console.log(`${dataset.syllabus}: thêm ${await seedExamples(db,dataset.syllabus,source,rows)} câu nháp mới (câu đã có giữ nguyên).`);
  }catch(error){console.error(error.message);process.exitCode=1;}
  finally{if(db?.end)await db.end().catch(()=>{});}
}
