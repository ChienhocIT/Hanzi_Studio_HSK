import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wikiWords,cedictEntries,joinReference} from '../scripts/reference-data.mjs';
import {readFileSync} from 'node:fs';
test('Reference import extracts headwords only and preserves dictionary polysemy',()=>{
  assert.deepEqual(wikiWords('*[[好]]\n* [[学习#Chinese|学习]]\nnot [[导入]]\n[[Category:Mandarin]]'),['好','学习']);
  const dictionary=cedictEntries('# Header\n好 好 [hao3] /good/well/\n好 好 [hao4] /to like/\n好 好 [hao3] /good/well/\nmalformed');
  assert.equal(dictionary.get('好').length,2);
  const words=joinReference([{level:'1',revision:1,text:'*[[好]]\n*[[好]]\n*[[缺词]]'}],dictionary);
  assert.equal(words.length,2);assert.equal(words[0].entries.length,2);assert.equal(words[1].entries.length,0);
  assert.equal(words[0].reviewStatus,'unreviewed');assert.match(words[0].syllabus,/2.0/);
});
test('Shipped reference data preserves pinned lineage, unreviewed labels and dictionary omissions',()=>{
  const data=JSON.parse(readFileSync('data/hsk2-reference.json','utf8'));
  assert.equal(data.words.length,4997);assert.equal(data.count,4997);assert.equal(data.license,'CC-BY-SA-4.0');
  assert.deepEqual(data.counts,{'1':150,'2':149,'3':298,'4':600,'5':1300,'6':2500});
  assert.equal(new Set(data.words.map(w=>w.id)).size,data.words.length);
  assert.equal(data.sources.length,6);assert.match(data.dictionary.sha256,/^[a-f0-9]{64}$/);
  assert.equal(data.words.filter(w=>w.entries.length===0).length,data.missingDefinitions.length);
  assert.ok(data.words.every(w=>w.reviewStatus==='unreviewed'&&data.sources.some(s=>s.revision===w.sourceRevision&&s.level===w.level)));
  for(const word of data.words)for(const entry of word.entries){assert.equal(entry.simplified,word.word);assert.ok(entry.pinyin);assert.ok(entry.definitions.every(x=>typeof x==='string'&&x.length>0));}
});
