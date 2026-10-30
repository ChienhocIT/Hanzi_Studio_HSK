/* Hanzi Studio v4 · Curriculum Lab. Standalone local-first extension; no personal audio leaves this module. */
'use strict';
const HS30_LEVELS=[
 {id:'1',title:'HSK 1',newWords:300,total:300,tag:'Khởi đầu',icon:'一',desc:'Giao tiếp cơ bản · chào hỏi · bản thân'},
 {id:'2',title:'HSK 2',newWords:200,total:500,tag:'Sơ cấp',icon:'二',desc:'Thói quen · đời sống · trao đổi ngắn'},
 {id:'3',title:'HSK 3',newWords:500,total:1000,tag:'Nền tảng',icon:'三',desc:'Câu chuyện · tình huống · hội thoại'},
 {id:'4',title:'HSK 4',newWords:1000,total:2000,tag:'Trung cấp',icon:'四',desc:'Tường thuật · trình bày ý kiến'},
 {id:'5',title:'HSK 5',newWords:1600,total:3600,tag:'Trung cao',icon:'五',desc:'Đọc chủ đề xã hội · thảo luận'},
 {id:'6',title:'HSK 6',newWords:1800,total:5400,tag:'Cao cấp',icon:'六',desc:'Phân tích · diễn đạt sắc thái'},
 {id:'7-9',title:'HSK 7–9',newWords:5600,total:11000,tag:'Nâng cao',icon:'高',desc:'Một dải từ vựng nâng cao, không tách danh sách 7/8/9'}
];
const HS30_STARTER=[
    {
      "id": "curated-1-1",
      "level": 1,
      "hz": "你好",
      "py": "nǐ hǎo",
      "vi": "Xin chào",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-2",
      "level": 1,
      "hz": "谢谢",
      "py": "xièxie",
      "vi": "Cảm ơn",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-3",
      "level": 1,
      "hz": "再见",
      "py": "zàijiàn",
      "vi": "Tạm biệt",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-4",
      "level": 1,
      "hz": "我",
      "py": "wǒ",
      "vi": "Tôi",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-5",
      "level": 1,
      "hz": "你",
      "py": "nǐ",
      "vi": "Bạn",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-6",
      "level": 1,
      "hz": "他",
      "py": "tā",
      "vi": "Anh ấy",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-7",
      "level": 1,
      "hz": "她",
      "py": "tā",
      "vi": "Cô ấy",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-8",
      "level": 1,
      "hz": "我们",
      "py": "wǒmen",
      "vi": "Chúng tôi",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-9",
      "level": 1,
      "hz": "是",
      "py": "shì",
      "vi": "Là",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-10",
      "level": 1,
      "hz": "有",
      "py": "yǒu",
      "vi": "Có",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-11",
      "level": 1,
      "hz": "没有",
      "py": "méiyǒu",
      "vi": "Không có",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-12",
      "level": 1,
      "hz": "喜欢",
      "py": "xǐhuan",
      "vi": "Thích",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-13",
      "level": 1,
      "hz": "吃",
      "py": "chī",
      "vi": "Ăn",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-14",
      "level": 1,
      "hz": "喝",
      "py": "hē",
      "vi": "Uống",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-15",
      "level": 1,
      "hz": "水",
      "py": "shuǐ",
      "vi": "Nước",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-16",
      "level": 1,
      "hz": "茶",
      "py": "chá",
      "vi": "Trà",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-17",
      "level": 1,
      "hz": "学校",
      "py": "xuéxiào",
      "vi": "Trường học",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-18",
      "level": 1,
      "hz": "学生",
      "py": "xuésheng",
      "vi": "Học sinh",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-19",
      "level": 1,
      "hz": "老师",
      "py": "lǎoshī",
      "vi": "Giáo viên",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-20",
      "level": 1,
      "hz": "朋友",
      "py": "péngyou",
      "vi": "Bạn bè",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-21",
      "level": 1,
      "hz": "今天",
      "py": "jīntiān",
      "vi": "Hôm nay",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-22",
      "level": 1,
      "hz": "明天",
      "py": "míngtiān",
      "vi": "Ngày mai",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-23",
      "level": 1,
      "hz": "中国",
      "py": "Zhōngguó",
      "vi": "Trung Quốc",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-24",
      "level": 1,
      "hz": "汉语",
      "py": "Hànyǔ",
      "vi": "Tiếng Trung",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-1-25",
      "level": 1,
      "hz": "学习",
      "py": "xuéxí",
      "vi": "Học tập",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-1",
      "level": 2,
      "hz": "觉得",
      "py": "juéde",
      "vi": "Cảm thấy / Cho rằng",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-2",
      "level": 2,
      "hz": "需要",
      "py": "xūyào",
      "vi": "Cần",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-3",
      "level": 2,
      "hz": "已经",
      "py": "yǐjīng",
      "vi": "Đã",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-4",
      "level": 2,
      "hz": "因为",
      "py": "yīnwèi",
      "vi": "Bởi vì",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-5",
      "level": 2,
      "hz": "所以",
      "py": "suǒyǐ",
      "vi": "Vì vậy",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-6",
      "level": 2,
      "hz": "还是",
      "py": "háishi",
      "vi": "Hay là",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-7",
      "level": 2,
      "hz": "但是",
      "py": "dànshì",
      "vi": "Nhưng",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-8",
      "level": 2,
      "hz": "可能",
      "py": "kěnéng",
      "vi": "Có thể",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-9",
      "level": 2,
      "hz": "开始",
      "py": "kāishǐ",
      "vi": "Bắt đầu",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-10",
      "level": 2,
      "hz": "希望",
      "py": "xīwàng",
      "vi": "Hy vọng",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-11",
      "level": 2,
      "hz": "运动",
      "py": "yùndòng",
      "vi": "Vận động",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-2-12",
      "level": 2,
      "hz": "知道",
      "py": "zhīdào",
      "vi": "Biết",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-1",
      "level": 4,
      "hz": "经验",
      "py": "jīngyàn",
      "vi": "Kinh nghiệm",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-2",
      "level": 4,
      "hz": "适应",
      "py": "shìyìng",
      "vi": "Thích nghi",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-3",
      "level": 4,
      "hz": "鼓励",
      "py": "gǔlì",
      "vi": "Khuyến khích",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-4",
      "level": 4,
      "hz": "计划",
      "py": "jìhuà",
      "vi": "Kế hoạch",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-5",
      "level": 4,
      "hz": "沟通",
      "py": "gōutōng",
      "vi": "Giao tiếp",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-4-6",
      "level": 4,
      "hz": "保护",
      "py": "bǎohù",
      "vi": "Bảo vệ",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-5-1",
      "level": 5,
      "hz": "创新",
      "py": "chuàngxīn",
      "vi": "Đổi mới",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-5-2",
      "level": 5,
      "hz": "挑战",
      "py": "tiǎozhàn",
      "vi": "Thử thách",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-5-3",
      "level": 5,
      "hz": "发展趋势",
      "py": "fāzhǎn qūshì",
      "vi": "Xu hướng phát triển",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-5-4",
      "level": 5,
      "hz": "效率",
      "py": "xiàolǜ",
      "vi": "Hiệu suất",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-5-5",
      "level": 5,
      "hz": "策略",
      "py": "cèlüè",
      "vi": "Chiến lược",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-6-1",
      "level": 6,
      "hz": "可持续",
      "py": "kě chíxù",
      "vi": "Bền vững",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-6-2",
      "level": 6,
      "hz": "价值观",
      "py": "jiàzhíguān",
      "vi": "Giá trị quan",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-6-3",
      "level": 6,
      "hz": "跨文化",
      "py": "kuà wénhuà",
      "vi": "Liên văn hóa",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-6-4",
      "level": 6,
      "hz": "综合分析",
      "py": "zōnghé fēnxī",
      "vi": "Phân tích tổng hợp",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-7-9-1",
      "level": "7-9",
      "hz": "宏观经济",
      "py": "hóngguān jīngjì",
      "vi": "Kinh tế vĩ mô",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-7-9-2",
      "level": "7-9",
      "hz": "批判性思维",
      "py": "pīpànxìng sīwéi",
      "vi": "Tư duy phản biện",
      "source": "internal_demo",
      "reviewStatus": "sample"
    },
    {
      "id": "curated-7-9-3",
      "level": "7-9",
      "hz": "人工智能",
      "py": "réngōng zhìnéng",
      "vi": "Trí tuệ nhân tạo",
      "source": "internal_demo",
      "reviewStatus": "sample"
    }
  ];
