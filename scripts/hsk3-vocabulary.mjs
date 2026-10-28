// Normalise and verify rows extracted from the 词汇大纲 of 《HSK考试大纲》 (CLEC, 2025-11).
export const SYLLABUS='HSK 3.0 (CLEC 2025)';
export const LEVELS=['1','2','3','4','5','6','7-9'];
// New words per level as printed in the syllabus; any difference stops the import.
export const EXPECTED_COUNTS={'1':300,'2':200,'3':500,'4':1000,'5':1600,'6':1800,'7-9':5600};
const level='(?:[1-6]|7-9)';
const levelPattern=new RegExp(`^(${level})((?:（${level}）)*)$`);
const pinyinPattern=/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ’'\/\- ]+$/i;

// 等级 like "1（2）（4）": introduced at 1; the parenthesised levels add the parenthesised 词性.
export function parseLevel(raw) {
  const match=String(raw).match(levelPattern);
  if(!match)return null;
  return {level:match[1],extraLevels:[...match[2].matchAll(new RegExp(level,'g'))].map(x=>x[0])};
}
// 词性 like "形、介、（动、量）": items outside parentheses are the base senses.
export function parsePos(raw) {
  const extra=[...String(raw).matchAll(/（([^）]*)）/g)].flatMap(x=>x[1].split('、'));
  const base=String(raw).replace(/（[^）]*）/g,'').split('、');
  const clean=list=>list.map(x=>x.trim()).filter(Boolean);
  return {pos:clean(base),posExtra:clean(extra)};
}
export function normalizeRow(row) {
  let rawLevel=row.level,rawWord=row.word;
  // A wide 等级 cell such as "3（4）（7-9）" can spill its closing bracket into 词语.
  if(/（[^）]*$/.test(rawLevel)&&rawWord.startsWith('）')){rawLevel+='）';rawWord=rawWord.slice(1);}
  const parsedLevel=parseLevel(rawLevel);
  const word=rawWord.match(/^([㐀-鿿]+)([1-9])?$/);
  return {
    seq:row.seq,page:row.page,
    level:parsedLevel?.level??null,extraLevels:parsedLevel?.extraLevels??[],
    word:word?.[1]??rawWord,homograph:word?.[2]?Number(word[2]):null,
    pinyin:row.pinyin,...parsePos(row.pos),posRaw:row.pos,
    problems:[
      ...(parsedLevel?[]:[`等级 không hợp lệ: ${rawLevel}`]),
      ...(word?[]:[`词语 không hợp lệ: ${rawWord}`]),
      ...(pinyinPattern.test(row.pinyin)?[]:[`拼音 không hợp lệ: ${row.pinyin}`]),
      ...(parsedLevel&&parsedLevel.extraLevels.some(x=>LEVELS.indexOf(x)<=LEVELS.indexOf(parsedLevel.level))?[`Cấp phụ không cao hơn cấp chính: ${rawLevel}`]:[])
    ]
  };
}
export function verifyVocabulary(entries,expected=EXPECTED_COUNTS) {
  const errors=[];
  const total=Object.values(expected).reduce((a,b)=>a+b,0);
  const sorted=[...entries].sort((a,b)=>a.seq-b.seq);
  if(sorted.length!==total)errors.push(`Có ${sorted.length} mục, đề cương ghi ${total}.`);
  sorted.forEach((entry,i)=>{if(entry.seq!==i+1)errors.push(`序号 không liên tục tại vị trí ${i+1}: ${entry.seq}.`);});
  // Levels form contiguous 序号 blocks in the syllabus.
  let offset=0;
  for(const name of LEVELS) {
    const block=sorted.slice(offset,offset+(expected[name]||0));
    const wrong=block.filter(entry=>entry.level!==name);
    if(wrong.length)errors.push(`Cấp ${name}: ${wrong.length} mục không thuộc khối 序号 ${offset+1}-${offset+block.length} (vd. ${wrong[0].seq} ${wrong[0].word}).`);
    offset+=expected[name]||0;
  }
  for(const entry of sorted)for(const problem of entry.problems)errors.push(`${entry.seq}: ${problem}`);
  return {errors,counts:Object.fromEntries(LEVELS.map(name=>[name,sorted.filter(x=>x.level===name).length]))};
}
