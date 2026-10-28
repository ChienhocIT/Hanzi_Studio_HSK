import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {SYLLABUS,normalizeRow,verifyVocabulary} from './hsk3-vocabulary.mjs';
// Linked from https://www.chinesetest.cn/syllabus; pinned so a re-issued PDF is reviewed before use.
const source={
  id:'clec-hsk-syllabus-2025-11',
  title:'中文水平考试 HSK 考试大纲（2025-11 发布，2026-07 实施），中外语言交流合作中心 — 词汇大纲',
  url:'https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf',
  sha256:'ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941',
  // No licence is stated in the PDF. Store facts only (word, level, pinyin, POS) with the citation.
  license:'Không ghi giấy phép; quyền tái phân phối chưa xác định. Chỉ lưu dữ kiện từ/cấp/pinyin/từ loại kèm trích dẫn.',
  attribution:'《HSK考试大纲》，中外语言交流合作中心，2025-11 发布。Trích bảng 词汇大纲, chưa giáo viên duyệt.'
};
const sha=data=>createHash('sha256').update(data).digest('hex');
const pdf='.sources/clec-hsk-syllabus-2025-11.pdf',raw='.sources/hsk3-2025-raw.json',out='.sources/hsk3-2025-vocabulary.json';
await mkdir('.sources',{recursive:true});
let file;
try{file=await readFile(pdf);}catch{
  const response=await fetch(source.url,{headers:{'User-Agent':'HanziStudio/4.2 (syllabus import)'},signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error(`Syllabus HTTP ${response.status}`);
  file=Buffer.from(await response.arrayBuffer());await writeFile(pdf,file);
}
if(sha(file)!==source.sha256)throw Error('Syllabus PDF changed. Review the new edition and update the pinned hash explicitly.');
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
execFileSync(python,['-X','utf8','scripts/extract-hsk3-vocabulary.py',pdf,raw],{stdio:'inherit'});
const extracted=JSON.parse(await readFile(raw,'utf8'));
// Only footer page numbers may fall outside the table rows.
const strays=extracted.orphans.filter(x=>!/^\d$/.test(x.char)||x.y<800);
if(strays.length)throw Error(`Unassigned table text: ${JSON.stringify(strays.slice(0,5))}`);
const entries=extracted.rows.map(normalizeRow);
const {errors,counts}=verifyVocabulary(entries);
if(errors.length)throw Error(`Vocabulary does not match the syllabus:\n${errors.slice(0,20).join('\n')}`);
const dataset={format:'hanzi-vocabulary-v1',syllabus:SYLLABUS,source:{...source,retrievedAt:new Date().toISOString()},counts,
  entries:entries.map(({problems,...entry})=>entry)};
await writeFile(out,JSON.stringify(dataset));
console.log(JSON.stringify({output:out,counts,withExtraLevels:entries.filter(x=>x.extraLevels.length).length,withoutPos:entries.filter(x=>!x.pos.length&&!x.posExtra.length).length}));
