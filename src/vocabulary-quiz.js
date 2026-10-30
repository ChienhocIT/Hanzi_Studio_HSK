const normalized=value=>value.trim().normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
function shuffled(values,random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
// Practice only: published syllabus readings or dictionary meanings, no generated content or exam claims.
export function vocabularyQuiz(rows,{limit=10,sequences=null,kind='meaning',random=Math.random}={}) {
  if(!['meaning','pinyin'].includes(kind))return [];
  const definitions=row=>kind==='pinyin'?[row.pinyin]:row.gloss_en;
  const keyOf=kind==='pinyin'?value=>normalized(value).replace(/[\s'’·-]/g,''):normalized;
  const seen=new Set();
  let pool=rows.filter(row=>{
    if(row.review_status!=='published'||!Number.isInteger(row.seq)||seen.has(row.seq)||typeof row.word!=='string'||!row.word.trim()||typeof row.pinyin!=='string'||!row.pinyin.trim()||!Array.isArray(definitions(row)))return false;
    if(!definitions(row).some(g=>typeof g==='string'&&g.trim()))return false;
    seen.add(row.seq);return true;
  });
  if(kind==='pinyin') {
    const readings=new Map();
    for(const row of pool){if(!readings.has(row.word))readings.set(row.word,new Set());readings.get(row.word).add(keyOf(row.pinyin));}
    // Without a sentence or meaning, multiple readings of the same written word would all be valid answers.
    pool=pool.filter(row=>!row.homograph&&readings.get(row.word).size===1);
  }
  const questions=[];
  for(const row of shuffled(pool,random)) {
    if(sequences&&!sequences.includes(row.seq))continue;
    const meanings=new Set(definitions(row).filter(g=>typeof g==='string'&&g.trim()).map(keyOf));
    const answer=definitions(row).find(g=>typeof g==='string'&&g.trim()).trim(),used=new Set(meanings),distractors=[];
    for(const other of shuffled(pool,random)) {
      if(other.word===row.word)continue;
      const values=definitions(other).filter(g=>typeof g==='string'&&g.trim());
      if(values.some(g=>meanings.has(keyOf(g))))continue;
      const choice=values[0].trim(),key=keyOf(choice);
      if(used.has(key))continue;
      used.add(key);distractors.push(choice);if(distractors.length===3)break;
    }
    if(distractors.length!==3)continue;
    const options=shuffled([answer,...distractors],random);
    questions.push({seq:row.seq,word:row.word,pinyin:row.pinyin,options,answer:options.indexOf(answer)});
    if(questions.length===limit)break;
  }
  return questions;
}
