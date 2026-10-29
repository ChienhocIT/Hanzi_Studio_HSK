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
const NOISE=/^(surname |(old |archaic )?variant of |see |CL:|used in |abbr\. for |also written |Taiwan pr\.)/i;
export function pickGlosses(entries,syllabusPinyin,limit=4) {
  if(!entries?.length)return [];
  const exact=entries.filter(e=>cedictPinyin(e.pinyin)===plain(syllabusPinyin));
  const loose=entries.filter(e=>toneless(cedictPinyin(e.pinyin))===toneless(syllabusPinyin));
  const pool=exact.length?exact:loose.length?loose:entries;
  // Capitalised readings are proper nouns (Ming2, Huang2); use them only when nothing else matches.
  const common=pool.filter(e=>e.pinyin[0]===e.pinyin[0].toLowerCase());
  const defs=(common.length?common:pool).flatMap(e=>e.definitions).map(d=>d.trim()).filter(d=>d&&!NOISE.test(d));
  return [...new Set(defs)].map(d=>d.length>80?d.slice(0,77)+'...':d).slice(0,limit);
}
