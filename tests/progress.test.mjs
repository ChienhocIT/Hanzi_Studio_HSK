import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS,OWNER,META,snapshot,applySnapshot,switchOwner,uploadProgress,validateSnapshot,recoveryBackup } from '../src/progress.js';
function storage() {const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const state=n=>({[KEYS[0]]:{v:1,records:{},bookmarks:[],events:[],quizHistory:[],settings:{goal:n}}});
test('Account switching isolates guest and separate users without losing progress',()=>{
  const s=storage();applySnapshot(s,state(20));switchOwner(s,'alice');assert.deepEqual(snapshot(s),{});
  applySnapshot(s,state(30));switchOwner(s,'bob');assert.deepEqual(snapshot(s),{});
  applySnapshot(s,state(40));switchOwner(s,'alice');assert.deepEqual(snapshot(s),state(30));
  switchOwner(s,'');assert.deepEqual(snapshot(s),state(20));
});
test('Reject unknown groups, invalid structures and oversized content',()=>{
  assert.throws(()=>validateSnapshot({password:{}}));assert.throws(()=>validateSnapshot({[KEYS[0]]:{v:1}}));
  assert.throws(()=>validateSnapshot({[KEYS[3]]:{x:'a'.repeat(7*1024*1024)}}));
});
test('A storage write failure rolls back all four groups',()=>{
  const s=storage();applySnapshot(s,state(20));const original=s.setItem;
  s.setItem=(k,v)=>{if(k===KEYS[1])throw Error('quota');return original(k,v);};
  assert.throws(()=>applySnapshot(s,{...state(30),[KEYS[1]]:{progress:{},injected:[],importLog:[]}}));
  assert.deepEqual(snapshot(s),state(20));
});
test('Successful CAS remembers revision and detects local edits made during upload',async()=>{
  const s=storage();s.setItem(OWNER,'alice');s.setItem(META,JSON.stringify({owner:'alice',revision:2}));applySnapshot(s,state(20));
  const client={rpc:async(name,args)=>{assert.equal(name,'save_progress');assert.equal(args.owner_uuid,'alice');assert.equal(args.expected_revision,2);applySnapshot(s,state(30));return {data:3,error:null};}};
  assert.deepEqual(await uploadProgress(client,s,'alice'),{revision:3,pending:true});
  assert.equal(JSON.parse(s.getItem(META)).revision,3);assert.deepEqual(snapshot(s),state(30));
});
test('Conflicts never advance revision or mutate local progress',async()=>{
  const s=storage();s.setItem(OWNER,'alice');s.setItem(META,JSON.stringify({owner:'alice',revision:2}));applySnapshot(s,state(20));
  await assert.rejects(uploadProgress({rpc:async()=>({error:Error('progress_conflict')})},s,'alice'),/progress_conflict/);
  assert.equal(JSON.parse(s.getItem(META)).revision,2);assert.deepEqual(snapshot(s),state(20));
});
test('Wrong account cannot upload another user snapshot',async()=>{
  const s=storage();s.setItem(OWNER,'alice');await assert.rejects(uploadProgress({rpc:()=>assert.fail('must not call')},s,'bob'),/Tài khoản/);
});
test('Recovery exports use the existing full-backup format and exclude auth tokens',()=>{
  const backup=recoveryBackup(state(20));
  assert.equal(backup.format,'hanzi-studio-full-backup');assert.equal(backup.version,1);
  assert.deepEqual(JSON.parse(backup.storage[KEYS[0]]),state(20)[KEYS[0]]);
  assert.throws(()=>recoveryBackup({'sb-demo-auth-token':{access_token:'fake'}}));
});
