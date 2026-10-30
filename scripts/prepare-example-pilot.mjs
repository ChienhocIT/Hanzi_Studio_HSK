import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseTsv,buildExamples,traditionalOnly} from './seed-examples.mjs';
import {selectExampleAudio} from './example-audio.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const dir='.sources/tatoeba/',names=['cmn_sentences_detailed.tsv.bz2','vie_sentences_detailed.tsv.bz2','cmn-vie_links.tsv.bz2'];
const bytes=await Promise.all(names.map(n=>readFile(dir+n)));
const decode=path=>execFileSync('python',['-I','-c','import bz2,sys;sys.stdout.buffer.write(bz2.decompress(open(sys.argv[1],"rb").read()))',path],{maxBuffer:1<<28}).toString('utf8');
const [cmn,vie,links]=names.map(n=>parseTsv(decode(dir+n))),dataset=JSON.parse(await readFile('.sources/hsk3-2025-vocabulary.json','utf8'));
const candidates=buildExamples({cmn,vie,links,entries:dataset.entries,traditional:traditionalOnly(gunzipSync(await readFile('.sources/cedict.txt.gz')).toString('utf8'))});
// A bounded editorial batch, never an automatic publication or language-quality approval.
const excluded=new Set([139673,1513716,4262233,1426438]);
const examples=candidates.filter(r=>r.zh.length<=14&&r.vi.length<=100&&r.zh_author&&r.vi_author&&!excluded.has(r.zh_id)&&!/特朗普|爱泼斯坦|汤姆|杀|死|烟|战争/.test(r.zh)).slice(0,50);
if(examples.length!==50)throw Error('Need 50 sourced candidates for the editorial pilot.');
const audioArchive=await readFile(dir+'sentences_with_audio.tar.bz2');
const metadata=parseTsv(execFileSync('python',['-I','-c','import tarfile,sys;t=tarfile.open(sys.argv[1]);sys.stdout.buffer.write(t.extractfile(next(m for m in t.getmembers() if m.isfile())).read())',dir+'sentences_with_audio.tar.bz2'],{maxBuffer:1<<28}).toString('utf8'));
const audio=selectExampleAudio(metadata,examples),linked=new Set(links.map(r=>r[0])),matched=metadata.filter(r=>linked.has(r[0]));
const audioAudit={linkedRecordings:matched.length,missingLicense:matched.filter(r=>!r[3]).length,noncommercialOnly:matched.filter(r=>r[3]?.includes('NC')).length,eligibleForPilot:audio.length,metadataSha256:hash(audioArchive)};
for(const row of audio){
  const response=await fetch('https://tatoeba.org/audio/download/'+row.audio_id,{signal:AbortSignal.timeout(15000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))throw Error('Audio download failed.');
  row.sha256=hash(Buffer.from(await response.arrayBuffer()));
}
const sha256=hash(Buffer.concat(bytes)),source={id:'tatoeba-pilot-'+sha256.slice(0,12),title:'Tatoeba Mandarin–Vietnamese editorial pilot',url:'https://tatoeba.org/en/downloads',sha256,license:'CC BY 2.0 FR',attribution:'Tatoeba contributors; authors and original IDs are retained per sentence.',retrievedAt:new Date().toISOString()};
const pilot={format:'hanzi-example-pilot-v1',syllabus:dataset.syllabus,reviewStatus:'draft',source,examples,audio,audioAudit,audioSource:{...source,id:'tatoeba-audio-'+hash(audioArchive).slice(0,12),sha256:hash(audioArchive),title:'Tatoeba audio rights metadata',license:'Per recording; exclude empty licenses and NC licenses'}};
await writeFile('data/tatoeba-pilot.json',JSON.stringify(pilot,null,2)+'\n');
console.log(JSON.stringify({examples:examples.length,audio:audio.length,audioAudit}));
