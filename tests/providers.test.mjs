import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleTutor} from '../server/tutor.mjs';
import {openaiSseToText,chatProviders} from '../server/providers.mjs';
const base={GEMINI_API_KEY:'g',HANZI_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',HANZI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const keys={...base,GROQ_API_KEY:'groq-key',OPENROUTER_API_KEY:'or-key',CLOUDFLARE_ACCOUNT_ID:'acct',CLOUDFLARE_API_TOKEN:'cf-token'};
const post=body=>new Request('https://hanzi.example/api/tutor',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer user'},body:JSON.stringify(body)});
const chat={mode:'chat',messages:[{role:'user',text:'吧 dùng khi nào?'},{role:'model',text:'Câu hỏi hay.'},{role:'user',text:'Cho ví dụ.'}]};
const openaiSse=parts=>new Response(parts.map(t=>`data: ${JSON.stringify({choices:[{delta:{content:t}}]})}\n\n`).join('')+'data: [DONE]\n\n');
// Supabase auth and quota pass; every AI call is answered by `ai(url, init)` and recorded.
function world(ai) {
  const calls=[];
  const fetcher=async(url,init={})=>{
    if(url.endsWith('/auth/v1/user'))return Response.json({id:'u'});
    if(url.endsWith('/rpc/consume_tutor_quota'))return Response.json(20);
    calls.push({url,init});return ai(url,init);
  };
  return {calls,fetcher,hosts:()=>calls.map(c=>new URL(c.url).hostname)};
}
const geminiDown=status=>url=>url.includes('generativelanguage')?new Response('{}',{status}):null;
test('Providers are enabled only by their keys, in rotation order',()=>{
  assert.deepEqual(chatProviders(base),[]);
  assert.deepEqual(chatProviders(keys).map(p=>p.name),['Groq','OpenRouter','Cloudflare']);
  assert.deepEqual(chatProviders({...keys,GROQ_MODELS:'a, b'})[0].models,['a','b']);
  assert.equal(chatProviders(keys)[2].url,'https://api.cloudflare.com/client/v4/accounts/acct/ai/v1/chat/completions');
});
test('Chat rotates from exhausted Gemini models to Groq and hides reasoning',async()=>{
  const w=world(url=>geminiDown(429)(url)||openaiSse(['<thi','nk>nghĩ thầm</th','ink>吧 ','dùng để gợi ý.']));
  const response=await handleTutor(post(chat),keys,w.fetcher);
  assert.equal(response.status,200);assert.equal(response.headers.get('x-tutor-provider'),'Groq');
  assert.equal(await response.text(),'吧 dùng để gợi ý.');
  assert.deepEqual(w.hosts(),['generativelanguage.googleapis.com','generativelanguage.googleapis.com','api.groq.com']);
  const sent=JSON.parse(w.calls[2].init.body);
  assert.equal(sent.model,'qwen/qwen3.8-27b');assert.equal(sent.stream,true);assert.equal(w.calls[2].init.headers.authorization,'Bearer groq-key');
  assert.deepEqual(sent.messages.map(m=>m.role),['system','user','assistant','user']);
  assert.match(sent.messages[0].content,/Mây Long/);
});
test('A rate-limited provider passes to the next one; a real Gemini error does not rotate',async()=>{
  const w=world(url=>geminiDown(503)(url)||(url.includes('groq')?new Response('{}',{status:429}):openaiSse(['OK'])));
  const response=await handleTutor(post(chat),keys,w.fetcher);
  assert.equal(response.headers.get('x-tutor-provider'),'OpenRouter');assert.equal(await response.text(),'OK');
  const bad=world(url=>url.includes('generativelanguage')?new Response('{}',{status:400}):openaiSse(['x']));
  assert.equal((await handleTutor(post(chat),keys,bad.fetcher)).status,502);
  assert.ok(!bad.hosts().includes('api.groq.com'));
  const none=world(geminiDown(429));
  assert.equal((await handleTutor(post(chat),base,none.fetcher)).status,502);
});
test('Grading falls back to a provider and validates its JSON',async()=>{
  const card={score:80,corrected:'我去了学校。',pinyin:'Wǒ qùle xuéxiào.',errors:[],feedback:'Tốt.'};
  const w=world(url=>geminiDown(429)(url)||Response.json({choices:[{message:{content:'<think>…</think>```json\n'+JSON.stringify(card)+'\n```'}}]}));
  const response=await handleTutor(post({mode:'grade',sentence:'我去学校了'}),keys,w.fetcher);
  assert.equal(response.headers.get('x-tutor-provider'),'Groq');assert.deepEqual((await response.json()).result,card);
  const wrong=world(url=>geminiDown(429)(url)||Response.json({choices:[{message:{content:'{"score":"cao"}'}}]}));
  assert.equal((await handleTutor(post({mode:'grade',sentence:'我去学校了'}),keys,wrong.fetcher)).status,502);
});
test('Speech to text tries Groq Whisper, then Cloudflare, then Gemini',async()=>{
  const audio=Buffer.from('fake-webm').toString('base64');
  const groq=world(url=>url.includes('audio/transcriptions')?Response.json({text:' 你好 '}):null);
  const first=await handleTutor(post({mode:'stt',audio,mime:'audio/webm;codecs=opus'}),keys,groq.fetcher);
  assert.deepEqual(await first.json(),{text:'你好',provider:'Groq Whisper'});
  const form=groq.calls[0].init.body;assert.equal(form.get('model'),'whisper-large-v3-turbo');assert.equal(form.get('language'),'zh');
  const cf=world(url=>url.includes('groq')?new Response('{}',{status:429}):Response.json({result:{text:'谢谢'},success:true}));
  assert.deepEqual(await (await handleTutor(post({mode:'stt',audio,mime:'audio/ogg'}),keys,cf.fetcher)).json(),{text:'谢谢',provider:'Cloudflare Whisper'});
  assert.equal(JSON.parse(cf.calls[1].init.body).audio,audio);
  const gem=world(url=>url.includes('generativelanguage')?Response.json({candidates:[{content:{parts:[{text:'再见'}]}}]}):null);
  assert.deepEqual(await (await handleTutor(post({mode:'stt',audio,mime:'audio/webm'}),base,gem.fetcher)).json(),{text:'再见',provider:'Gemini'});
  for(const bad of [{mode:'stt',audio:'not base64!',mime:'audio/webm'},{mode:'stt',audio,mime:'video/mp4'},{mode:'stt',audio:'A'.repeat(2_000_001),mime:'audio/webm'}])
    assert.equal((await handleTutor(post(bad),keys,world(()=>null).fetcher)).status,400);
});
test('Mandarin speech comes from Cloudflare MeloTTS when configured',async()=>{
  const mp3=Buffer.from([0x49,0x44,0x33]);
  const w=world(()=>Response.json({result:{audio:mp3.toString('base64')}}));
  const response=await handleTutor(post({mode:'speak',text:'你好'}),keys,w.fetcher);
  assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.deepEqual(Buffer.from(await response.arrayBuffer()),mp3);
  assert.deepEqual(JSON.parse(w.calls[0].init.body),{prompt:'你好',lang:'zh'});
  assert.equal((await handleTutor(post({mode:'speak',text:'你好'}),base,world(()=>null).fetcher)).status,503);
  assert.equal((await handleTutor(post({mode:'speak',text:'hello'}),keys,world(()=>null).fetcher)).status,400);
});
test('Streamed reasoning split across chunks never leaks',async()=>{
  const chunks=['data: {"choices":[{"delta":{"content":"<th"}}]}\n','\ndata: {"choices":[{"delta":{"content":"ink>secret</think>Đáp"}}]}\n\n',': OPENROUTER PROCESSING\n\ndata: {"choices":[{"delta":{"content":" án"}}]}\n\ndata: [DONE]\n\n'];
  const body=new ReadableStream({start(c){for(const x of chunks)c.enqueue(new TextEncoder().encode(x));c.close();}});
  assert.equal(await new Response(openaiSseToText(body)).text(),'Đáp án');
});
