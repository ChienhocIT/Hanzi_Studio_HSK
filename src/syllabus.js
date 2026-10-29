import { h, field } from './ui.js';
import {vocabularyQuiz} from './vocabulary-quiz.js';
// HSK 1–9 study screen over the 2025 CLEC syllabus list in vocab_entries, with CC-CEDICT English glosses.
// Only served to signed-in accounts (redistribution rights are unclear); learners see published rows,
// teachers/admins also see drafts. Card ratings join the curriculum SRS through hanzi:reference-rating.
export const SYLLABUS = 'HSK 3.0 (CLEC 2025)';
const LEVELS = ['1','2','3','4','5','6','7-9'];
const PAGE = 30, FETCH = 1000, stateKey = 'hanzi-studio-curriculum-v4';
const STATUS = {draft:'Bản nháp',published:'Đã xuất bản',rejected:'Đã loại'};
const POS = {名:'danh từ',动:'động từ',形:'tính từ',副:'phó từ',量:'lượng từ',代:'đại từ',介:'giới từ',连:'liên từ',助:'trợ từ',叹:'thán từ',数:'số từ',拟声:'từ tượng thanh',前缀:'tiền tố',后缀:'hậu tố'};
const plain = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'u').toLowerCase().replace(/[\s'’-]/g,'');
const reply = async request => { const { data, error } = await request; if (error) throw error; return data; };
export const entryId = seq => `clec2025-${seq}`;
export function mountSyllabus(root) {
  if (!root) return { setSession() {} };
  let client = null, profile = null, level = '1', query = '', page = 0, position = 0, revealed = false, view = 'list', adminOpen = false;
  let sessionEpoch=0,loadEpoch=0,quiz=null;
  const cache = new Map();
  const admin = () => profile?.role === 'admin', staff = () => ['teacher','admin'].includes(profile?.role);
  root.innerHTML = `<div class="art-hero hsk-hero"><picture class="art-hero-media"><source media="(max-width:700px)" srcset="./assets/illustrations/banner-reading-mobile.webp" width="750" height="900"><img src="./assets/illustrations/banner-reading-desktop.webp" alt="" width="1600" height="600"></picture><div class="art-hero-copy"><h1>Từ vựng HSK 1–9</h1><p>11.000 từ của đề cương HSK 3.0 (2025): tra cứu, nghe, luyện thẻ và ôn đúng lúc.</p></div></div><div class="panel" id="syllabus-panel"><p id="syllabus-status" role="status" aria-live="polite"></p><div id="syllabus-content"></div></div>`;
  const status = (text, error = false) => { const el = root.querySelector('#syllabus-status'); el.textContent = text; el.classList.toggle('cloud-error', error); };
  const content = root.querySelector('#syllabus-content');
  const words = () => {
    const rows = level === 'all' ? LEVELS.flatMap(l => cache.get(l) || []) : cache.get(level) || [];
    const q = plain(query);
    return q ? rows.filter(r => r.word.includes(query.trim()) || plain(r.pinyin).includes(q)) : rows;
  };
  // Progress is restorable from backups and cloud sync, so treat it as untrusted and keep only numbers.
  const progress = seq => { try { const r = JSON.parse(localStorage.getItem(stateKey) || '{}').progress?.[entryId(seq)]; return r ? {reps: Math.max(0, Number.parseInt(r.reps, 10) || 0), due: Number(r.due) || 0} : null; } catch { return null; } };
  const posText = r => [...r.pos, ...r.pos_extra.map(p => `(${p})`)].map(p => { const key = p.replace(/[()]/g,''); return `<abbr title="${h(POS[key] || key)}">${h(p)}</abbr>`; }).join('、') || '<span class="panel-sub">cụm từ</span>';
  const meaning = r => r.gloss_en?.length ? `<p lang="en" class="panel-sub">${r.gloss_en.map(h).join('; ')}</p>` : '';
  const isDue = r => { const p = progress(r.seq); return Boolean(p && p.due <= Date.now()); };
  const label = r => `${h(r.word)}${r.homograph ? `<sup>${r.homograph}</sup>` : ''}`;
  const extra = r => r.extra_levels.length ? ` · nghĩa mở rộng ở HSK ${r.extra_levels.map(h).join(', ')}` : '';
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
    try {
      for (const name of needed) {await fetchLevel(name,owner,activeClient);if(owner!==sessionEpoch||request!==loadEpoch)return;}
      const total = needed.reduce((n, name) => n + cache.get(name).length, 0);
      status(total ? `HSK ${level === 'all' ? '1–9' : level}: ${total.toLocaleString('vi-VN')} mục.` : staff() ? 'Danh mục chưa được nạp vào database. Người vận hành chạy npm run db:seed-vocabulary.' : 'Cấp này chưa có mục nào được duyệt cho học viên.');
    } catch { if(owner!==sessionEpoch||request!==loadEpoch)return;status('Không tải được danh mục. Kiểm tra kết nối và thử lại.', true); }
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
    if(view==='quiz'){renderQuiz(result);return;}
    const list = view === 'due' ? words().filter(isDue) : words();
    result.innerHTML = adminTools();
    if (!list.length) { result.insertAdjacentHTML('beforeend', `<p>${view === 'due' ? 'Chưa có từ nào đến hạn ôn ở cấp này. Luyện thẻ và bấm “Đã nhớ” để bắt đầu lịch ôn.' : query ? 'Không có mục phù hợp. Thử chữ Hán hoặc pinyin khác (gõ không dấu cũng được).' : 'Chưa có mục để hiển thị.'}</p>`); return; }
    if (view === 'cards' || view === 'due') {
      position = Math.min(position, list.length - 1); const r = list[position], record = progress(r.seq);
      result.insertAdjacentHTML('beforeend', `<p>${position + 1} / ${list.length.toLocaleString('vi-VN')} · HSK ${h(r.level)}${extra(r)}</p><p class="reference-word" lang="zh-Hans">${label(r)}</p>${revealed ? `<p lang="zh-Latn" class="syllabus-pinyin">${h(r.pinyin)}</p><p>${posText(r)}</p>${meaning(r)}` : '<p>Đọc to từ này, nhớ pinyin và nghĩa, rồi mở đáp án.</p>'}<p>${record?.reps ? `Đã nhớ ${record.reps} lượt. Lần ôn: ${new Date(record.due).toLocaleString('vi-VN')}` : 'Chưa có lượt ghi nhớ.'}</p><div class="cloud-actions"><button type="button" class="btn" data-syl="previous">Thẻ trước</button><button type="button" class="btn" data-syl="reveal">${revealed ? 'Ẩn đáp án' : 'Mở đáp án'}</button><button type="button" class="btn" data-syl="next">Thẻ sau</button><button type="button" class="btn" data-syl="speak">Nghe giọng thiết bị</button>${revealed ? '<button type="button" class="btn" data-syl="again">Cần ôn lại</button><button type="button" class="btn" data-syl="good">Đã nhớ</button>' : ''}</div>`);
      return;
    }
    const pages = Math.ceil(list.length / PAGE); page = Math.min(page, pages - 1);
    result.insertAdjacentHTML('beforeend', `<p>Tìm thấy ${list.length.toLocaleString('vi-VN')} mục. Trang ${page + 1}/${pages}.</p><div class="cloud-actions"><button type="button" class="btn" data-syl="prev-page" ${page === 0 ? 'disabled' : ''}>Trang trước</button><button type="button" class="btn" data-syl="next-page" ${page >= pages - 1 ? 'disabled' : ''}>Trang sau</button></div><div class="table-wrap"><table class="syllabus-table"><thead><tr><th scope="col">STT</th><th scope="col">Từ</th><th scope="col">Pinyin</th><th scope="col">Từ loại</th><th scope="col">Cấp</th>${staff() ? '<th scope="col">Trạng thái</th>' : ''}<th scope="col"><span class="sr-only">Nghe</span></th></tr></thead><tbody>${list.slice(page * PAGE, page * PAGE + PAGE).map(r => `<tr><td>${r.seq}</td><td lang="zh-Hans" class="syllabus-word">${label(r)}${meaning(r)}</td><td lang="zh-Latn">${h(r.pinyin)}</td><td>${posText(r)}</td><td>${h(r.level)}${r.extra_levels.length ? ` <small>(+${r.extra_levels.map(h).join(', ')})</small>` : ''}</td>${staff() ? `<td>${h(STATUS[r.review_status] || r.review_status)}<br><small>Trang ${h(r.source_page ?? '?')}</small></td>` : ''}<td><button type="button" class="btn btn-icon" data-syl="say" data-word="${h(r.word)}" aria-label="Nghe ${h(r.word)}">Nghe</button></td></tr>`).join('')}</tbody></table></div>`);
  }
  function render() {
    cache.clear(); position = 0; page = 0; revealed = false; quiz=null;view='list';
    if (!client) { content.innerHTML = window.HANZI_CLOUD_CONFIG?.url ? '<p class="cloud-loading">Đang kiểm tra phiên đăng nhập...</p>' : '<p>Danh mục được lưu trên máy chủ đồng bộ. Tính năng này cần quản trị viên kết nối Supabase.</p>'; status(''); return; }
    if (!profile) { content.innerHTML = '<div class="gate"><p>Đăng nhập để tra cứu và luyện 11.000 từ của đề cương HSK 3.0.</p><button type="button" class="btn btn-primary" data-go="auth" data-auth-view="login">Đăng nhập để mở danh mục</button></div>'; status(''); return; }
    content.innerHTML = `<form id="syllabus-search" class="cloud-form"><label>Cấp độ<select name="level">${[...LEVELS, 'all'].map(l => `<option value="${l}" ${l === level ? 'selected' : ''}>${l === 'all' ? 'Tất cả (1–9)' : `HSK ${l}`}</option>`).join('')}</select></label>${field('Tìm chữ Hán hoặc pinyin','query','search',`value="${h(query)}" maxlength="60"`)}<button class="btn">Tra cứu</button></form><div class="cloud-actions"><button type="button" class="btn" data-syl="list">Danh sách từ</button><button type="button" class="btn" data-syl="cards">Luyện thẻ</button><button type="button" class="btn" data-syl="due">Ôn từ đến hạn</button></div><div id="syllabus-results"></div><p class="panel-sub syllabus-source">Danh mục từ: 《中文水平考试 HSK 考试大纲》, 中外语言交流合作中心 (CLEC), 2025, không ghi giấy phép; chỉ lưu từ, cấp, pinyin, từ loại kèm trích dẫn và số trang, không phải ngân hàng đề thi. Nghĩa tiếng Anh: <a href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict" target="_blank" rel="noopener noreferrer">CC-CEDICT</a> (CC-CEDICT contributors, MDBG), <a href="./data/CC-BY-SA-4.0.txt" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>, chọn theo cách đọc của đề cương. Chưa có nghĩa tiếng Việt.</p>`;
    content.querySelector('[name="query"]').required = false;
    content.querySelector('.cloud-actions').insertAdjacentHTML('beforeend','<button type="button" class="btn" data-syl="quiz">Luyện trắc nghiệm</button>');
    load();
  }
  function startQuiz(sequences=null) {
    const pool=sequences?quiz.pool:words(),questions=vocabularyQuiz(pool,{sequences});
    if(!questions.length){status('Cần ít nhất 4 từ đã xuất bản có nghĩa khác nhau. Chọn cấp rộng hơn hoặc bỏ bộ lọc tìm kiếm.',true);return;}
    quiz={pool,questions,answers:[],level,index:0,saved:false};view='quiz';status('');renderResults();
  }
  function saveQuiz() {
    const correct=quiz.answers.filter((a,i)=>a===quiz.questions[i].answer).length;
    const wrong=quiz.questions.filter((q,i)=>q.answer!==quiz.answers[i]).map(q=>q.seq);
    const detail={level:quiz.level,total:quiz.questions.length,correct,wrong,saved:false};
    window.dispatchEvent(new CustomEvent('hanzi:syllabus-quiz',{detail}));quiz.saved=detail.saved;
  }
  function renderQuiz(result) {
    if(!quiz){result.textContent='Chọn “Luyện trắc nghiệm” để bắt đầu.';return;}
    const {questions,answers,index}=quiz;
    if(index===questions.length) {
      const wrong=questions.filter((q,i)=>q.answer!==answers[i]),correct=questions.length-wrong.length;
      result.innerHTML=`<h3>Kết quả luyện tập: ${correct}/${questions.length}</h3><p>HSK ${h(quiz.level)} · ${Math.round(correct*100/questions.length)}%. Luyện nghĩa tiếng Anh từ CC-CEDICT; chưa phải bài thi chuẩn hóa. Lịch SRS chỉ thay đổi khi bạn tự đánh giá thẻ.</p><p role="status">${quiz.saved?'Đã lưu kết quả trên thiết bị; có thể đồng bộ theo tài khoản.':'Chưa lưu được kết quả. Kiểm tra dung lượng thiết bị rồi thử lưu lại.'}</p>${wrong.length?`<h4>Từ cần luyện lại</h4><ul>${wrong.map(q=>`<li><span lang="zh-Hans">${h(q.word)}</span> (${h(q.pinyin)}): ${h(q.options[q.answer])}</li>`).join('')}</ul>`:''}<div class="cloud-actions">${wrong.length?'<button type="button" class="btn" data-syl="quiz-wrong">Luyện lại từ sai</button>':''}<button type="button" class="btn" data-syl="quiz">Bài luyện mới</button>${quiz.saved?'':'<button type="button" class="btn" data-syl="quiz-save">Lưu lại kết quả</button>'}</div>`;
      return;
    }
    const q=questions[index],answered=answers.length>index,correct=answered&&answers[index]===q.answer;
    result.innerHTML=`<p>Câu ${index+1}/${questions.length} · Chọn nghĩa tiếng Anh</p><h3 class="reference-word" lang="zh-Hans">${h(q.word)}</h3><p lang="zh-Latn">${h(q.pinyin)}</p><div class="cloud-form">${q.options.map((option,i)=>`<button type="button" class="btn" data-syl="quiz-answer" data-option="${i}" ${answered?'disabled':''}>${h(option)}</button>`).join('')}</div>${answered?`<p role="status">${correct?'Chính xác.':'Chưa đúng.'} Đáp án: <span lang="en">${h(q.options[q.answer])}</span></p><button type="button" class="btn btn-primary" data-syl="quiz-next">${index===questions.length-1?'Xem kết quả':'Câu tiếp theo'}</button>`:''}`;
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
    level = values.get('level'); query = values.get('query').trim(); page = 0; position = 0; revealed = false;quiz=null;view='list'; load();
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-syl]'); if (!button) return;
    const action = button.dataset.syl, list = words(), r = list[position];
    if(action==='quiz'){startQuiz();return;}
    if(action==='quiz-wrong'){startQuiz(quiz.questions.filter((q,i)=>q.answer!==quiz.answers[i]).map(q=>q.seq));return;}
    if(action==='quiz-save'){if(quiz&&!quiz.saved&&quiz.index===quiz.questions.length){saveQuiz();renderResults();}return;}
    if(action==='quiz-answer'){
      const chosen=Number(button.dataset.option);
      if(quiz&&quiz.index<quiz.questions.length&&quiz.answers.length===quiz.index&&Number.isInteger(chosen)&&chosen>=0&&chosen<4){quiz.answers.push(chosen);renderResults();root.querySelector('[data-syl="quiz-next"]')?.focus();}
      return;
    }
    if(action==='quiz-next'){if(quiz&&quiz.answers.length===quiz.index+1){quiz.index++;if(quiz.index===quiz.questions.length)saveQuiz();renderResults();}return;}
    if (action === 'list' || action === 'cards' || action === 'due') { view = action; position = 0; revealed = false; renderResults(); return; }
    if (action === 'publish' || action === 'unpublish') { button.disabled = true; await review(action === 'publish' ? 'published' : 'draft'); return; }
    if (action === 'say') { window.speak?.(button.dataset.word); return; }
    if (action === 'prev-page') page--; if (action === 'next-page') page++;
    if (!r && !action.endsWith('page')) return;
    if (action === 'next' || action === 'previous') { position = (position + (action === 'next' ? 1 : list.length - 1)) % list.length; revealed = false; }
    if (action === 'reveal') revealed = !revealed;
    if (action === 'speak') { window.speak?.(r.word); return; }
    if (action === 'good' || action === 'again') {
      if (!revealed) return;
      const detail = {id: entryId(r.seq), rating: action, saved: false};
      window.dispatchEvent(new CustomEvent('hanzi:reference-rating', {detail}));
      if (!detail.saved) { status('Không lưu được lượt ôn. Kiểm tra dung lượng thiết bị.', true); return; }
      status('Đã cập nhật lượt ôn trên thiết bị. Đồng bộ theo tài khoản nếu bạn đã bật đồng bộ.');
      if (view !== 'due') position = (position + 1) % list.length; revealed = false;
    }
    renderResults();
  });
  render();
  return { setSession(nextClient, nextProfile) { if (client === nextClient && profile?.id === nextProfile?.id && profile?.role === nextProfile?.role) return;sessionEpoch++; client = nextClient; profile = nextProfile; render(); } };
}
