import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {cedictEntries,joinReference} from './reference-data.mjs';
const revisions=[79426444,79426451,79426457,79426548,79426556,79426627];
const headers={'User-Agent':'HanziStudio/4.2 (reference data import; https://github.com/ChienhocIT/Hanzi_Studio_HSK)'};
const sha=data=>createHash('sha256').update(data).digest('hex');
await mkdir('.sources',{recursive:true});await mkdir('data',{recursive:true});
const pages=[];
for(const [i,revision] of revisions.entries()) {
  const url=`https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp%7Ccontent&rvslots=main&revids=${revision}&format=json`;
  const path=`.sources/wiktionary-${revision}.json`;
  let raw;
  try{raw=await readFile(path);}catch{const r=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Wiki HTTP ${r.status}`);raw=Buffer.from(await r.arrayBuffer());await writeFile(path,raw);}
  const page=Object.values(JSON.parse(raw).query.pages)[0];const saved=page.revisions[0];
  if(saved.revid!==revision||!page.title.endsWith(`level ${i+1}`))throw Error('Unexpected wiki revision/title');
  pages.push({level:String(i+1),revision,title:page.title,timestamp:saved.timestamp,text:saved.slots.main['*'],sha256:sha(raw),url:`https://en.wiktionary.org/w/index.php?oldid=${revision}`,history:`https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`});
}
const dictionaryUrl='https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
let archive;
try{archive=await readFile('.sources/cedict.txt.gz');}catch{const r=await fetch(dictionaryUrl,{headers,signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`CEDICT HTTP ${r.status}`);archive=Buffer.from(await r.arrayBuffer());await writeFile('.sources/cedict.txt.gz',archive);}
const dictionary=gunzipSync(archive).toString('utf8');
const expectedDictionarySha='366f39049fbcc9ca0cc414f319bfc56a33f6f9aba73aec1f609c5cb6502d2000';
if(sha(archive)!==expectedDictionarySha)throw Error('CC-CEDICT snapshot changed. Review upstream release and update the pinned hash explicitly before replacing shipped data.');
const words=joinReference(pages,cedictEntries(dictionary));
if(words.length<4900||words.length>5100)throw Error('Unexpected corpus size; review source changes before publishing.');
const metadata={format:'hanzi-reference-v1',syllabus:'HSK 2.0 (community reference; not HSK 3.0)',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',generatedAt:new Date().toISOString(),
  attribution:'HSK wordlists: Wiktionary contributors. Dictionary: CC-CEDICT contributors, distributed by MDBG; original CEDICT by Paul Denisowski.',
  modifications:'Extracted headwords from six pinned Wiktionary revisions, deduplicated within levels, joined by exact simplified spelling to CC-CEDICT. Kept all dictionary pronunciations and senses. No generated translations or HSK 3.0 mapping.',
  sources:pages.map(({text,...page})=>page),dictionary:{url:dictionaryUrl,sha256:sha(archive),header:dictionary.split(/\r?\n/).filter(line=>line.startsWith('#')).slice(0,40)},
  counts:Object.fromEntries(pages.map(p=>[p.level,words.filter(w=>w.level===p.level).length])),missingDefinitions:words.filter(w=>!w.entries.length).map(w=>({word:w.word,level:w.level})),count:words.length};
await writeFile('data/hsk2-reference.json',JSON.stringify({...metadata,words}));
await writeFile('data/hsk2-provenance.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({count:words.length,levels:metadata.counts,missingDefinitions:metadata.missingDefinitions.length,dictionarySha256:metadata.dictionary.sha256}));
