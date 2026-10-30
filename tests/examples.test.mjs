import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTsv,traditionalOnly,segment,buildExamples} from '../scripts/seed-examples.mjs';
const cedict=['# comment','愛 爱 [ai4] /love/','愛好 爱好 [ai4 hao4] /hobby/','們 们 [men5] /plural/','著 着 [zhe5] /aspect/','著 著 [zhu4] /to write/'].join('\n');
test('Traditional-only characters come from CC-CEDICT, minus characters also used in simplified text',()=>{
  assert.deepEqual([...traditionalOnly(cedict)].sort(),['們','愛']);
});
test('Sentences split into syllabus words by longest match, so a short word is not found inside a longer one',()=>{
  const words=new Map([['爱',1],['爱好',1],['什么',1],['是',1]]);
  assert.deepEqual(segment('你的爱好是什么？',words),['爱好','是','什么']);
  assert.deepEqual(segment('我爱你',words),['爱']);
});
test('Examples pair each Chinese sentence with one Vietnamese translation and respect the per-word limit',()=>{
  const cmn=parseTsv('1\tcmn\t我爱你。\tamy\t\\N\tx\n2\tcmn\t你的爱好是什么？\t\\N\t\\N\tx\n3\tcmn\t我們愛你。\tbob\t\\N\tx\n4\tcmn\t我很爱我的妈妈和爸爸。\tamy\t\\N\tx\n5\tcmn\t爱！\tamy\t\\N\tx\r\n');
  const vie=parseTsv('10\tvie\tAnh yêu em.\tlan\t\\N\tx\n11\tvie\tSở thích của bạn là gì?\tlan\t\\N\tx\n12\tvie\tEm yêu anh.\tmai\t\\N\tx\n13\tvie\tChúng tôi yêu bạn.\tlan\t\\N\tx\n14\tvie\tTôi rất yêu bố mẹ.\tlan\t\\N\tx\n15\tvie\tYêu!\tlan\t\\N\tx\n');
  const links=[['1','12'],['1','10'],['2','11'],['3','13'],['4','14'],['5','15'],['99','10']];
  const entries=[{seq:2,word:'爱好'},{seq:1,word:'爱'}];
  const rows=buildExamples({links,cmn,vie,entries,traditional:traditionalOnly(cedict),maxLength:10});
  assert.deepEqual(rows.map(r=>[r.seq,r.zh_id,r.vi_id]),[[1,1,10],[1,5,15],[2,2,11]]);
  assert.equal(rows[2].zh_author,null);assert.equal(rows[0].zh_author,'amy');assert.equal(rows[0].vi,'Anh yêu em.');
});

test('Invalid IDs, wrong languages and blank translations cannot displace a usable example',()=>{
  const cmn=parseTsv('1\tcmn\t我爱你。\tamy\n2\teng\t爱\tamy\n0\tcmn\t爱\tamy\n');
  const vie=parseTsv('10\tvie\t   \tlan\n11\tvie\tAnh yêu em.\tlan\n12\teng\tLove\tlan\n');
  const rows=buildExamples({cmn,vie,links:[['1','10'],['1','11'],['2','11'],['0','11'],['1','12']],entries:[{seq:1,word:'爱'}],traditional:new Set()});
  assert.deepEqual(rows.map(r=>[r.zh_id,r.vi_id,r.vi]),[[1,11,'Anh yêu em.']]);
});
