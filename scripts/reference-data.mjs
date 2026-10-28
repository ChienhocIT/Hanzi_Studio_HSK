export function wikiWords(text) {
  return [...text.matchAll(/^\*\s*\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gm)].map(match=>match[1].trim());
}
export function cedictEntries(text) {
  const index=new Map();
  for(const line of text.split(/\r?\n/)) {
    if(line.startsWith('#'))continue;
    const match=line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/$/);
    if(!match)continue;
    const entry={traditional:match[1],simplified:match[2],pinyin:match[3],definitions:match[4].split('/')};
    const rows=index.get(entry.simplified)||[];
    if(!rows.some(row=>row.traditional===entry.traditional&&row.pinyin===entry.pinyin&&JSON.stringify(row.definitions)===JSON.stringify(entry.definitions)))rows.push(entry);
    index.set(entry.simplified,rows);
  }
  return index;
}
export function joinReference(pages,dictionary) {
  return pages.flatMap(page=>[...new Set(wikiWords(page.text))].map(word=>({
    id:`wiktionary-hsk2-${page.level}-${word}`,word,level:page.level,syllabus:'HSK 2.0 (community reference)',
    reviewStatus:'unreviewed',sourceRevision:page.revision,entries:dictionary.get(word)||[]
  })));
}
