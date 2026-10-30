import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const base='node_modules/hanzi-writer-data',target='data/strokes';
const wordsBytes=await readFile('words.json'),words=JSON.parse(wordsBytes),files=new Set(await readdir(base));
const chars=words=>[...new Set([...words.join('')].filter(ch=>/\p{Script=Han}/u.test(ch)))];
const coverage=(name,words,sourceHash)=>{const all=chars(words),missing=all.filter(ch=>!files.has(ch+'.json'));return {name,sourceSha256:sourceHash,words:words.length,characters:all.length,available:all.length-missing.length,missing};};
const manifest={format:'hanzi-stroke-snapshot-v1',package:'hanzi-writer-data@2.0.1',license:'Arphic Public License',source:'https://github.com/chanind/hanzi-writer-data/tree/v2.0.1',characters:{},coverage:[coverage('HSK 3 nghĩa Việt',words.map(w=>w.hz),digest(wordsBytes))]};
try{const bytes=await readFile('.sources/hsk3-2025-vocabulary.json');const dataset=JSON.parse(bytes);manifest.coverage.push(coverage(dataset.syllabus,dataset.entries.map(e=>e.word),digest(bytes)));}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(target,{recursive:true});
for(const ch of chars(words.map(w=>w.hz)).filter(ch=>files.has(ch+'.json')).slice(0,50)){
  const bytes=await readFile(`${base}/${ch}.json`),file=ch.codePointAt(0).toString(16)+'.json';
  await writeFile(`${target}/${file}`,bytes);
  manifest.characters[ch]={file,sha256:digest(bytes),strokes:JSON.parse(bytes).strokes.length};
}
await copyFile(`${base}/ARPHICPL.TXT`,`${target}/ARPHICPL.TXT`);
await writeFile(`${target}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({shipped:Object.keys(manifest.characters).length,coverage:manifest.coverage}));
