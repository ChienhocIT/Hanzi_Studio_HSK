import {test} from 'node:test';
import assert from 'node:assert/strict';
import {markedSyllable,cedictPinyin,pickGlosses} from '../scripts/cedict-glosses.mjs';
import {glossRows} from '../scripts/seed-glosses.mjs';
const entry=(pinyin,...definitions)=>({traditional:'x',simplified:'x',pinyin,definitions});
test('CEDICT numbered pinyin converts to tone marks the way the syllabus prints them',()=>{
  assert.equal(markedSyllable('hao3'),'hǎo');assert.equal(markedSyllable('gou3'),'gǒu');assert.equal(markedSyllable('nu:3'),'nǚ');
  assert.equal(markedSyllable('xiu1'),'xiū');assert.equal(markedSyllable('gui4'),'guì');assert.equal(markedSyllable('qi5'),'qi');
  assert.equal(cedictPinyin('Bei3 jing1'),'běijīng');
});
test('Glosses follow the syllabus reading and drop surname, variant and classifier noise',()=>{
  const hao=[entry('hao3','good','well'),entry('hao4','to be fond of')];
  assert.deepEqual(pickGlosses(hao,'hǎo'),['good','well']);
  assert.deepEqual(pickGlosses(hao,'hào'),['to be fond of']);
  // Tone sandhi in the syllabus (bú) still finds the entry through the toneless match.
  assert.deepEqual(pickGlosses([entry('bu4 ke4 qi5',"you're welcome")],'bú kèqi'),["you're welcome"]);
  assert.deepEqual(pickGlosses([entry('Huang2','surname Huang'),entry('huang2','yellow','CL:種|种[zhong3]','variant of 黄')],'huáng'),['yellow']);
  assert.deepEqual(pickGlosses(undefined,'ài'),[]);
  assert.equal(pickGlosses([entry('ai4','a','b','c','d','e','f')],'ài').length,4);
});
test('Gloss rows keep syllabus order and leave unknown words empty',()=>{
  const dictionary=new Map([['爱',[entry('ai4','to love')]]]);
  assert.deepEqual(glossRows({entries:[{seq:1,word:'爱',pinyin:'ài'},{seq:2,word:'做证',pinyin:'zuòzhèng'}]},dictionary),[{seq:1,gloss:['to love']},{seq:2,gloss:[]}]);
});
