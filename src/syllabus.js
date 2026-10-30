import { h, field } from './ui.js';
import {vocabularyQuiz} from './vocabulary-quiz.js';
import {mountVocabReports} from './vocab-reports.js';
import {exampleAudio,mountExampleAudio} from './example-audio.js';
import {mountExampleReview} from './example-review.js';
import {renderStudyCard,focusStudyCard,mountStudyKeyboard,studyRatings} from './study-card.js';
// HSK 1–9 study screen over the 2025 CLEC syllabus list in vocab_entries, with CC-CEDICT English glosses.
// Only served to signed-in accounts (redistribution rights are unclear); learners see published rows,
// teachers/admins also see drafts. Card ratings join the curriculum SRS through hanzi:reference-rating.
export const SYLLABUS = 'HSK 3.0 (CLEC 2025)';
const LEVELS = ['1','2','3','4','5','6','7-9'];
const PAGE = 30, FETCH = 1000, stateKey = 'hanzi-studio-curriculum-v4', LEVEL_KEY = 'hanzi-hsk-level';
// Words per study stage ("chặng"): short stages for beginners, longer ones for the 5,600-word 7–9 band.
const STAGE = {'1':50,'2':50,'3':50,'4':100,'5':100,'6':100,'7-9':200};
// Learner's level: last library choice, else the level picked on the HSK roadmap, else HSK 1.
function initialLevel() {
  try {
    const saved = localStorage.getItem(LEVEL_KEY), roadmap = JSON.parse(localStorage.getItem(stateKey) || '{}').level;
    return [saved, roadmap].find(l => LEVELS.includes(l)) || '1';
  } catch { return '1'; }
}
const STATUS = {draft:'Bản nháp',published:'Đã xuất bản',rejected:'Đã loại'};
const POS = {名:'danh từ',动:'động từ',形:'tính từ',副:'phó từ',量:'lượng từ',代:'đại từ',介:'giới từ',连:'liên từ',助:'trợ từ',叹:'thán từ',数:'số từ',拟声:'từ tượng thanh',前缀:'tiền tố',后缀:'hậu tố'};
const plain = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'u').toLowerCase().replace(/[\s'’-]/g,'');
const reply = async request => { const { data, error } = await request; if (error) throw error; return data; };
export const entryId = seq => `clec2025-${seq}`;
export function mountSyllabus(root) {
  if (!root) return { setSession() {} };
  let client = null, profile = null, level = initialLevel(), query = '', page = 0, position = 0, revealed = false, view = 'stages', stage = null, adminOpen = false;
  let sessionEpoch=0,loadEpoch=0,quiz=null;
  const cache = new Map(), examples = new Map();
  const reports=mountVocabReports(root,()=>({client,profile}));
  const exampleReview=mountExampleReview(root,()=>({client,profile}),seq=>examples.delete(seq));
  mountExampleAudio(root);
  mountStudyKeyboard(root);
  let shownCard = null, resumeSeq = null, cardMode = 'all';
  const cardRows=()=>words().filter(r=>{const p=progress(r.seq);if(view==='due'||cardMode==='due')return isDue(r);if(cardMode==='new')return !p;if(cardMode==='learning')return p&&p.reps<2&&p.lastRating!=='easy';if(cardMode==='mastered')return p&&(p.reps>=2||p.lastRating==='easy');return true;});
  function rememberLocation() {
    if(!LEVELS.includes(level)||!['cards','due'].includes(view)||shownCard===null)return;
    const detail={level,stage,seq:shownCard,saved:false};
    window.dispatchEvent(new CustomEvent('hanzi:study-location',{detail}));
  }
  function restoreLocation() {
    try{
      const saved=JSON.parse(localStorage.getItem(stateKey)||'{}').studyLocations?.[level];
      if(saved&&Number.isInteger(saved.seq)&&saved.seq>0&&(saved.stage===null||Number.isInteger(saved.stage)&&saved.stage>=0)){
        stage=saved.stage;resumeSeq=saved.seq;view='cards';
      }
    }catch{}
  }
  const admin = () => profile?.role === 'admin', staff = () => ['teacher','admin'].includes(profile?.role);
  root.innerHTML = `<div class="art-hero hsk-hero"><picture class="art-hero-media"><source media="(max-width:700px)" srcset="./assets/illustrations/banner-reading-mobile.webp" width="750" height="900"><img src="./assets/illustrations/banner-reading-desktop.webp" alt="" width="1600" height="600"></picture><div class="art-hero-copy"><h1>Thư viện từ vựng HSK 1–9</h1><p>11.000 từ của đề cương HSK 3.0 (2025), chia theo cấp và chặng: tra cứu, nghe, luyện thẻ, ôn đúng lúc.</p></div></div><div class="panel" id="syllabus-panel"><p id="syllabus-status" role="status" aria-live="polite"></p><div id="syllabus-content"></div></div>`;
  const status = (text, error = false) => { const el = root.querySelector('#syllabus-status'); el.textContent = text; el.classList.toggle('cloud-error', error); };
  const content = root.querySelector('#syllabus-content');
  const stageRows = (rows, index) => rows.slice(index * STAGE[level], (index + 1) * STAGE[level]);
  const words = () => {
    const all = level === 'all' ? LEVELS.flatMap(l => cache.get(l) || []) : cache.get(level) || [];
    const rows = stage !== null && level !== 'all' ? stageRows(all, stage) : all;
    const q = plain(query);
    const filtered=q ? rows.filter(r => r.word.includes(query.trim()) || plain(r.pinyin).includes(q)) : rows;
    return view==='missing'?filtered.filter(r=>!r.gloss_en?.some(g=>g.trim())):filtered;
  };
  // Progress is restorable from backups and cloud sync, so treat it as untrusted and keep only numbers.
  const progress = seq => { try { const r = JSON.parse(localStorage.getItem(stateKey) || '{}').progress?.[entryId(seq)]; return r ? {reps: Math.max(0, Number.parseInt(r.reps, 10) || 0), due: Number(r.due) || 0,lastRating:studyRatings.includes(r.lastRating)?r.lastRating:null} : null; } catch { return null; } };
  const posText = r => [...r.pos, ...r.pos_extra.map(p => `(${p})`)].map(p => { const key = p.replace(/[()]/g,''); return `<abbr title="${h(POS[key] || key)}">${h(p)}</abbr>`; }).join('、') || '<span class="panel-sub">cụm từ</span>';
  const meaning = r => r.gloss_en?.length ? `<p lang="en" class="panel-sub">${r.gloss_en.map(h).join('; ')}</p>` : '';
  const isDue = r => { const p = progress(r.seq); return Boolean(p && p.due <= Date.now()); };
  function stageGrid() {
    const rows = cache.get(level) || [], size = STAGE[level], count = Math.ceil(rows.length / size);
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(stateKey) || '{}').progress || {}; } catch {}
    const now = Date.now();
    return `<div class="stage-grid">${Array.from({length: count}, (_, i) => {
      const part = stageRows(rows, i);
      const learned = part.filter(r => (Number.parseInt(saved[entryId(r.seq)]?.reps, 10) || 0) > 0).length;
      const due = part.filter(r => Number(saved[entryId(r.seq)]?.due) <= now).length;
      const pct = Math.round(learned / part.length * 100);
      return `<button type="button" class="stage-tile${learned === part.length ? ' is-done' : ''}" data-syl-stage="${i}"><span class="stage-name">Chặng ${i + 1}</span><span class="stage-range">Từ ${i * size + 1}–${i * size + part.length}</span><span class="stage-words" lang="zh-Hans">${part.slice(0, 4).map(r => h(r.word)).join(' · ')}</span><span class="stage-meter" aria-hidden="true"><span style="width:${pct}%"></span></span><span class="stage-foot">${learned}/${part.length} đã học${due ? ` · <strong>${due} đến hạn</strong>` : ''}</span></button>`;
    }).join('')}</div>`;
  }
  const label = r => `${h(r.word)}${r.homograph ? `<sup>${r.homograph}</sup>` : ''}`;
  // Tatoeba example sentences for one word, loaded when its answer is revealed. Learners only receive published rows (RLS);
  // staff also see drafts and administrators review each sentence here. Authors are credited per sentence (CC BY).
  const tatoeba = (id, author) => `<a href="https://tatoeba.org/vi/sentences/show/${Number(id)}" target="_blank" rel="noopener noreferrer">#${Number(id)}</a>${author ? ` (${h(author)})` : ''}`;
  function exampleList(r) {
    const rows = examples.get(r.seq);
    if (rows === undefined || rows === 'loading') { if (rows === undefined) loadExamples(r.seq); return '<p class="panel-sub syllabus-examples">Đang tải câu ví dụ...</p>'; }
    if (rows === 'error') return '<div class="syllabus-examples"><p class="panel-sub">Chưa tải được câu ví dụ.</p><button type="button" class="btn" data-syl="examples-retry">Thử tải lại câu ví dụ</button></div>';
    if (!rows.length) return '';
    return `<div class="syllabus-examples"><h4>Câu ví dụ</h4><ul>${rows.map(e => `<li><p lang="zh-Hans" class="example-zh">${h(e.zh)} <button type="button" class="btn btn-listen" data-syl="say" data-word="${h(e.zh)}" aria-label="Nghe câu ${h(e.zh)}"><span class="ico-listen" aria-hidden="true"></span>Nghe</button></p><p>${h(e.vi)}</p>${exampleAudio(e.example_audio,e.zh_id,admin())}<p class="panel-sub">Tatoeba ${tatoeba(e.zh_id, e.zh_author)} · bản dịch ${tatoeba(e.vi_id, e.vi_author)} · ${h(e.license)}${staff() ? ` · ${h(STATUS[e.review_status] || e.review_status)}` : ''}</p>${admin() ? `<div class="cloud-actions">${[['published', 'Duyệt'], ['rejected', 'Từ chối'], ['draft', 'Về nháp']].filter(([d]) => d !== e.review_status).map(([d, text]) => `<button type="button" class="btn" data-syl="example-review" data-zh="${Number(e.zh_id)}" data-decision="${d}">${text}</button>`).join('')}</div>` : ''}</li>`).join('')}</ul></div>`;
  }
  async function loadExamples(seq) {
    const owner = sessionEpoch, activeClient = client; examples.set(seq, 'loading');
    let rows;
    try { rows = await reply(activeClient.from('example_sentences').select('zh_id,zh,zh_author,vi_id,vi,vi_author,license,review_status,example_audio(audio_id,author,license,attribution_url,review_status)').eq('syllabus', SYLLABUS).eq('seq', seq).order('zh_id')); }
    catch { rows = 'error'; }
    if (owner !== sessionEpoch) return;
    examples.set(seq, rows);
    if (shownCard === seq && revealed) {
      const box=root.querySelector('#syllabus-card-examples'),row=words().find(r=>r.seq===seq);
      if(box&&row)box.innerHTML=exampleList(row)||'<p class="panel-sub">Chưa có ví dụ đã duyệt cho mục này.</p>';
    }
  }
  async function fetchLevel(name,owner,activeClient) {
    if (cache.has(name)) return;
    const rows = [];
    for (let from = 0; ; from += FETCH) {
      const batch = await reply(activeClient.from('vocab_entries').select('seq,level,extra_levels,word,homograph,pinyin,pos,pos_extra,review_status,source_page,gloss_en')
        .eq('syllabus', SYLLABUS).eq('level', name).order('seq').range(from, from + FETCH - 1));
      if(owner!==sessionEpoch)return;
      rows.push(...batch);
      if (batch.length < FETCH) break;
    }
    cache.set(name, rows);
  }
  async function load() {
    const owner=sessionEpoch,request=++loadEpoch,activeClient=client;
    const needed = level === 'all' ? LEVELS : [level];
    status('Đang tải danh mục...');
    if(['cards','due'].includes(view)&&needed.some(name=>!cache.has(name))){
      shownCard=null;
      root.querySelector('#syllabus-results').innerHTML='<div class="study-card-skeleton" role="status" aria-busy="true">Đang tải bộ thẻ...</div>';
    }
    try {
      for (const name of needed) {await fetchLevel(name,owner,activeClient);if(owner!==sessionEpoch||request!==loadEpoch)return;}
      const total = needed.reduce((n, name) => n + cache.get(name).length, 0);
      if(resumeSeq!==null){
        const index=words().findIndex(r=>r.seq===resumeSeq);
        if(index>=0)position=index;else{stage=null;view=location.hash==='#study'?'cards':'stages';position=0;}
        resumeSeq=null;
      }
      status(total ? `HSK ${level === 'all' ? '1–9' : level}: ${total.toLocaleString('vi-VN')} mục.` : staff() ? 'Danh mục chưa được nạp vào database. Người vận hành chạy npm run db:seed-vocabulary.' : 'Cấp này chưa có mục nào được duyệt cho học viên.');
      root.querySelector('[data-syl="reload"]').hidden=true;
    } catch { if(owner!==sessionEpoch||request!==loadEpoch)return;status('Không tải được danh mục. Kiểm tra kết nối và thử lại.', true);root.querySelector('[data-syl="reload"]').hidden=false; }
    renderResults();
  }
  function adminTools() {
    if (!admin() || level === 'all') return '';
    const rows = cache.get(level) || [];
    const count = s => rows.filter(r => r.review_status === s).length;
    return `<details class="syllabus-admin" ${adminOpen ? 'open' : ''}><summary>Duyệt cấp HSK ${h(level)} (quản trị viên)</summary><p>${Object.keys(STATUS).map(s => `${STATUS[s]}: ${count(s).toLocaleString('vi-VN')}`).join(' · ')}. Học viên chỉ thấy mục đã xuất bản. Hãy đối chiếu với đề cương (cột “Trang”) trước khi xuất bản.</p><div class="cloud-actions"><button type="button" class="btn" data-syl="publish" ${count('draft') ? '' : 'disabled'}>Xuất bản ${count('draft').toLocaleString('vi-VN')} mục nháp</button><button type="button" class="btn" data-syl="unpublish" ${count('published') ? '' : 'disabled'}>Ẩn khỏi học viên</button></div></details>`;
  }
  function renderResults() {
    const result = root.querySelector('#syllabus-results');
    if (!result) return;
    root.classList.toggle('has-study-card',['cards','due'].includes(view));
    result.querySelectorAll('audio').forEach(audio=>audio.pause());
    if(view==='quiz'){renderQuiz(result);return;}
    result.innerHTML = adminTools()+reports.adminTools()+exampleReview.adminTools(); shownCard = null;
    if(admin())result.insertAdjacentHTML('afterbegin','<button type="button" class="btn" data-syl="missing">Hàng đợi thiếu nghĩa của cấp này</button>');
    if (level !== 'all' && stage === null && !query && view === 'stages') {
      const total = (cache.get(level) || []).length;
      if (total) result.insertAdjacentHTML('beforeend', `<p class="stage-intro">HSK ${h(level)} có ${total.toLocaleString('vi-VN')} từ, chia ${Math.ceil(total / STAGE[level])} chặng, mỗi chặng ${STAGE[level]} từ. Chọn một chặng để học.</p>${stageGrid()}`);
      else result.insertAdjacentHTML('beforeend', '<p>Chưa có mục để hiển thị.</p>');
      return;
    }
    if (stage !== null && level !== 'all') {
      const size = STAGE[level];
      result.insertAdjacentHTML('beforeend', `<div class="stage-bar"><button type="button" class="btn" data-syl="stages">← Tất cả chặng</button><strong>HSK ${h(level)} · Chặng ${stage + 1}</strong><span class="panel-sub">Từ ${stage * size + 1}–${stage * size + words().length}</span></div>`);
    }
    const list = ['cards','due'].includes(view) ? cardRows() : words();
    if(['cards','due'].includes(view)){
      const all=cache.get(level)||[],count=level==='all'?0:Math.ceil(all.length/STAGE[level]);
      result.insertAdjacentHTML('beforeend',`<div class="study-tools study-card-filters"><div class="field-select"><label for="syllabus-study-stage">Bộ từ</label><select id="syllabus-study-stage" data-syl-stage-select><option value="all" ${stage===null?'selected':''}>Tất cả từ của cấp</option>${Array.from({length:count},(_,i)=>`<option value="${i}" ${stage===i?'selected':''}>Chặng ${i+1} · Từ ${i*STAGE[level]+1}-${Math.min((i+1)*STAGE[level],all.length)}</option>`).join('')}</select></div><div class="field-select"><label for="syllabus-study-mode">Chế độ</label><select id="syllabus-study-mode" data-syl-mode>${[['all','Tất cả thẻ'],['new','Chưa học'],['learning','Đang học'],['mastered','Đã nhớ'],['due','Đến hạn ôn']].map(([id,text])=>`<option value="${id}" ${(view==='due'?'due':cardMode)===id?'selected':''}>${text}</option>`).join('')}</select></div></div>`);
    }
    if (!list.length) { result.insertAdjacentHTML('beforeend', `<p>${(view === 'due'||cardMode==='due') ? 'Chưa có từ nào đến hạn ôn ở cấp này. Luyện thẻ và bấm “Đã nhớ” để bắt đầu lịch ôn.' : query ? 'Không có mục phù hợp. Thử chữ Hán hoặc pinyin khác (gõ không dấu cũng được).' : 'Chưa có mục để hiển thị.'}</p>`); return; }
    if (view === 'cards' || view === 'due' || view === 'stages') {
      position = Math.min(position, list.length - 1); const r = list[position], record = progress(r.seq); shownCard = r.seq;
      result.insertAdjacentHTML('beforeend', renderStudyCard({namespace:'syl',word:r.word,homograph:r.homograph,reading:r.pinyin,answerHtml:meaning(r)||'<p>Chưa có nghĩa đối chiếu. Cần biên tập bổ sung.</p>',partHtml:posText(r),position,total:list.length,record,revealed,source:'HSK '+r.level,examplesId:'syllabus-card-examples',examplesHtml:revealed?exampleList(r):''}));
      return;
    }
    const pages = Math.ceil(list.length / PAGE); page = Math.min(page, pages - 1);
    result.insertAdjacentHTML('beforeend', `<p>Tìm thấy ${list.length.toLocaleString('vi-VN')} mục. Trang ${page + 1}/${pages}.</p><div class="cloud-actions"><button type="button" class="btn" data-syl="prev-page" ${page === 0 ? 'disabled' : ''}>Trang trước</button><button type="button" class="btn" data-syl="next-page" ${page >= pages - 1 ? 'disabled' : ''}>Trang sau</button></div><div class="table-wrap"><table class="syllabus-table"><thead><tr><th scope="col">STT</th><th scope="col">Từ</th><th scope="col">Pinyin</th><th scope="col">Từ loại</th><th scope="col">Cấp</th>${staff() ? '<th scope="col">Trạng thái</th>' : ''}<th scope="col"><span class="sr-only">Nghe</span></th></tr></thead><tbody>${list.slice(page * PAGE, page * PAGE + PAGE).map(r => `<tr><td>${r.seq}</td><td lang="zh-Hans" class="syllabus-word">${label(r)}${meaning(r)}</td><td lang="zh-Latn">${h(r.pinyin)}</td><td>${posText(r)}</td><td>${h(r.level)}${r.extra_levels.length ? ` <small>(+${r.extra_levels.map(h).join(', ')})</small>` : ''}</td>${staff() ? `<td>${h(STATUS[r.review_status] || r.review_status)}<br><small>Trang ${h(r.source_page ?? '?')}</small></td>` : ''}<td><button type="button" class="btn btn-listen" data-syl="say" data-word="${h(r.word)}" aria-label="Nghe ${h(r.word)}"><span class="ico-listen" aria-hidden="true"></span>Nghe</button></td></tr>`).join('')}</tbody></table></div>`);
  }
  function render() {
    cache.clear(); position = 0; page = 0; revealed = false; quiz = null; stage = null; view = 'stages'; resumeSeq=null;shownCard=null;
    if (!client) { content.innerHTML = window.HANZI_CLOUD_CONFIG?.url ? '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>' : '<p>Danh mục được lưu trên máy chủ đồng bộ. Tính năng này cần quản trị viên kết nối Supabase.</p>'; status(''); return; }
    if (!profile) { content.innerHTML = '<div class="gate"><p>Đăng nhập để tra cứu và luyện 11.000 từ của đề cương HSK 3.0.</p><button type="button" class="btn btn-primary" data-go="auth" data-auth-view="login">Đăng nhập để mở danh mục</button></div>'; status(''); return; }
    content.innerHTML = `<div class="hsk-levels" role="group" aria-label="Chọn cấp HSK">${[...LEVELS, 'all'].map(l => `<button type="button" class="level-chip" data-syl-level="${l}" aria-pressed="${l === level}">${l === 'all' ? 'Tất cả' : `HSK ${l}`}</button>`).join('')}</div><form id="syllabus-search" class="cloud-form syllabus-search">${field('Tìm chữ Hán hoặc pinyin','query','search',`value="${h(query)}" maxlength="60"`)}<button class="btn">Tra cứu</button></form><div class="cloud-actions"><button type="button" class="btn" data-syl="list">Danh sách từ</button><button type="button" class="btn" data-syl="cards">Luyện thẻ</button><button type="button" class="btn" data-syl="due">Ôn từ đến hạn</button><button type="button" class="btn" data-go="library">Bộ HSK 3 nghĩa tiếng Việt</button></div><div id="syllabus-results"></div><p class="panel-sub syllabus-source">Danh mục từ: 《中文水平考试 HSK 考试大纲》, 中外语言交流合作中心 (CLEC), 2025, không ghi giấy phép; chỉ lưu từ, cấp, pinyin, từ loại kèm trích dẫn và số trang, không phải ngân hàng đề thi. Nghĩa tiếng Anh: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict" target="_blank" rel="noopener noreferrer">CC-CEDICT</a> (CC-CEDICT contributors, MDBG), <a href="./data/CC-BY-SA-4.0.txt" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>, chọn theo cách đọc của đề cương. Chưa có nghĩa tiếng Việt. Câu ví dụ Trung–Việt: <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a>, CC BY 2.0 FR, ghi tác giả từng câu; chỉ hiện câu đã được quản trị viên duyệt.</p>`;
    content.querySelector('[name="query"]').required = false;
    const source=root.querySelector('.syllabus-source'),details=document.createElement('details');
    details.className='syllabus-source-details';details.innerHTML='<summary>Nguồn học liệu và giấy phép</summary>';source.before(details);details.appendChild(source);
    content.insertAdjacentHTML('afterbegin','<div class="study-primary"><button type="button" class="btn" data-syl="stages">Chọn chặng</button><button type="button" class="btn" data-syl="due">Ôn đến hạn</button><button type="button" class="btn" data-syl="tools" aria-expanded="false">Tra cứu và quiz</button></div><button type="button" class="btn" data-syl="reload" hidden>Thử tải lại bộ thẻ</button>');
    content.querySelector('.cloud-actions').insertAdjacentHTML('beforeend','<button type="button" class="btn" data-syl="quiz">Luyện trắc nghiệm</button><button type="button" class="btn" data-syl="quiz-pinyin">Luyện pinyin</button>');
    if(location.hash==='#study'){view='cards';cardMode='all';restoreLocation();}
    load();
  }
  function startQuiz(sequences=null,kind='meaning') {
    const pool=sequences?quiz.pool:words(),dueOnly=sequences?quiz.dueOnly:view==='due'||(view==='cards'&&cardMode==='due')||(view==='quiz'&&quiz?.dueOnly);
    const targets=sequences||(dueOnly?pool.filter(isDue).map(r=>r.seq):null),questions=vocabularyQuiz(pool,{sequences:targets,kind});
    if(!questions.length){
      let message='Cần ít nhất 4 từ đã xuất bản có nghĩa khác nhau. Chọn cấp rộng hơn hoặc bỏ bộ lọc tìm kiếm.';
      if(dueOnly)message='Chưa có từ đến hạn đủ điều kiện tạo câu hỏi. Cần thêm lựa chọn khác nhau ở cấp hoặc chặng đang chọn.';
      else if(kind==='pinyin')message='Cần ít nhất 4 cách đọc khác nhau từ các từ đã xuất bản, không có nhiều cách đọc cho cùng một chữ. Chọn cấp rộng hơn hoặc bỏ bộ lọc tìm kiếm.';
      status(message,true);return;
    }
    quiz={pool,questions,answers:[],level,kind,dueOnly:Boolean(dueOnly),index:0,saved:false};view='quiz';status('');renderResults();
    root.querySelector('[data-syl="quiz-answer"]')?.focus();
  }
  function saveQuiz() {
    const correct=quiz.answers.filter((a,i)=>a===quiz.questions[i].answer).length;
    const wrong=quiz.questions.filter((q,i)=>q.answer!==quiz.answers[i]).map(q=>q.seq);
    const detail={level:quiz.level,kind:quiz.kind,scope:quiz.dueOnly?'due':'selection',total:quiz.questions.length,correct,wrong,saved:false};
    window.dispatchEvent(new CustomEvent('hanzi:syllabus-quiz',{detail}));quiz.saved=detail.saved;
  }
  function renderQuiz(result) {
    if(!quiz){result.textContent='Chọn “Luyện trắc nghiệm” để bắt đầu.';return;}
    const {questions,answers,index}=quiz;
    if(index===questions.length) {
      const wrong=questions.filter((q,i)=>q.answer!==answers[i]),correct=questions.length-wrong.length;
      result.innerHTML=`<h3 tabindex="-1">Kết quả luyện tập: ${correct}/${questions.length}</h3><p>HSK ${h(quiz.level)} · ${Math.round(correct*100/questions.length)}%. ${quiz.kind==='pinyin'?'Luyện pinyin theo đề cương':'Luyện nghĩa tiếng Anh từ CC-CEDICT'}${quiz.dueOnly?' · từ đến hạn ôn':''}; chưa phải bài thi chuẩn hóa. Lịch SRS chỉ thay đổi khi bạn tự đánh giá thẻ.</p><p role="status">${quiz.saved?'Đã lưu kết quả trên thiết bị; có thể đồng bộ theo tài khoản.':'Chưa lưu được kết quả. Kiểm tra dung lượng thiết bị rồi thử lưu lại.'}</p>${wrong.length?`<h4>Từ cần luyện lại</h4><ul>${wrong.map(q=>`<li><span lang="zh-Hans">${h(q.word)}</span> (${h(q.pinyin)}): ${h(q.options[q.answer])}</li>`).join('')}</ul>`:''}<div class="cloud-actions">${wrong.length?'<button type="button" class="btn" data-syl="quiz-wrong">Luyện lại từ sai</button>':''}<button type="button" class="btn" data-syl="quiz-new">Bài luyện mới</button>${quiz.saved?'':'<button type="button" class="btn" data-syl="quiz-save">Lưu lại kết quả</button>'}</div>`;
      return;
    }
    const q=questions[index],answered=answers.length>index,correct=answered&&answers[index]===q.answer;
    result.innerHTML=`<p>Câu ${index+1}/${questions.length} · ${quiz.kind==='pinyin'?'Chọn pinyin':'Chọn nghĩa tiếng Anh'}${quiz.dueOnly?' · từ đến hạn ôn':''}</p><h3 class="reference-word" lang="zh-Hans">${h(q.word)}</h3>${quiz.kind==='meaning'||answered?`<p lang="zh-Latn">${h(q.pinyin)}</p>`:''}<div class="cloud-form">${q.options.map((option,i)=>`<button type="button" class="btn" data-syl="quiz-answer" data-option="${i}" lang="${quiz.kind==='pinyin'?'zh-Latn':'en'}" ${answered?'disabled':''}>${h(option)}</button>`).join('')}</div>${answered?`<p role="status">${correct?'Chính xác.':'Chưa đúng.'} Đáp án: <span lang="${quiz.kind==='pinyin'?'zh-Latn':'en'}">${h(q.options[q.answer])}</span></p><button type="button" class="btn btn-primary" data-syl="quiz-next">${index===questions.length-1?'Xem kết quả':'Câu tiếp theo'}</button>`:''}`;
    result.insertAdjacentHTML('beforeend',`<button type="button" class="btn report-question" data-syl="report">${q.reported?'Đã báo câu này':'Báo câu cần kiểm tra'}</button>`);
  }
  async function review(decision) {
    const owner=sessionEpoch,reviewLevel=level,activeClient=client;
    const rows = (cache.get(level) || []).filter(r => r.review_status === (decision === 'published' ? 'draft' : 'published'));
    if (!rows.length) return;
    if (!confirm(decision === 'published' ? `Xuất bản ${rows.length} mục HSK ${level} cho học viên? Hãy chắc chắn bạn đã đối chiếu với đề cương.` : `Ẩn ${rows.length} mục HSK ${level} khỏi học viên?`)) return;
    status('Đang cập nhật trạng thái...');
    try {
      // review_vocab_entries accepts at most 1000 序号 per call.
      for (let i = 0; i < rows.length; i += 1000) {if(owner!==sessionEpoch)return;await reply(activeClient.rpc('review_vocab_entries', {entry_syllabus: SYLLABUS, entry_seqs: rows.slice(i, i + 1000).map(r => r.seq), decision}));}
      if(owner!==sessionEpoch)return;
      cache.delete(reviewLevel); await load();
      if(owner!==sessionEpoch)return;
      status(decision === 'published' ? `Đã xuất bản ${rows.length} mục HSK ${reviewLevel}.` : `Đã ẩn ${rows.length} mục HSK ${reviewLevel} khỏi học viên.`);
    } catch { if(owner!==sessionEpoch)return;cache.delete(reviewLevel);await load();if(owner===sessionEpoch)status('Không cập nhật được. Chức năng này cần quyền quản trị viên.', true); }
  }
  // Keep the review box open across re-renders.
  root.addEventListener('toggle', event => { if (event.target.matches?.('.syllabus-admin')) adminOpen = event.target.open; }, true);
  root.addEventListener('submit', event => {
    if (event.target.id !== 'syllabus-search') return;
    event.preventDefault(); const values = new FormData(event.target);
    query = values.get('query').trim(); page = 0; position = 0; revealed = false; quiz = null; stage = null; view = query ? 'list' : 'stages'; load();
  });
  root.addEventListener('change',event=>{
    if(event.target.matches('[data-syl-stage-select]')){const value=event.target.value;stage=value==='all'?null:Number(value);position=0;revealed=false;renderResults();rememberLocation();}
    if(event.target.matches('[data-syl-mode]')){cardMode=event.target.value;view='cards';position=0;revealed=false;renderResults();rememberLocation();}
  });
  root.addEventListener('click', async event => {
    const levelButton = event.target.closest('[data-syl-level]');
    if (levelButton) { chooseLevel(levelButton.dataset.sylLevel); return; }
    const stageButton = event.target.closest('[data-syl-stage]');
    if (stageButton) { stage = Number(stageButton.dataset.sylStage); view = 'cards'; position = 0; revealed = false; page = 0; renderResults();rememberLocation();root.querySelector('.syllabus-study-card')?.scrollIntoView({block:'start',behavior:'instant'});root.querySelector('[data-syl="reveal"]')?.focus({preventScroll:true});return; }
    const button = event.target.closest('[data-syl]'); if (!button) return;
    const action = button.dataset.syl, list = ['cards','due'].includes(view) ? cardRows() : words(), r = list[position];
    if(action==='reload'){load();return;}
    if(action==='report'&&quiz?.questions[quiz.index]){const q=quiz.questions[quiz.index];q.kind=quiz.kind;reports.open(q);return;}
    if(action==='missing'&&admin()){stage=null;query='';position=0;page=0;view='missing';const input=root.querySelector('[name="query"]');if(input)input.value='';renderResults();status('Chỉ liệt kê mục thiếu nghĩa Anh. Giữ trống cho tới khi biên tập viên có nguồn và duyệt nội dung.');return;}
    if(action==='audio-review'){
      if(!admin()||shownCard===null)return;
      const owner=sessionEpoch,seq=shownCard;button.disabled=true;
      try{
        const changed=await reply(client.rpc('review_example_audio',{entry_syllabus:SYLLABUS,entry_seq:seq,entry_zh_id:Number(button.dataset.zh),entry_audio_id:Number(button.dataset.audio),decision:button.dataset.decision}));
        if(owner===sessionEpoch)status(changed===1?'Đã cập nhật trạng thái bản ghi.':'Không có bản ghi để cập nhật.',changed!==1);
      }catch(error){if(owner===sessionEpoch)status(error.message?.includes('publish_sentence_first')?'Xuất bản câu ví dụ trước khi duyệt bản ghi.':'Không cập nhật được bản ghi. Thử lại hoặc kiểm tra quyền quản trị.',true);}
      if(owner!==sessionEpoch)return;examples.delete(seq);renderResults();return;
    }
    if(action==='tools'){const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));root.classList.toggle('show-study-tools',open);return;}
    if(action==='quiz'){startQuiz();return;}
    if(action==='quiz-pinyin'){startQuiz(null,'pinyin');return;}
    if(action==='quiz-new'){startQuiz(null,quiz.kind);return;}
    if(action==='quiz-wrong'){startQuiz(quiz.questions.filter((q,i)=>q.answer!==quiz.answers[i]).map(q=>q.seq),quiz.kind);return;}
    if(action==='quiz-save'){if(quiz&&!quiz.saved&&quiz.index===quiz.questions.length){saveQuiz();renderResults();}return;}
    if(action==='quiz-answer'){
      const chosen=Number(button.dataset.option);
      if(quiz&&quiz.index<quiz.questions.length&&quiz.answers.length===quiz.index&&Number.isInteger(chosen)&&chosen>=0&&chosen<4){quiz.answers.push(chosen);renderResults();root.querySelector('[data-syl="quiz-next"]')?.focus();}
      return;
    }
    if(action==='quiz-next'){if(quiz&&quiz.answers.length===quiz.index+1){quiz.index++;if(quiz.index===quiz.questions.length)saveQuiz();renderResults();(root.querySelector('[data-syl="quiz-answer"]')||root.querySelector('#syllabus-results h3'))?.focus();}return;}
    if (action === 'stages') { stage = null; view = 'stages'; renderResults(); return; }
    if (action === 'list' || action === 'cards' || action === 'due') { cardMode='all';view = action; position = 0; revealed = false; renderResults(); return; }
    if (action === 'publish' || action === 'unpublish') { button.disabled = true; await review(action === 'publish' ? 'published' : 'draft'); return; }
    if (action === 'say') { window.speak?.(button.dataset.word); return; }
    if (action === 'examples-retry') {
      if (shownCard === null || !revealed) return;
      examples.delete(shownCard); renderResults(); return;
    }
    if (action === 'example-review') {
      if (shownCard === null || !admin()) return;
      const owner = sessionEpoch, seq = shownCard; button.disabled = true;
      try {
        const changed = await reply(client.rpc('review_example_sentences', {entry_syllabus: SYLLABUS, entry_seq: seq, entry_zh_ids: [Number(button.dataset.zh)], decision: button.dataset.decision}));
        if (owner === sessionEpoch) status(changed === 1 ? `Đã chuyển câu ví dụ sang “${STATUS[button.dataset.decision]}”.` : 'Câu ví dụ không còn tồn tại. Đã tải lại danh sách.', changed !== 1);
      }
      catch { if (owner === sessionEpoch) status('Không cập nhật được câu ví dụ. Chức năng này cần quyền quản trị viên.', true); }
      if (owner !== sessionEpoch) return;
      examples.delete(seq); renderResults(); return;
    }
    if (action === 'prev-page') page--; if (action === 'next-page') page++;
    if (!r && !action.endsWith('page')) return;
    if (action === 'next' || action === 'previous') { position = (position + (action === 'next' ? 1 : list.length - 1)) % list.length; revealed = false; }
    if (action === 'reveal') revealed = !revealed;
    if (action === 'speak') { window.speak?.(r.word); return; }
    if (studyRatings.includes(action)) {
      if (!revealed) return;
      const detail = {id: entryId(r.seq), rating: action, saved: false};
      window.dispatchEvent(new CustomEvent('hanzi:reference-rating', {detail}));
      if (!detail.saved) { status('Không lưu được lượt ôn. Kiểm tra dung lượng thiết bị.', true); return; }
      status('Đã cập nhật lượt ôn trên thiết bị. Đồng bộ theo tài khoản nếu bạn đã bật đồng bộ.');
      if(view!=='due'&&cardMode==='all')position=(position+1)%list.length;revealed=false;
    }
    renderResults();
    if(['previous','next',...studyRatings].includes(action)){rememberLocation();focusStudyCard(root);}
    if(action==='reveal')focusStudyCard(root,true);
  });
  function chooseLevel(next, nextView, resume=false) {
    if (![...LEVELS, 'all'].includes(next)) return;
    if(resume&&next===level&&cache.has(next)&&['cards','due'].includes(view))return;
    rememberLocation();
    resumeSeq=null;
    cardMode='all';level = next; stage = null; quiz = null; query = ''; page = 0; position = 0; revealed = false; view = ['due', 'cards', 'list'].includes(nextView) ? nextView : level === 'all' ? 'list' : 'stages';
    try { if (level !== 'all') localStorage.setItem(LEVEL_KEY, level); } catch {}
    if(resume)restoreLocation();
    root.querySelectorAll('[data-syl-level]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.sylLevel === level)));
    const input = root.querySelector('#syllabus-search [name="query"]'); if (input) input.value = '';
    if (client && profile) load();
  }
  // Links elsewhere (roadmap, old HSK 3 library) open the library on a level: data-go="hsk" data-hsk-level="4".
  document.addEventListener('click', event => { const link = event.target.closest('[data-hsk-level]'); if (link) chooseLevel(link.dataset.hskLevel, link.dataset.hskView); }, true);
  render();
  return { openLevel: chooseLevel, get level() { return level; }, setSession(nextClient, nextProfile) { if (client === nextClient && profile?.id === nextProfile?.id && profile?.role === nextProfile?.role) return;sessionEpoch++; reports.reset();exampleReview.reset();examples.clear(); client = nextClient; profile = nextProfile; render(); } };
}
