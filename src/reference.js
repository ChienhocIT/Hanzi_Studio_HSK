import {h,field} from './ui.js';
import {renderStudyCard,focusStudyCard,mountStudyKeyboard,studyRatings,recordStudyRating} from './study-card.js';
let corpus;
let pending;
export async function loadReference(fetcher=fetch) {
  if(corpus)return corpus;
  if(!pending)pending=fetcher('./data/hsk2-reference.json').then(async response=>{
    if(!response.ok)throw Error('Không tải được bộ từ tham khảo. Kiểm tra kết nối và thử lại.');
    const data=await response.json();
    if(data.format!=='hanzi-reference-v1'||!Array.isArray(data.words)||data.license!=='CC-BY-SA-4.0')throw Error('Dữ liệu nguồn không hợp lệ.');
    corpus=data;return data;
  }).finally(()=>{pending=null;});
  return pending;
}
const stateKey='hanzi-studio-curriculum-v4';
export function mountReference(root) {
  mountStudyKeyboard(root);
  let level='1',query='',page=0,position=0,revealed=false,view='list';
  root.innerHTML=`<div class="panel" id="reference-panel"><h3>Từ vựng tham khảo HSK 2.0</h3><p>Danh sách cộng đồng HSK 1-6, nghĩa tiếng Anh từ CC-CEDICT. Tách riêng với học liệu HSK 3 đang có; chưa được giáo viên duyệt theo đề cương hiện hành.</p><button type="button" class="btn" data-ref="load">Mở bộ từ tham khảo</button><p id="reference-status" role="status"></p><div id="reference-content"></div></div>`;
  const status=text=>root.querySelector('#reference-status').textContent=text;
  const content=root.querySelector('#reference-content');
  const filtered=()=>corpus.words.filter(w=>(level==='all'||w.level===level)&&(!query||[w.word,...w.entries.flatMap(e=>[e.pinyin,...e.definitions])].join(' ').toLowerCase().includes(query.toLowerCase())));
  const entryHtml=w=>w.entries.length?w.entries.map(entry=>`<div><p lang="zh-Latn">${h(entry.pinyin)}</p><p lang="en">${entry.definitions.map(h).join('; ')}</p></div>`).join(''):'<p>Chưa có nghĩa đối chiếu. Cần biên tập bổ sung.</p>';
  const progress=id=>{
    // Restorable from backups and cloud sync: keep only numbers before they reach HTML.
    try{const r=JSON.parse(localStorage.getItem(stateKey)||'{}').progress?.[id];return r?{reps:Math.max(0,Number.parseInt(r.reps,10)||0),due:Number(r.due)||0,lastRating:studyRatings.includes(r.lastRating)?r.lastRating:null}:null;}catch{return null;}
  };
  function renderResults() {
    const words=filtered();
    const result=root.querySelector('#reference-results');
    if(!result)return;
    if(!words.length){result.innerHTML='<p>Không có mục phù hợp. Thử cấp độ hoặc từ khóa khác.</p>';return;}
    if(view==='cards') {
      position=Math.min(position,words.length-1);const word=words[position];
      const record=progress(word.id);
      result.innerHTML=renderStudyCard({namespace:'ref',word:word.word,answerHtml:entryHtml(word).replaceAll('<p lang="zh-Latn">','<p class="card-back-py" lang="zh-Latn">'),position,total:words.length,record,revealed,source:'HSK '+word.level+' (tham khảo)'});
    } else {
      const pages=Math.ceil(words.length/25);page=Math.min(page,pages-1);
      result.innerHTML=`<p>Tìm thấy ${words.length.toLocaleString('vi-VN')} mục. Trang ${page+1}/${pages}.</p><div class="cloud-actions"><button type="button" class="btn" data-ref="prev-page" ${page===0?'disabled':''}>Trang trước</button><button type="button" class="btn" data-ref="next-page" ${page>=pages-1?'disabled':''}>Trang sau</button></div><div class="cloud-list">${words.slice(page*25,page*25+25).map(word=>`<article><h4 lang="zh-Hans">${h(word.word)} <small>HSK ${h(word.level)}</small></h4>${entryHtml(word)}</article>`).join('')}</div>`;
    }
  }
  function render() {
    status(`Đã nạp ${corpus.count.toLocaleString('vi-VN')} mục; ${corpus.missingDefinitions.length} mục chưa có nghĩa đối chiếu. Phiên âm dạng số: 1-4 là thanh điệu, 5 là thanh nhẹ. Nghĩa tiếng Anh chưa dịch/duyệt tiếng Việt.`);
    content.innerHTML=`<p class="panel-sub">Nguồn: Wiktionary contributors và CC-CEDICT contributors/MDBG, CC BY-SA 4.0. Đã trích xuất, ghép theo chữ giản thể; giữ các cách đọc/nghĩa. Không phải đề cương HSK 3.0 hay ngân hàng đề chính thức.</p><div class="cloud-actions"><a href="./data/hsk2-reference.json" download>Tải dữ liệu và nguồn</a><a href="./data/hsk2-provenance.json" target="_blank" rel="noopener noreferrer">Phiên bản và lịch sử nguồn</a><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">Giấy phép CC BY-SA 4.0</a><a href="./data/CC-BY-SA-4.0.txt" target="_blank" rel="noopener noreferrer">Toàn văn giấy phép</a></div><form id="reference-search" class="cloud-form"><label>Cấp độ tham khảo<select name="level">${['1','2','3','4','5','6','all'].map(l=>`<option value="${l}" ${l===level?'selected':''}>${l==='all'?'Tất cả':`HSK ${l}`}</option>`).join('')}</select></label>${field('Tìm chữ Hán, Pinyin hoặc nghĩa tiếng Anh','query','search',`value="${h(query)}" maxlength="100"`)}<button class="btn">Tra cứu</button></form><div class="cloud-actions"><button type="button" class="btn" data-ref="list">Danh sách từ</button><button type="button" class="btn" data-ref="cards">Luyện thẻ tham khảo</button></div><div id="reference-results"></div>`;
    // Empty search is valid; shared field() normally marks inputs required.
    content.querySelector('[name="query"]').required=false;
    renderResults();
  }
  root.addEventListener('submit',event=>{
    if(event.target.id!=='reference-search')return;
    event.preventDefault();const values=new FormData(event.target);level=values.get('level');query=values.get('query').trim();page=0;position=0;revealed=false;renderResults();
  });
  root.addEventListener('click',async event=>{
    const button=event.target.closest('[data-ref]');if(!button)return;
    const action=button.dataset.ref;
    if(action==='reveal'&&event.target.closest('a,button,audio,input,select,textarea')&&!event.target.matches('[data-study-flip]'))return;
    if(action==='load') {
      button.disabled=true;status('Đang tải bộ từ tham khảo...');
      try{await loadReference();render();button.remove();}catch(error){status(error.message);button.disabled=false;}return;
    }
    const words=filtered(),word=words[position];
    if(action==='list'||action==='cards'){view=action;renderResults();return;}
    if(action==='prev-page')page--;if(action==='next-page')page++;
    if(!word)return;
    if(action==='next'||action==='previous'){position=(position+(action==='next'?1:words.length-1))%words.length;revealed=false;}
    if(action==='reveal')revealed=!revealed;
    if(action==='speak') {if(typeof window.speak==='function')window.speak(word.word);return;}
    if(studyRatings.includes(action)) {
      if(!revealed)return;
      if(!word.entries.length){status('Mục này chưa có nghĩa đối chiếu. Cần biên tập trước khi ghi nhận ôn tập.');return;}
      const detail={id:word.id,rating:action,saved:false};
      window.dispatchEvent(new CustomEvent('hanzi:reference-rating',{detail}));
      if(!detail.saved){status('Không lưu được lượt ôn. Giữ thẻ hiện tại và kiểm tra dung lượng thiết bị.');return;}
      recordStudyRating('ref',action);
      status('Đã cập nhật lượt ôn tham khảo trên thiết bị. Đồng bộ theo tài khoản nếu bạn đã bật đồng bộ.');
      position=(position+1)%words.length;revealed=false;
    }
    renderResults();
    focusStudyCard(root,action==='reveal');
  });
}
