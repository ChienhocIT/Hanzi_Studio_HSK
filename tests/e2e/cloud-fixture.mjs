export const id='00000000-0000-4000-8000-000000000001';
export const itemId='00000000-0000-4000-8000-000000000010';
export const classId='00000000-0000-4000-8000-000000000020';
export const assignmentId='00000000-0000-4000-8000-000000000030';
export const key='hanzi-studio-hsk3-prod-v1';
export const state={v:1,records:{},bookmarks:[],events:[],quizHistory:[],settings:{goal:25,theme:'light',voiceRate:.85}};
export const item={id:itemId,author_id:id,title:'Bài đọc kiểm thử',kind:'reading',level:'3',syllabus:'Fixture',body:'你好！',source_url:'https://example.com/fixture',license:'Fixture only',status:'draft',revision:1};
export async function mockCloud(page,role='student',{authenticated=true,userId=id,world=null}={}) {
  const id=userId;
  const calls=[],data=world||{items:[],classes:[],assignments:[],submissions:[],questions:[],progress:null};
  data.liveRooms??=[];
  data.vocab??=[];
  data.liveDrafts??={};data.liveResults??={};
  const user={id,email:'learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
  const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test';
  const session={access_token:jwt,refresh_token:'fake-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
  if(authenticated)await page.addInitScript(({id,session})=>{
    localStorage.setItem('hanzi-cloud-owner',id);
    localStorage.setItem('sb-demo-auth-token',JSON.stringify(session));
  },{id,session});
  await page.route('**/cloud-config.js',route=>route.fulfill({contentType:'application/javascript',body:'window.HANZI_CLOUD_CONFIG={url:"https://demo.supabase.co",key:"sb_publishable_fixture"}'}));
  await page.route('https://demo.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),body=req.postDataJSON();
    calls.push({path:url.pathname,body});
    let result=null,status=200;
    if(url.pathname.endsWith('/settings'))result={external:{google:true,email:true},disable_signup:false};
    else if(url.pathname.endsWith('/token'))result=session;
    else if(url.pathname.endsWith('/logout'))result={};
    else if(url.pathname.endsWith('/signup'))result={id:'00000000-0000-4000-8000-000000000099',aud:'authenticated',email:body.email,user_metadata:body.data,identities:[{id:'x'}],created_at:new Date().toISOString()};
    else if(url.pathname.endsWith('/user'))result=user;
    else if(url.pathname.endsWith('/recover')||url.pathname.endsWith('/resend'))result={};
    else if(url.pathname.endsWith('/vocab_entries')){
      // Mirrors RLS: students read published rows only.
      const level=url.searchParams.get('level')?.replace(/^eq\./,''),offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);
      result=data.vocab.filter(v=>v.level===level&&(role!=='student'||v.review_status==='published')).slice(offset,offset+limit);
    }
    else if(url.pathname.endsWith('/review_vocab_entries')){const rows=data.vocab.filter(v=>body.entry_seqs.includes(v.seq));rows.forEach(v=>v.review_status=body.decision);result=rows.length;}
    else if(url.pathname.endsWith('/profiles'))result=url.searchParams.get('id')?{id,display_name:'Học viên kiểm thử',role}:[{id,display_name:'Học viên kiểm thử',role}];
    else if(url.pathname.endsWith('/content_items'))result=data.items;
    else if(url.pathname.endsWith('/classes'))result=data.classes;
    else if(url.pathname.endsWith('/assignments'))result=data.assignments;
    else if(url.pathname.endsWith('/assignment_questions'))result=data.questions;
    else if(url.pathname.endsWith('/submissions'))result=data.submissions;
    else if(url.pathname.endsWith('/learning_progress'))result=data.progress;
    else if(url.pathname.endsWith('/save_progress')){data.progress={snapshot:body.payload,revision:(data.progress?.revision||0)+1};result=data.progress.revision;}
    else if(url.pathname.endsWith('/save_content')){data.items=[{...item,...body.item}];result=itemId;}
    else if(url.pathname.endsWith('/review_content')){data.items[0].status=body.decision;data.items[0].revision++;}
    else if(url.pathname.endsWith('/join_class')){data.classes=[{id:classId,title:'Lớp kiểm thử',teacher_id:'another-teacher',open:true}];result=classId;}
    else if(url.pathname.endsWith('/create_class')){data.classes=[{id:classId,title:body.class_title,teacher_id:id,open:true,join_code:'a'.repeat(32)}];result=classId;}
    else if(url.pathname.endsWith('/create_assignment')){data.assignments=[{id:assignmentId,class_id:classId,title:body.assignment_title,instructions:body.instructions,lesson:item,due_at:body.due_at,format:'essay'}];result=assignmentId;}
    else if(url.pathname.endsWith('/grade_submission')){data.submissions[0].score=body.grade;data.submissions[0].feedback=body.comment;}
    else if(url.pathname.endsWith('/class_roster'))result=[...new Set(data.submissions.map(s=>s.student_id))].map(student_id=>({student_id,display_name:'Trần An',joined_at:new Date().toISOString()}));
    else if(url.pathname.endsWith('/class_report'))result=data.submissions.map(s=>({...s,display_name:'Học viên trong lớp',assignment_title:data.assignments[0].title}));
    else if(url.pathname.endsWith('/submit_assignment'))data.submissions=[{assignment_id:assignmentId,student_id:id,answer:body.answer_text,score:null,submitted_at:new Date().toISOString(),feedback:''}];
    else if(url.pathname.endsWith('/create_quiz_assignment')){
      data.questions=body.questions.map(({prompt,options},position)=>({position,prompt,options}));
      data.assignments=[{id:assignmentId,class_id:classId,title:body.assignment_title,instructions:body.instructions,lesson:item,due_at:body.due_at,format:'quiz'}];result=assignmentId;
    }
    else if(url.pathname.endsWith('/submit_quiz')){result=50;data.submissions=[{assignment_id:assignmentId,student_id:id,answer:JSON.stringify(body.answers),score:result,submitted_at:new Date().toISOString(),feedback:'Đúng 1 / 2 câu. Chấm tự động trên server.'}];}
    else if(url.pathname.endsWith('/list_live_rooms'))result=data.liveRooms.filter(r=>r.host_id===id||r.participants.some(p=>p.user_id===id)).map(r=>({id:r.id,title:r.title,state:r.state}));
    else if(url.pathname.endsWith('/create_live_room')){
      const room={id:'00000000-0000-4000-8000-000000000040',title:'Phòng luyện tập kiểm thử',instructions:'Chọn nghĩa phù hợp',state:'waiting',host_id:id,join_code:'ABCD1234',duration_seconds:body.duration_seconds,participants:[],expires_at:'2030-12-20T12:00:00Z',ends_at:null,questions:data.questions};
      data.liveRooms.push(room);result=room.id;
    }
    else if(url.pathname.endsWith('/join_live_room')){
      const room=data.liveRooms.find(r=>r.join_code===body.code.toUpperCase());
      if(!room){status=400;result={message:'room_unavailable'};}
      else {if(!room.participants.some(p=>p.user_id===id))room.participants.push({user_id:id,display_name:'Học viên phòng thi'});result=room.id;}
    }
    else if(url.pathname.endsWith('/get_live_room')){
      const room=data.liveRooms.find(r=>r.id===body.room_uuid);
      if(!room){status=400;result={message:'room_unavailable'};}
      else {
        const finished=room.state==='ended',own=data.liveResults[id];
        result={...room,host:room.host_id===id,server_now:new Date().toISOString(),join_code:room.host_id===id&&room.state==='waiting'?room.join_code:null,questions:room.state==='waiting'?[]:room.questions,
          my_draft:data.liveDrafts[id]||null,my_result:own?{answers:own.answers,score:finished?own.score:null}:null,
          participants:room.participants.map(p=>({...p,submitted:Boolean(data.liveResults[p.user_id]),score:finished?(data.liveResults[p.user_id]?.score??0):null}))};
      }
    }
    else if(url.pathname.endsWith('/control_live_room')){
      const room=data.liveRooms.find(r=>r.id===body.room_uuid);
      room.state=body.command==='start'?'running':'ended';room.ends_at=new Date(Date.now()+(body.command==='start'?room.duration_seconds*1000:0)).toISOString();
      if(body.command==='end')for(const p of room.participants)if(!data.liveResults[p.user_id])data.liveResults[p.user_id]={answers:data.liveDrafts[p.user_id]||[null,null],score:data.liveDrafts[p.user_id]?50:0};
    }
    else if(url.pathname.endsWith('/save_live_answers'))data.liveDrafts[id]=body.answers;
    else if(url.pathname.endsWith('/submit_live_quiz'))data.liveResults[id]={answers:body.answers,score:50};
    else {status=400;result={message:'unexpected_mock_request'};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
  });
  return {calls,data};
}
// Rows shaped like public.vocab_entries for the HSK 3.0 (CLEC 2025) syllabus.
export const vocab=(status='published')=>[
  {seq:1,level:'1',extra_levels:['2','4'],word:'好',homograph:null,pinyin:'hǎo',pos:['形'],pos_extra:['副'],review_status:status,source_page:80},
  {seq:2,level:'1',extra_levels:[],word:'本',homograph:1,pinyin:'běn',pos:['量'],pos_extra:[],review_status:status,source_page:80},
  {seq:3,level:'1',extra_levels:[],word:'不客气',homograph:null,pinyin:'bú kèqi',pos:[],pos_extra:[],review_status:status,source_page:80}
];
