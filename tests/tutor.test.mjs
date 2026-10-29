import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleTutor,validate,DEFAULT_MODELS} from '../server/tutor.mjs';
const env={GEMINI_API_KEY:'gemini-test-key',HANZI_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',HANZI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const post=(body,token='user-token')=>new Request('https://hanzi.example/api/tutor',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
const chat={mode:'chat',messages:[{role:'user',text:'了 và 过 khác nhau thế nào?'}]};
const sse=texts=>new Response(texts.map(t=>`data: ${JSON.stringify({candidates:[{content:{parts:[{text:'nghĩ...',thought:true},{text:t}]}}]})}\r\n\r\n`).join(''),{headers:{'content-type':'text/event-stream'}});
// Fake upstreams: Supabase auth + quota RPC, then Gemini. Records every call.
function upstream({user=true,quota=29,gemini=()=>sse(['了 ','chỉ sự hoàn thành.'])}={}) {
  const calls=[];
  const fetcher=async(url,init={})=>{
    calls.push({url,init});
    if(url.endsWith('/auth/v1/user'))return user?Response.json({id:'u1'}):new Response('{}',{status:401});
    if(url.endsWith('/rpc/consume_tutor_quota'))return quota===-2?new Response('{"message":"tutor_rate_limited"}',{status:400}):quota<0?new Response('{"message":"tutor_quota_exceeded"}',{status:400}):Response.json(quota);
    return gemini(url,init);
  };
  return {calls,fetcher};
}
test('Tutor refuses before spending quota when unconfigured, signed out or malformed',async()=>{
  assert.equal((await handleTutor(post(chat),{...env,GEMINI_API_KEY:''},upstream().fetcher)).status,503);
  assert.equal((await handleTutor(new Request('https://hanzi.example/api/tutor'),env,upstream().fetcher)).status,405);
  assert.equal((await handleTutor(post(chat,''),env,upstream().fetcher)).status,401);
  assert.equal((await handleTutor(post(chat),env,upstream({user:false}).fetcher)).status,401);
  const bad=upstream();
  assert.equal((await handleTutor(post({mode:'chat',messages:[{role:'model',text:'hi'}]}),env,bad.fetcher)).status,400);
  assert.ok(!bad.calls.some(c=>c.url.includes('consume_tutor_quota')),'invalid requests must not spend quota');
});
test('Request validation caps history and text length',()=>{
  assert.equal(validate({mode:'chat',messages:[{role:'user',text:'x'.repeat(2001)}]}),null);
  assert.equal(validate({mode:'grade',sentence:''}),null);
  const long=Array.from({length:20},(_,i)=>({role:i%2?'model':'user',text:'câu '+i}));
  long.push({role:'user',text:'cuối'});
  const kept=validate({mode:'chat',messages:long}).messages;
  assert.equal(kept.length,11);assert.equal(kept[0].role,'user');assert.equal(kept.at(-1).parts[0].text,'cuối');
  assert.equal(validate({mode:'chat',messages:[{role:'model',text:'xin chào'}]}),null);
});
test('Quota exhaustion returns 429 without calling Gemini',async()=>{
  const u=upstream({quota:-1});
  const response=await handleTutor(post(chat),env,u.fetcher);
  assert.equal(response.status,429);assert.equal((await response.json()).error,'tutor_quota_exceeded');
  assert.ok(!u.calls.some(c=>c.url.includes('generativelanguage')));
  const fast=await handleTutor(post(chat),env,upstream({quota:-2}).fetcher);
  assert.equal(fast.status,429);assert.equal((await fast.json()).error,'tutor_rate_limited');
});
test('Chat streams answer text without thoughts and reports remaining quota',async()=>{
  const u=upstream({quota:17});
  const response=await handleTutor(post(chat),env,u.fetcher);
  assert.equal(response.status,200);assert.equal(response.headers.get('x-tutor-remaining'),'17');
  assert.equal(await response.text(),'了 chỉ sự hoàn thành.');
  const call=u.calls.find(c=>c.url.includes('generativelanguage'));
  assert.match(call.url,new RegExp(`${DEFAULT_MODELS[0]}:streamGenerateContent\\?alt=sse$`));
  assert.equal(call.init.headers['x-goog-api-key'],'gemini-test-key');
  assert.ok(!call.url.includes('gemini-test-key'),'the key must not appear in the URL');
  const body=JSON.parse(call.init.body);
  assert.deepEqual(body.contents,[{role:'user',parts:[{text:'了 và 过 khác nhau thế nào?'}]}]);
  assert.match(body.systemInstruction.parts[0].text,/Mây Long/);
});
test('An overloaded model falls back to the next one',async()=>{
  const seen=[];
  const u=upstream({gemini:url=>{seen.push(url);return url.includes(DEFAULT_MODELS[0])?new Response('busy',{status:503}):sse(['ok'])}});
  assert.equal(await (await handleTutor(post(chat),env,u.fetcher)).text(),'ok');
  assert.equal(seen.length,2);assert.match(seen[1],new RegExp(DEFAULT_MODELS[1]));
});
test('Grading returns a validated score card and rejects malformed model output',async()=>{
  const card={score:72,corrected:'我昨天去了学校。',pinyin:'Wǒ zuótiān qùle xuéxiào.',errors:[{part:'去学校了',issue:'Trật tự',fix:'去了学校'}],feedback:'Gần đúng.'};
  const ok=upstream({gemini:(url,init)=>{assert.match(url,/:generateContent$/);assert.equal(JSON.parse(init.body).generationConfig.responseMimeType,'application/json');return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(card)}]}}]});}});
  const response=await handleTutor(post({mode:'grade',sentence:'我昨天去学校了',meaning:'Hôm qua tôi đi học'}),env,ok.fetcher);
  assert.equal(response.status,200);assert.deepEqual((await response.json()).result,card);
  const prompt=JSON.parse(ok.calls.at(-1).init.body).contents[0].parts[0].text;
  assert.equal(prompt,'<cau>我昨天去学校了</cau>\n<y>Hôm qua tôi đi học</y>');
  const broken=upstream({gemini:()=>Response.json({candidates:[{content:{parts:[{text:'{"score":"cao"}'}]}}]})});
  assert.equal((await handleTutor(post({mode:'grade',sentence:'你好'}),env,broken.fetcher)).status,502);
  for(const invalid of [{...card,pinyin:undefined},{...card,corrected:null},{...card,errors:[{part:'我'}]}]){
    const malformed=upstream({gemini:()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify(invalid)}]}}]})});
    assert.equal((await handleTutor(post({mode:'grade',sentence:'你好'}),env,malformed.fetcher)).status,502);
  }
});
