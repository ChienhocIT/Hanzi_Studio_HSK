import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vocabularyQuiz} from '../src/vocabulary-quiz.js';
const words=['爱','书','水','猫','狗','人'];
const rows=words.map((word,i)=>({seq:i+1,word,pinyin:'reading'+i,gloss_en:['meaning '+i],review_status:'published'}));
test('Vocabulary practice has unique questions and four distinct options with one correct meaning',()=>{
  const questions=vocabularyQuiz([...rows,{...rows[0]}],{limit:4});
  assert.equal(questions.length,4);assert.equal(new Set(questions.map(q=>q.seq)).size,4);
  for(const q of questions){assert.equal(new Set(q.options).size,4);assert.equal(q.options[q.answer],rows.find(r=>r.seq===q.seq).gloss_en[0]);}
});
test('Drafts, missing meanings, homographs and overlapping glosses do not create ambiguous questions',()=>{
  const pool=[...rows,{seq:7,word:'未',pinyin:'wèi',gloss_en:['unpublished'],review_status:'draft'},
    {seq:8,word:'空',pinyin:'kōng',gloss_en:[],review_status:'published'},
    {seq:9,word:'爱',pinyin:'ài',gloss_en:['another reading'],review_status:'published'},
    {seq:10,word:'同',pinyin:'tóng',gloss_en:[' Meaning 0 ','synonym'],review_status:'published'}];
  const questions=vocabularyQuiz(pool,{sequences:[1],random:()=>0});
  assert.equal(questions.length,1);assert.equal(questions[0].seq,1);
  assert.ok(!questions[0].options.includes('another reading'));assert.ok(!questions[0].options.includes(' Meaning 0 '));
  assert.deepEqual(vocabularyQuiz(rows.slice(0,3)),[]);
  assert.ok(vocabularyQuiz(pool).every(q=>![7,8].includes(q.seq)));
});