const HS30_KEY='hanzi-studio-curriculum-v4';
let hs30State={level:'3',position:0,revealed:false,progress:{},injected:[],importLog:[],view:'cards',quiz:null,drawIndex:0,placement:null};
try{const saved=JSON.parse(localStorage.getItem(HS30_KEY)||'null');if(saved&&typeof saved==='object')hs30State={...hs30State,...saved,quiz:null,placement:null}}catch(_){}
const hsH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hsSave=()=>{try{const v={...hs30State,quiz:null,placement:null};localStorage.setItem(HS30_KEY,JSON.stringify(v));window.dispatchEvent(new Event('hanzi:progress'));return true}catch(_){hsNotify('Bộ nhớ thiết bị đã đầy. Hãy sao lưu dữ liệu.');return false}};
function hsRatingRecord(previous,rating){const reps=Math.max(0,parseInt(previous?.reps,10)||0),oldInterval=Math.max(0,Number(previous?.interval)||0),now=Date.now();let interval=0,nextReps=0;if(rating==='hard'){interval=oldInterval?Math.max(1,Math.ceil(oldInterval*1.3)):1;nextReps=Math.max(1,reps)}if(rating==='good'){interval=oldInterval?Math.ceil(oldInterval*2.2):1;nextReps=reps+1}if(rating==='easy'){interval=oldInterval?Math.max(4,Math.ceil(oldInterval*3)):4;nextReps=reps+1}return {reps:nextReps,interval,seenAt:now,due:now+(rating==='again'?600000:interval*86400000),lastRating:rating}}
window.addEventListener('hanzi:reference-rating',event=>{const {id,rating}=event.detail||{};if(typeof id!=='string'||!/^(wiktionary-hsk2-[1-6]-|clec2025-\d{1,5}$)/.test(id)||!['again','hard','good','easy'].includes(rating))return;const previous=hs30State.progress[id];hs30State.progress[id]=hsRatingRecord(previous,rating);event.detail.saved=hsSave();if(!event.detail.saved){if(previous)hs30State.progress[id]=previous;else delete hs30State.progress[id]}});
const hsNotify=x=>typeof toast==='function'?toast(x):console.info(x);
window.addEventListener('hanzi:study-location',event=>{
  const d=event.detail||{};
  if(!['1','2','3','4','5','6','7-9'].includes(d.level)||!Number.isInteger(d.seq)||d.seq<1||d.seq>11000||(d.stage!==null&&(!Number.isInteger(d.stage)||d.stage<0||d.stage>55)))return;
  const previous=hs30State.studyLocations;
  hs30State.studyLocations={...previous,[d.level]:{seq:d.seq,stage:d.stage}};
  d.saved=hsSave();if(!d.saved)hs30State.studyLocations=previous;
});
window.addEventListener('hanzi:syllabus-quiz',event=>{const d=event.detail||{},kind=d.kind??'meaning',scope=d.scope??'selection';if(!['meaning','pinyin'].includes(kind)||!['selection','due'].includes(scope)||!['1','2','3','4','5','6','7-9','all'].includes(d.level)||!Number.isInteger(d.total)||d.total<1||d.total>10||!Number.isInteger(d.correct)||d.correct<0||d.correct>d.total||!Array.isArray(d.wrong)||d.wrong.length!==d.total-d.correct||d.wrong.some(n=>!Number.isInteger(n)||n<1||n>11000))return;const previous=hs30State.syllabusQuizzes;hs30State.syllabusQuizzes=[...(Array.isArray(previous)?previous:[]).slice(-29),{at:Date.now(),level:d.level,kind,scope,total:d.total,correct:d.correct,wrong:[...d.wrong]}];d.saved=hsSave();if(!d.saved){if(previous===undefined)delete hs30State.syllabusQuizzes;else hs30State.syllabusQuizzes=previous}});
function hsSrc(id){return String(id||'').split(':')[0]}
function hsDeck(level=hs30State.level){let local=HS30_STARTER.filter(w=>String(w.level)===String(level));let bank=hs30State.injected.filter(w=>String(w.level)===String(level));if(level==='3' && typeof DECK!=='undefined')local=DECK.map(w=>({id:'userhsk3-'+w.id,level:'3',hz:w.hz,py:w.py,vi:w.vi,pos:w.pos,ex:w.ex,exvi:w.exvi,source:'user_pdf',reviewStatus:'user_source'}));const byKey=new Map();for(const w of [...local,...bank]){if(!w.hz)continue;let k=w.hz+'|'+(w.py||'');const old=byKey.get(k);if(!old||(!old.vi&&w.vi))byKey.set(k,w)}return Array.from(byKey.values())}
function hsAvailable(level){return hsDeck(level).length}
function hsLevelStats(level){let cards=hsDeck(level),seen=0,due=0;cards.forEach(w=>{const p=hs30State.progress[w.id];if(p?.reps)seen++;if(p?.due && p.due<=Date.now())due++});return {seen,due,total:cards.length}}
function hsOverview(){const n=hs30State.injected.length;return `<div class="viz-road"><div class="road-copy"><span class="chip">HSK 3.0 · ĐỀ CƯƠNG 2025</span><h2>Từng cấp độ, từng bước tiến.</h2><p>Học theo trình độ thực tế, ôn tập dựa trên lịch sử nhớ từ, đánh giá năng lực và luyện phát âm mỗi ngày. Không trộn HSK 2.0 với đề cương mới.</p><span style="font-weight:850;font-size:12px">${n?n.toLocaleString('vi-VN')+' mục đã nhập từ nguồn bên ngoài':'Nhập dữ liệu HSK bổ sung ở Kho dữ liệu'}</span></div></div>`}
function hsStudyCard(w,position,total){if(!window.HanziStudyCards)return '<p role="status">Đang tải thẻ học...</p>';const note=w.source==='user_pdf'?'PDF người học':w.source==='internal_demo'?'Ví dụ tự biên soạn, chưa phải học liệu chính thức':w.source||'Dữ liệu nhập, chưa duyệt';return window.HanziStudyCards.render({namespace:'hs',word:w.hz,reading:w.py,answerHtml:'<p lang="'+(w.vi?'vi':'en')+'">'+hsH(w.vi||w.gloss_en||'Chưa có nghĩa đối chiếu. Cần biên tập bổ sung.')+'</p>',partHtml:hsH(w.pos||''),position,total,record:hs30State.progress[w.id],revealed:hs30State.revealed,source:note,examplesHtml:w.ex?'<h4 class="example-label">Ví dụ trong tài liệu</h4><p>'+hsH(w.ex)+'</p><p>'+hsH(w.exvi||'')+'</p>':''})+'<p class="panel-sub">Nguồn: '+hsH(note)+'</p>'}
function hsRenderPath(){let lev=HS30_LEVELS.find(x=>x.id===hs30State.level)||HS30_LEVELS[2],words=hsDeck(),pos=Math.min(hs30State.position,Math.max(0,words.length-1)),w=words[pos],st=hsLevelStats(lev.id);hs30State.position=pos;
 const sourceNote=words.length<lev.newWords?`Có ${words.length.toLocaleString('vi-VN')} mục trên máy. Mục tiêu ${lev.newWords.toLocaleString('vi-VN')} từ mới là số tham chiếu đề cương; dữ liệu đang chưa đầy đủ.`:`Đang có ${words.length.toLocaleString('vi-VN')} mục trong cấp độ này. Cần kiểm duyệt và đối chiếu đề cương.`;
 document.getElementById('v4-path').innerHTML=`<div class="v4 stack"><div class="section-top"><div><p class="eyebrow">CURRICULUM · NEW GENERATION</p><h1 class="page-title">Lộ trình tiếng Trung HSK 1–9</h1><p class="lead">Chọn cấp độ, học bằng thẻ tương tác, nghe tiếng Trung và ôn lặp lại. Các danh sách nhập ngoài được ghi nguồn riêng để không nhầm thành đề chính thức.</p></div><button class="v4-btn v4-outline" data-go="contenthub">＋ Bổ sung dữ liệu HSK</button></div>${hsOverview()}
 <div class="level-grid">${HS30_LEVELS.map(x=>{let s=hsLevelStats(x.id),pct=s.total?Math.round(s.seen/s.total*100):0;return `<button class="level-card ${lev.id===x.id?'selected':''}" data-hs="choose-level" data-level="${x.id}" aria-pressed="${lev.id===x.id}"><div class="level-top"><span class="level-monogram">${x.icon}</span><span class="chip ${x.id==='3'?'chip-green':''}">${x.tag}</span></div><h3>${x.title}</h3><p>${x.desc}</p><div class="level-foot"><span>${s.total.toLocaleString('vi-VN')} mục sẵn có</span><span>${pct}%</span></div><div class="progress-line"><span style="width:${pct}%"></span></div></button>`}).join('')}</div>
 <div class="split"><div class="surface"><div class="stats-flex" style="margin-bottom:15px"><div><p class="eyebrow">FLASHCARD · ${lev.title}</p><h2 class="v4-subheading">Học từ theo cấp độ</h2></div><span class="chip">${st.seen}/${st.total} đã gặp</span></div><p class="muted">${hsH(sourceNote)}</p><button type="button" class="btn btn-primary hs-full-level" data-go="hsk" data-hsk-level="${lev.id}">Học đủ ${lev.newWords.toLocaleString('vi-VN')} từ ${lev.title} theo chặng</button>${w?`${hsStudyCard(w,pos,words.length)}<button type="button" class="btn" data-hs="start-hs-quiz">Trắc nghiệm</button>`:`<div class="soft"><h3>Chưa có học liệu</h3><p class="muted">Nhập CSV/JSON ở Kho dữ liệu. Không dùng thẻ rỗng hoặc bịa nghĩa để lấp chỗ trống.</p><button class="v4-btn v4-primary" data-go="contenthub">Nạp bộ từ vựng →</button></div>`}</div><div class="stack"><div class="surface"><p class="eyebrow">THEO DÕI HỌC TẬP</p><h3 class="v4-subheading">Tiến độ ${lev.title}</h3><div class="report-row"><span>Đã gặp</span><strong>${st.seen} từ</strong></div><div class="report-row"><span>Đến hạn ôn</span><strong>${st.due} từ</strong></div><div class="report-row"><span>Số từ có sẵn</span><strong>${st.total}</strong></div><div class="report-row"><span>Mục tiêu chuẩn</span><strong>${lev.newWords.toLocaleString('vi-VN')}</strong></div><p class="fine-print" style="margin-top:16px">Tính năng ôn cấp độ mới lưu trên trình duyệt. HSK 7–9 là một dải từ vựng chung; chưa có bài thi 7, 8, 9 riêng trong bản này.</p></div><div class="surface"><p class="eyebrow">TỰ HỌC</p><h3 class="v4-subheading">Đọc · Nghe · Nói · Viết</h3><p class="muted">Các bài Ngữ pháp, Đọc, Nghe và YouTube đang được biên soạn ở cấp HSK 3. Ở cấp khác, hãy luyện từ và làm kiểm tra xếp trình độ trong lúc kho học liệu mở rộng.</p><div class="action-bar"><button class="v4-btn" data-go="video">Video & nghe nói</button><button class="v4-btn" data-go="situations">Hội thoại theo tình huống</button><button class="v4-btn" data-go="placement">Kiểm tra xếp trình độ</button><button class="v4-btn" data-go="characters">Tập viết nét chữ</button><button class="v4-btn" data-go="contenthub">Kho dữ liệu HSK</button></div></div></div></div>${hs30State.quiz?hsQuizHTML():''}</div>`;}
