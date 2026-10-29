// Pick CC-CEDICT English glosses for a syllabus word, preferring the reading the syllabus gives.
const MARKS={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù','ü':'ǖǘǚǜ'};
// "hao3" -> "hǎo", "nu:3" -> "nǚ"; tone 5 (neutral) carries no mark.
export function markedSyllable(syllable) {
  const match=syllable.toLowerCase().replace(/u:|v/g,'ü').match(/^([a-zü]+)([1-5])$/);
  if(!match)return syllable.toLowerCase();
  const [,base,tone]=match;
  if(tone==='5')return base;
  const at=/[ae]/.test(base)?base.search(/[ae]/):base.includes('ou')?base.indexOf('o'):Math.max(...[...'aeiouü'].map(v=>base.lastIndexOf(v)));
  return at<0?base:base.slice(0,at)+MARKS[base[at]][Number(tone)-1]+base.slice(at+1);
}
const plain=text=>text.normalize('NFC').toLowerCase().replace(/[\s'’\-/·]/g,'');
const toneless=text=>plain(text).normalize('NFD').replace(/[̀-ͯ]/g,'');
export const cedictPinyin=pinyin=>pinyin.split(/\s+/).map(markedSyllable).join('');
const NOISE=/^(surname (?!and\b)|(old |archaic )?variant of |see |CL:|used in |abbr\. for |also written |Taiwan pr\.)/i;
function readings(entries,syllabusPinyin) {
  const exact=entries.filter(e=>cedictPinyin(e.pinyin)===plain(syllabusPinyin));
  const loose=entries.filter(e=>toneless(cedictPinyin(e.pinyin))===toneless(syllabusPinyin));
  const pool=exact.length?exact:loose.length?loose:entries;
  const common=pool.filter(e=>e.pinyin[0]===e.pinyin[0].toLowerCase());
  return common.length?common:pool;
}
export function pickGlosses(entries,syllabusPinyin,limit=4) {
  if(!entries?.length)return [];
  // Capitalised readings are proper nouns (Ming2, Huang2); use them only when nothing else matches.
  const defs=readings(entries,syllabusPinyin).flatMap(e=>e.definitions).map(d=>d.trim()).filter(d=>d&&!NOISE.test(d));
  return [...new Set(defs)].map(d=>d.length>80?d.slice(0,77)+'...':d).slice(0,limit);
}
// Follow explicit dictionary cross-references only. Do not infer missing compounds
// or replace the syllabus headword/reading with that of the referenced entry.
export function resolveGlosses(dictionary,word,pinyin,visited=new Set()) {
  const key=word+'|'+pinyin;
  if(visited.has(key)||visited.size>=5)return [];
  const entries=dictionary.get(word);
  if(!entries?.length)return [];
  const direct=pickGlosses(entries,pinyin);
  if(direct.length)return direct;
  const next=new Set(visited).add(key),definitions=[];
  for(const entry of readings(entries,pinyin))for(const definition of entry.definitions) {
    const ref=definition.match(/^(?:(?:old |archaic )?variant of|see|abbr\. for) ([㐀-鿿]+)(?:\|([㐀-鿿]+))?\[([^\]]+)\]$/i);
    if(ref)definitions.push(...resolveGlosses(dictionary,ref[2]||ref[1],cedictPinyin(ref[3]),next));
  }
  return [...new Set(definitions)].slice(0,4);
}
