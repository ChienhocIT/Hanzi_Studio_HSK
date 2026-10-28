// Mây Long reacts to what the learner is doing. Only swaps image + caption; CSS owns motion.
const base='./assets/mascot/';
export const MOODS={
  hello:['maylong-hello','你好! Chào bạn.'],
  curious:['expr-curious','Nhập email bạn dùng để học nhé.'],
  shy:['expr-shy','Mây Long không nhìn mật khẩu đâu!'],
  thinking:['maylong-thinking','Chờ Mây Long một chút...'],
  surprised:['expr-surprised','Ôi, có gì đó chưa đúng. Thử lại nhé.'],
  excited:['expr-excited','Tuyệt vời! 加油!'],
  success:['maylong-success','Chào mừng bạn! Vào học thôi.'],
  happy:['expr-happy','Học vui, tiến bộ mỗi ngày.'],
};
let current='hello';
// One-shot pop; removed afterwards so the idle float animation resumes.
export function pop(el) {
  el.classList.remove('is-popping');void el.offsetWidth;el.classList.add('is-popping');
  el.addEventListener('animationend',()=>el.classList.remove('is-popping'),{once:true});
}
export function setMood(mood,caption) {
  const img=document.getElementById('auth-mascot'),bubble=document.getElementById('auth-bubble');
  if(!img||!MOODS[mood])return;
  if(mood!==current){
    current=mood;
    img.src=`${base}${MOODS[mood][0]}.webp`;
    pop(img);
  }
  if(bubble)bubble.textContent=caption||MOODS[mood][1];
}
// Cycles expressions on the landing sticker; keyboard accessible.
export function mountCycle(el) {
  if(!el)return;
  const order=['expr-excited','expr-happy','expr-curious','expr-surprised','expr-confident'];
  let index=0;
  const next=()=>{index=(index+1)%order.length;el.src=`${base}${order[index]}.webp`;pop(el);};
  el.addEventListener('click',next);
  el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();next();}});
}