function hsNext(d){let n=hsDeck().length;hs30State.position=n?(hs30State.position+d+n)%n:0;hs30State.revealed=false;hsSave();hsRenderPath()}
function hsRate(r){const w=hsDeck()[hs30State.position];if(!w||!['again','hard','good','easy'].includes(r))return;if(!hs30State.revealed){hsNotify('Hãy lật thẻ để đối chiếu trước khi đánh giá.');return}const previous=hs30State.progress[w.id];hs30State.progress[w.id]=hsRatingRecord(previous,r);if(!hsSave()){if(previous)hs30State.progress[w.id]=previous;else delete hs30State.progress[w.id];return}hsNext(1);window.HanziStudyCards?.focus(document.getElementById('v4-path'))}
function hsShuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function hsCreateQuiz(cards,limit=8){let candidates=cards.filter(w=>w.vi&&w.vi.length>1);if(candidates.length<4){hsNotify('Cần ít nhất 4 mục có nghĩa để tạo trắc nghiệm.');return null}let selected=hsShuffle(candidates).slice(0,Math.min(limit,candidates.length));return {items:selected,index:0,answers:[],done:false}}
function hsQuizHTML(){let q=hs30State.quiz;if(!q)return'';if(q.done)return `<div class="surface" id="hs-quiz" style="margin-top:18px"><h2 class="v4-subheading">Kết quả trắc nghiệm</h2><div class="big-number">${q.answers.filter(x=>x.ok).length}/${q.items.length}</div><p class="muted">Đây là điểm luyện tập từ vựng, không phải điểm thi HSK.</p><button class="v4-btn v4-primary" data-hs="restart-quiz">Làm đề khác</button></div>`;let w=q.items[q.index],answered=q.answers[q.index],pool=hsDeck().filter(x=>x.vi&&x.vi!==w.vi);let options=hsShuffle(pool).slice(0,3).map(x=>x.vi).concat(w.vi);let key='hs-options-'+w.id;if(!q[key])q[key]=hsShuffle(options);return `<div class="surface" id="hs-quiz" style="margin-top:18px"><div class="stats-flex"><h2 class="v4-subheading">Kiểm tra từ vựng · ${hs30State.level}</h2><span class="chip">${q.index+1} / ${q.items.length}</span></div><div class="quiz-question" lang="zh-Hans">${hsH(w.hz)} <button class="v4-btn" data-hs="quiz-speak">♫</button></div><p class="muted">Chọn nghĩa phù hợp nhất.</p><div class="answer-opts">${q[key].map((o,n)=>`<button data-hs="answer-quiz" data-choice="${n}" class="${answered?(o===w.vi?'correct':o===answered.choice?'incorrect':''):''}" ${answered?'disabled':''}>${'ABCD'[n]}. ${hsH(o)}</button>`).join('')}</div>${answered?`<div class="warning-banner" style="margin-top:13px">${answered.ok?'✓ Đúng!':'Cần ôn thêm.'} Đáp án: <strong>${hsH(w.vi)}</strong></div><button class="v4-btn v4-primary" data-hs="next-quiz" style="margin-top:12px">${q.index+1===q.items.length?'Xem kết quả':'Câu tiếp theo →'}</button>`:''}</div>`}
function hsRenderPlacement(){let q=hs30State.placement;document.getElementById('v4-placement').innerHTML=`<div class="v4 stack"><div class="section-top"><div><p class="eyebrow">ASSESSMENT · LEVEL CHECK</p><h1 class="page-title">Kiểm tra xếp trình độ</h1><p class="lead">Một bài đánh giá tham khảo dựa trên những từ đã có nghĩa, giúp chọn cấp học. Chưa được chuẩn hóa tâm trắc học và không phải đề HSK chính thức.</p></div><button class="v4-btn" data-go="path">← Trở về lộ trình</button></div><div class="split"><div class="surface">${q?hsPlacementHTML():`<div class="chip">5–15 phút · Tùy học liệu</div><h2 style="font-size:25px;margin:19px 0 10px">Bạn đang ở đâu trên hành trình học?</h2><p class="muted">Câu hỏi lấy từ bộ ví dụ tác giả biên soạn, và một số từ HSK 3 từ tài liệu bạn đã cung cấp. Kết quả không tương đương điểm thi.</p><button class="v4-btn v4-primary" data-hs="start-placement">Bắt đầu đánh giá →</button>`}</div><div class="surface"><p class="eyebrow">THIẾT KẾ HỌC TẬP</p><h3 class="v4-subheading">Làm gì sau bài kiểm tra?</h3><div class="report-row"><span>1. Xác định nhóm từ đã biết</span><span>✓</span></div><div class="report-row"><span>2. Chọn cấp độ học gợi ý</span><span>✓</span></div><div class="report-row"><span>3. Luyện nghe & ngữ pháp</span><span>✓</span></div><div class="report-row"><span>4. Theo dõi tiến bộ định kỳ</span><span>✓</span></div></div></div></div>`}
function hsStartPlacement(){let picked=[];for(const l of ['1','2','3','4','5','6']){let rows=hsShuffle(hsDeck(l).filter(x=>x.vi));picked.push(...rows.slice(0,Math.min(2,rows.length)))}if(picked.length<4)return hsNotify('Cần tối thiểu 4 mục từ vựng có nghĩa để tạo bài.');hs30State.placement={items:hsShuffle(picked),index:0,answers:[],done:false};hsRenderPlacement()}
function hsPlacementHTML(){let q=hs30State.placement;if(q.done){let scores={};for(let a of q.answers){let lv=String(a.level);if(!scores[lv])scores[lv]=[0,0];scores[lv][1]++;scores[lv][0]+=Number(a.ok)}let suitable='1';for(const l of ['1','2','3','4','5','6']){let x=scores[l];if(x&&x[1]>=1&&x[0]/x[1]>=.75)suitable=l}return `<p class="eyebrow">BÁO CÁO XẾP TRÌNH ĐỘ</p><h3 class="v4-subheading">Kết quả: ${q.answers.filter(a=>a.ok).length}/${q.items.length} câu</h3><p>Gợi ý bắt đầu ở <strong>HSK ${suitable}</strong>, sau khi kiểm tra thêm nghe–nói và ngữ pháp.</p>${Object.entries(scores).map(([l,s])=>`<div class="report-row"><span>HSK ${l}</span><strong>${s[0]}/${s[1]}</strong></div>`).join('')}<p class="fine-print">Nhãn trình độ của ví dụ chưa được thẩm định theo đề cương HSK 2025. Không dùng kết quả để dự báo đỗ HSK.</p><div class="action-bar"><button class="v4-btn v4-primary" data-hs="placement-to-level" data-level="${suitable}">Học HSK ${suitable} →</button><button class="v4-btn" data-hs="start-placement">Kiểm tra lại</button></div>`}
let w=q.items[q.index],a=q.answers[q.index];let options=hsShuffle(hsDeck(String(w.level)).filter(v=>v.vi&&v.vi!==w.vi));let filler=HS30_STARTER.filter(x=>x.vi&&x.vi!==w.vi);options=hsShuffle([...options,...filler]).slice(0,3).map(x=>x.vi).concat(w.vi);if(!q['opts'+q.index])q['opts'+q.index]=hsShuffle(options);return `<p class="quiz-number">CÂU ${q.index+1} / ${q.items.length} · HSK ${w.level} (MẪU)</p><div class="quiz-question">${hsH(w.hz)}</div><p class="muted">Từ/cụm từ này có nghĩa gì?</p><div class="answer-opts">${q['opts'+q.index].map((v,i)=>`<button data-hs="placement-answer" data-answer="${i}" ${a?'disabled':''} class="${a?(v===w.vi?'correct':v===a.choice?'incorrect':''):''}">${hsH(v)}</button>`).join('')}</div>${a?`<div class="warning-banner" style="margin-top:13px">${a.ok?'✓ Chính xác':'Đáp án: '+hsH(w.vi)}</div><button class="v4-btn v4-primary" data-hs="placement-next" style="margin-top:14px">${q.index+1===q.items.length?'Xem đánh giá':'Tiếp tục →'}</button>`:''}`}
let hsCurrentCharacter='学',hsDrawing=false,hsStroke=[];
function hsRenderCharacters(){let deck=typeof DECK!=='undefined'?DECK:[],w=deck[hs30State.drawIndex%deck.length]||{hz:'学',py:'xué',vi:'Học'};hsCurrentCharacter=w.hz[0];document.getElementById('v4-characters').innerHTML=`<div class="v4 stack"><div class="section-top"><div><p class="eyebrow">HANZI CRAFT · CHARACTER LAB</p><h1 class="page-title">Luyện viết chữ Hán</h1><p class="lead">Tập nét chữ trong ô Mễ 米字格, nghe phát âm và tự đối chiếu. Có thể chọn chữ từ tài liệu HSK 3; bảng nét viết tay là chế độ thủ công. Chọn “Luyện viết có chấm nét” để được so với thứ tự nét mẫu.</p></div><button class="v4-btn" data-go="path">← Lộ trình</button></div><div class="write-grid"><div class="surface"><p class="eyebrow">BẢNG LUYỆN TẬP</p><div class="stats-flex"><div><h3 class="v4-subheading">${hsH(w.hz)}</h3><p class="muted">${hsH(w.py)} · ${hsH(w.vi)}</p></div><span class="chip">${hs30State.drawIndex%deck.length+1} / ${deck.length} từ</span></div><div style="display:grid;justify-content:center;margin:24px 0"><canvas class="hand-canvas" id="hs-canvas" width="340" height="340" aria-label="Vẽ chữ Hán vào ô vuông" role="img"></canvas></div><div class="action-bar"><button class="v4-btn" data-strokes="${hsH(w.hz)}">Xem thứ tự nét</button><button class="v4-btn" data-strokes="${hsH(w.hz)}" data-strokes-mode="quiz">Luyện viết có chấm nét</button><button class="v4-btn" data-hs="clear-draw">Xóa nét ↻</button><button class="v4-btn btn-listen" data-hs="speak-draw"><span class="ico-listen" aria-hidden="true"></span>Nghe từ</button><button class="v4-btn" data-hs="next-draw">Chữ tiếp →</button></div></div><div class="stack"><div class="surface"><p class="eyebrow">TỰ ĐỐI CHIẾU</p><div style="font-size:86px;font-family:'Microsoft YaHei',sans-serif;text-align:center;color:var(--primary);margin:15px">${hsH(hsCurrentCharacter)}</div><p class="muted">Quan sát hình dạng chữ, luyện từng nét từ trái sang phải, từ trên xuống dưới và so sánh với chữ mẫu. Chấm nét chính xác theo thứ tự cần thêm dữ liệu nét có giấy phép và bộ kiểm tra chuyên dụng.</p><button class="v4-btn" data-hs="next-draw">Luyện chữ khác →</button></div><div class="soft"><strong>Chuẩn hóa nét chữ</strong><p class="muted">Có thể tích hợp Hanzi Writer (MIT) cùng dữ liệu đồ họa Arphic theo điều kiện giấy phép nguồn để kiểm tra thứ tự nét, độ dài và vị trí.</p><a class="ext" href="https://hanziwriter.org/" target="_blank" rel="noopener noreferrer">Hanzi Writer ↗</a></div></div></div></div>`;hsSetupCanvas()}
function hsSetupCanvas(){let c=document.getElementById('hs-canvas');if(!c)return;let ctx=c.getContext('2d');ctx.lineWidth=7;ctx.strokeStyle='#5f55cf';ctx.lineJoin='round';ctx.lineCap='round';const point=e=>{let r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height}};c.addEventListener('pointerdown',e=>{e.preventDefault();hsDrawing=true;c.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke()});c.addEventListener('pointermove',e=>{if(!hsDrawing)return;e.preventDefault();let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()});for(const t of ['pointerup','pointercancel'])c.addEventListener(t,()=>hsDrawing=false)}
const HS30_LICENSES=[{n:'HSK — đề cương mới',license:'Đề cương chính thức, có quyền tác giả',url:'https://www.chinesetest.cn/syllabus',c:'Chỉ dùng làm chuẩn; không sao chép đề thi/câu hỏi hàng loạt.'},{n:'HearMandarin HSK 3.0',license:'CC BY 4.0 (theo nhà phát hành)',url:'https://hearmandarin.com/datasets/',c:'Có Hán tự, Pinyin và nghĩa tiếng Anh; giữ quy định ghi công.'},{n:'Gushi Chinese HSK',license:'CC BY-SA 4.0',url:'https://gushichinese.com/hsk-3.0/downloads',c:'Cần ghi công và chia sẻ phần dữ liệu phái sinh tương ứng.'},{n:'Hanzi Writer',license:'MIT; data Arphic',url:'https://github.com/chanind/hanzi-writer',c:'Động nét và luyện chữ; kiểm tra riêng giấy phép dữ liệu đồ họa.'},{n:'Tatoeba',license:'CC BY 2.0 FR (tùy nội dung)',url:'https://tatoeba.org/',c:'Giữ ID, tác giả và giấy phép từng câu/bản dịch.'},{n:'Ảnh Unsplash',license:'Unsplash License',url:'https://unsplash.com/license',c:'Dùng ảnh có chọn lọc; không biến thành kho ảnh cạnh tranh.'}];
function hsRenderContentHub(){const count=hs30State.injected.length;document.getElementById('v4-contenthub').innerHTML=`<div class="v4 stack"><div class="section-top"><div><p class="eyebrow">CONTENT OPERATIONS · DATA GOVERNANCE</p><h1 class="page-title">Kho dữ liệu & nguồn học liệu</h1><p class="lead">Nhập dữ liệu từ vựng đa cấp, kiểm tra định dạng, lưu nguồn và xem mức độ đầy đủ. Không biến dữ liệu thiếu nghĩa thành nội dung được kiểm duyệt.</p></div><button class="v4-btn" data-go="path">← Lộ trình HSK</button></div><div class="stats-flex surface"><div><p class="eyebrow">DỮ LIỆU MỚI</p><div class="big-number">${count.toLocaleString('vi-VN')}</div><p class="muted">mục được nhập ngoài 500 từ HSK 3 và 55 ví dụ minh họa</p></div><div class="action-bar"><button class="v4-btn" data-hs="download-csv">↓ Mẫu CSV</button><button class="v4-btn" data-hs="export-hs-data">↓ Sao lưu JSON</button></div></div><div class="import-grid"><div class="surface"><p class="eyebrow">IMPORT · CSV / JSON</p><h3 class="v4-subheading">Nạp học liệu từ máy</h3><p class="muted">Các cột khuyên dùng: <code>level,hanzi,pinyin,meaning_vi,source,license</code>. Chấp nhận cả <code>word</code>/<code>examLevelId</code> và <code>gloss_en</code>.</p><input type="file" id="hs-import-file" accept=".csv,.json,.jsonl,.tsv,application/json,text/plain,text/csv"><button class="v4-btn v4-primary" data-hs="import-file" style="margin-top:12px">Nhập và kiểm tra →</button><p class="fine-print" style="margin-top:12px">Tối đa 15.000 hàng/lượt và 6 MB. Nội dung sẽ lưu cục bộ trên trình duyệt.</p></div><div class="surface"><p class="eyebrow">IMPORT · NGUỒN CÔNG KHAI</p><h3 class="v4-subheading">Nạp qua đường dẫn dữ liệu</h3><p class="muted">Nguồn gợi ý: CSV thuộc dự án <a class="ext" href="https://github.com/profesorm/hsk30" target="_blank" rel="noopener noreferrer">profesorm/hsk30</a> (tự mô tả giấy phép CC BY 4.0). Cần có CORS và kiểm tra lại phiên bản trước khi dùng chính thức.</p><input type="url" id="hs-import-url" value="https://raw.githubusercontent.com/profesorm/hsk30/main/data/hsk_vocabulary.csv" aria-label="URL tệp CSV hoặc JSON"><button class="v4-btn v4-primary" data-hs="import-url">Đọc dữ liệu nguồn →</button><p class="fine-print" id="hs-import-note">Chưa tải. Không tải video hoặc phụ đề YouTube trái quyền.</p></div></div><div class="surface"><p class="eyebrow">DATASET LINEAGE</p><h3 class="v4-subheading">Nguồn và điều kiện sử dụng</h3>${HS30_LICENSES.map(x=>`<div class="source-row"><div><strong>${x.n}</strong><p class="muted" style="margin:4px 0 0">${x.c}</p></div><div><span class="chip">${x.license}</span><div style="margin-top:7px"><a class="ext" href="${x.url}" target="_blank" rel="noopener noreferrer">Tài liệu nguồn ↗</a></div></div></div>`).join('')}<p class="fine-print">Mô tả giấy phép dựa trên công bố của từng nguồn, không thay thế việc kiểm tra pháp lý trước khi phân phối thương mại.</p></div><div class="surface"><h3 class="v4-subheading">Nhật ký nhập dữ liệu</h3>${hs30State.importLog.length?hs30State.importLog.slice(-6).reverse().map(x=>`<div class="report-row"><span>${hsH(x.name)}<br><small class="muted">${new Date(x.at).toLocaleString('vi-VN')}</small></span><strong>${x.count} hàng</strong></div>`).join(''):'<p class="muted">Chưa có lịch sử nhập. Gói HSK 3 từ PDF vẫn được giữ nguyên.</p>'}<div class="action-bar" style="margin-top:14px"><button class="v4-btn" data-hs="clear-imports">Xóa học liệu nhập ngoài</button></div></div></div>`}
function hsParseCSV(text){text=String(text).replace(/^\uFEFF/,'');let first=text.slice(0,500).split(/\r?\n/)[0],delim=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',';let data=[],row=[],v='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===delim&&!quoted){row.push(v);v=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v);if(row.some(z=>z.trim()))data.push(row);row=[];v=''}else v+=c}row.push(v);if(row.some(z=>z.trim()))data.push(row);if(!data.length)return[];const header=data.shift().map(x=>x.trim());return data.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]??''])))}
function hsNormRow(row,source='user_import'){let get=(...keys)=>{for(let k of keys){let val=row[k]??row[k.toUpperCase()]??row[k.toLowerCase()];if(val!==undefined&&val!==null&&String(val).trim())return String(val).trim()}return''};let word=get('hanzi','simplified','word','hz','chinese','entry');let level=get('level','band','hsk3_band','hsk_level','examLevelId','exam_level');let number=level.match(/[1-9]/)?.[0]||'3';let lvl=/7[-–]?9|HSK[789]/i.test(level)||['7','8','9'].includes(number)?'7-9':number;if(!['1','2','3','4','5','6','7-9'].includes(lvl))return null;if(!/\p{Script=Han}/u.test(word)||word.length>25)return null;let pinyin=get('pinyin','py','official_pinyin','pinyin_num');let vi=get('meaning_vi','vi','vietnamese','definition_vi');let en=get('gloss_en','english','meaning_en','definition');let ref=String(source).replace(/[^a-z0-9_-]/gi,'_').slice(0,30);let id='ext-'+ref+'-'+lvl+'-'+word+'-'+pinyin;return {id,level:lvl,hz:word,py:pinyin,vi,gloss_en:en,source:get('source','source_url')||source,importedFrom:source,license:get('license')||'Cần xác minh',reviewStatus:'unreviewed'}}
async function hsImportContent(contents,filename){if(contents.length>6*1024*1024)throw Error('File quá 6 MB');let raw;if(filename.toLowerCase().endsWith('.jsonl'))raw=contents.split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s));else if(contents.trim().startsWith('{')||contents.trim().startsWith('[')){let ob=JSON.parse(contents);raw=Array.isArray(ob)?ob:ob.schema==='hanzi-studio-curriculum-v4'?ob.state?.injected||[]:ob.words||ob.data||ob.items||ob.vocabulary||[];}else raw=hsParseCSV(contents);if(!Array.isArray(raw))throw Error('Không tìm thấy mảng bản ghi');if(raw.length>15000)throw Error('Tối đa 15.000 hàng/lượt');let vals=raw.map(x=>hsNormRow(x,filename)).filter(Boolean);if(!vals.length)throw Error('Không có mục Hán tự + HSK level hợp lệ. Kiểm tra tên cột.');const map=new Map(hs30State.injected.map(x=>[x.id,x]));for(let v of vals)map.set(v.id,v);hs30State.injected=Array.from(map.values());hs30State.importLog.push({name:filename,count:vals.length,at:Date.now()});hsSave();hsNotify(`Đã nhập ${vals.length} từ. Xem Lộ trình để học.`);hsRenderContentHub();}
function hsDownload(name,text,type='text/plain;charset=utf-8'){let url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener('click',async e=>{let el=e.target.closest('[data-hs]');if(!el)return;let action=el.dataset.hs;try{switch(action){case'choose-level':hs30State.level=el.dataset.level;hs30State.position=0;hs30State.revealed=false;hs30State.quiz=null;hsSave();hsRenderPath();break;
 case'flip':hs30State.revealed=!hs30State.revealed;hsRenderPath();window.HanziStudyCards?.focus(document.getElementById('v4-path'),true);break;case'prev':hsNext(-1);window.HanziStudyCards?.focus(document.getElementById('v4-path'));break;case'next':hsNext(1);window.HanziStudyCards?.focus(document.getElementById('v4-path'));break;case'speak':{let w=hsDeck()[hs30State.position];if(w&&typeof speak==='function')speak(w.hz);break}
 case'rate':hsRate(el.dataset.rating);break;case'start-hs-quiz':hs30State.quiz=hsCreateQuiz(hsDeck());hsRenderPath();document.getElementById('hs-quiz')?.scrollIntoView({behavior:'smooth'});break;
 case'answer-quiz':{let q=hs30State.quiz;if(!q||q.answers[q.index])break;let choice=q['hs-options-'+q.items[q.index].id][Number(el.dataset.choice)];q.answers[q.index]={choice,ok:choice===q.items[q.index].vi};hsRenderPath();document.getElementById('hs-quiz')?.scrollIntoView();break}
 case'next-quiz':{let q=hs30State.quiz;if(!q)break;if(q.index+1>=q.items.length)q.done=true;else q.index++;hsRenderPath();document.getElementById('hs-quiz')?.scrollIntoView();break}
 case'quiz-speak':if(hs30State.quiz&&typeof speak==='function')speak(hs30State.quiz.items[hs30State.quiz.index].hz);break;case'restart-quiz':hs30State.quiz=hsCreateQuiz(hsDeck());hsRenderPath();break;
 case'start-placement':hsStartPlacement();break;case'placement-answer':{let q=hs30State.placement;if(!q||q.answers[q.index])break;let w=q.items[q.index],choice=q['opts'+q.index][Number(el.dataset.answer)];q.answers[q.index]={ok:choice===w.vi,choice,level:w.level};hsRenderPlacement();break}case'placement-next':{let q=hs30State.placement;if(!q)break;if(q.index+1>=q.items.length)q.done=true;else q.index++;hsRenderPlacement();break}case'placement-to-level':hs30State.level=el.dataset.level;hs30State.position=0;hsSave();if(typeof nav==='function')nav('path');break;
 case'clear-draw':{let canvas=document.getElementById('hs-canvas');canvas?.getContext('2d')?.clearRect(0,0,340,340);break}case'next-draw':hs30State.drawIndex++;hsSave();hsRenderCharacters();break;case'speak-draw':if(typeof speak==='function')speak(hsCurrentCharacter);break;
 case'import-file':{let file=document.getElementById('hs-import-file')?.files?.[0];if(!file)return hsNotify('Hãy chọn file CSV hoặc JSON trước.');await hsImportContent(await file.text(),file.name);break}
 case'import-url':{let u=document.getElementById('hs-import-url').value,url=new URL(u);if(url.protocol!=='https:')throw Error('Chỉ nhập URL HTTPS');if(!['raw.githubusercontent.com','hearmandarin.com','gushichinese.com'].includes(url.hostname))throw Error('Nguồn trực tiếp chưa được kiểm chứng. Hãy tải file về rồi nhập từ máy để chủ động kiểm tra.');document.getElementById('hs-import-note').textContent='Đang đọc nguồn công khai…';let resp=await fetch(url.href,{cache:'no-store'});if(!resp.ok)throw Error('Không tải được dữ liệu: HTTP '+resp.status);let len=+(resp.headers.get('content-length')||0);if(len>6*1024*1024)throw Error('Dung lượng quá 6 MB');let buf=await resp.text();await hsImportContent(buf,url.pathname.split('/').at(-1));break}
 case'download-csv':hsDownload('hanzi-content-template.csv','level,hanzi,pinyin,meaning_vi,gloss_en,source,license\n1,你好,nǐ hǎo,Xin chào,,internal_sample,Owned\n','text/csv;charset=utf-8');break;
 case'export-hs-data':hsDownload('hanzi-studio-v4-content-backup.json',JSON.stringify({schema:'hanzi-studio-curriculum-v4',exportedAt:new Date().toISOString(),state:hs30State},null,2),'application/json');break;
 case'clear-imports':{if(!window.confirm('Xóa toàn bộ mục từ đã nhập ngoài? Bộ HSK 3 và các ví dụ gốc vẫn được giữ.'))break;hs30State.injected=[];hs30State.importLog=[];hsSave();hsRenderContentHub();break}
 }}catch(err){hsNotify('Lỗi: '+(err?.message||err));let note=document.getElementById('hs-import-note');if(note)note.textContent='Không đọc được dữ liệu. '+(err?.message||err)}});
