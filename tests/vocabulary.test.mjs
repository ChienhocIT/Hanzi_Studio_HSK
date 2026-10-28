import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLevel,parsePos,normalizeRow,verifyVocabulary} from '../scripts/hsk3-vocabulary.mjs';
const row=(seq,level,word,pinyin='hǎo',pos='形')=>({seq,page:80,level,word,pinyin,pos});
test('Syllabus levels and parts of speech keep base and additional senses apart',()=>{
  assert.deepEqual(parseLevel('1（2）（4）'),{level:'1',extraLevels:['2','4']});
  assert.deepEqual(parseLevel('3（7-9）'),{level:'3',extraLevels:['7-9']});
  assert.equal(parseLevel('10'),null);assert.equal(parseLevel(''),null);
  assert.deepEqual(parsePos('形、介、（动、量）'),{pos:['形','介'],posExtra:['动','量']});
  assert.deepEqual(parsePos(''),{pos:[],posExtra:[]});
});
test('Rows split homograph numbers and repair a 等级 bracket spilled into 词语',()=>{
  const book=normalizeRow(row(10,'1','本1','běn','量'));
  assert.equal(book.word,'本');assert.equal(book.homograph,1);assert.deepEqual(book.problems,[]);
  const spilled=normalizeRow(row(895,'3（4）（7-9','）像','xiàng','动、（副）、（名）'));
  assert.equal(spilled.word,'像');assert.deepEqual(spilled.extraLevels,['4','7-9']);assert.deepEqual(spilled.problems,[]);
  assert.equal(normalizeRow(row(14,'1','不客气','bú kèqi','')).problems.length,0);
  assert.ok(normalizeRow(row(1,'2（1）','好')).problems.length);
  assert.ok(normalizeRow(row(1,'1','好','好')).problems.length);
});
test('Verification stops on missing 序号, level blocks or counts that differ from the syllabus',()=>{
  const expected={'1':2,'2':1,'3':0,'4':0,'5':0,'6':0,'7-9':0};
  const good=[row(1,'1','爱'),row(2,'1','八'),row(3,'2','吧')].map(normalizeRow);
  assert.deepEqual(verifyVocabulary(good,expected).errors,[]);
  assert.ok(verifyVocabulary(good.slice(0,2),expected).errors.length);
  assert.ok(verifyVocabulary([good[0],{...good[1],seq:4},good[2]],expected).errors.length);
  assert.ok(verifyVocabulary([good[0],{...good[1],level:'2'},good[2]],expected).errors.length);
});
