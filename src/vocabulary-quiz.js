const normalized=value=>value.trim().normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
function shuffled(values,random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
// Practice only: published dictionary meanings, no generated translations or exam claims.
export function vocabularyQuiz(rows,{limit=10,sequences=null,random=Math.random}={}) {
  const seen=new Set();
  const pool=rows.filter(row=>{
    if(row.review_status!=='published'||!Number.isInteger(row.seq)||seen.has(row.seq)||!row.word||!row.pinyin||!Array.isArray(row.gloss_en))return false;
    seen.add(row.seq);return row.gloss_en.some(g=>typeof g==='string'&&g.trim());
  });
  const questions=[];
  for(const row of shuffled(pool,random)) {
    if(sequences&&!sequences.includes(row.seq))continue;
    const meanings=new Set(row.gloss_en.filter(g=>typeof g==='string'&&g.trim()).map(normalized));
    const answer=row.gloss_en.find(g=>typeof g==='string'&&g.trim()).trim(),used=new Set(meanings),distractors=[];
    for(const other of shuffled(pool,random)) {
      if(other.word===row.word)continue;
      const definitions=other.gloss_en.filter(g=>typeof g==='string'&&g.trim());
      if(definitions.some(g=>meanings.has(normalized(g))))continue;
      const choice=definitions[0].trim(),key=normalized(choice);
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
