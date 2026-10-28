import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicConfig} from '../scripts/public-config.mjs';
import {checkCloud} from '../scripts/cloud-check.mjs';
const config={url:'https://fixture.supabase.co',key:'sb_publishable_fixture'};
const env=key=>({HANZI_SUPABASE_URL:config.url,HANZI_SUPABASE_PUBLISHABLE_KEY:key});
test('Public config permits guest mode and public keys without admitting server secrets',()=>{
  assert.deepEqual(publicConfig({}),{url:'',key:''});assert.deepEqual(publicConfig(env(config.key)),config);
  assert.throws(()=>publicConfig({HANZI_SUPABASE_URL:config.url}));
  for(const key of ['sb_secret_fixture','invalid-key','header.'+Buffer.from('{"role":"service_role"}').toString('base64url')+'.signature'])assert.throws(()=>publicConfig(env(key)));
  const anon='header.'+Buffer.from('{"role":"anon"}').toString('base64url')+'.signature';assert.equal(publicConfig(env(anon)).key,anon);
  assert.throws(()=>publicConfig({...env(config.key),HANZI_SUPABASE_URL:'http://example.com'}));
  assert.throws(()=>publicConfig({...env(config.key),HANZI_SUPABASE_URL:'https://user:password@example.com'}));
});
test('Vercel Marketplace public variables work without accepting secret-only configuration',()=>{
  assert.deepEqual(publicConfig({NEXT_PUBLIC_SUPABASE_URL:config.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.key}),config);
  assert.deepEqual(publicConfig({SUPABASE_URL:config.url,SUPABASE_PUBLISHABLE_KEY:config.key,SUPABASE_SECRET_KEY:'sb_secret_must_not_ship'}),config);
  assert.throws(()=>publicConfig({SUPABASE_URL:config.url,SUPABASE_SECRET_KEY:'sb_secret_must_not_ship'}));
  assert.throws(()=>publicConfig({HANZI_SUPABASE_URL:config.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.key}));
  assert.deepEqual(publicConfig({...env(config.key),SUPABASE_URL:'https://another.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_other'}),config);
  const anon='header.'+Buffer.from('{"role":"anon"}').toString('base64url')+'.signature';
  assert.equal(publicConfig({NEXT_PUBLIC_SUPABASE_URL:config.url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon}).key,anon);
});
test('Cloud readiness uses GET only and keeps SMTP/OAuth acceptance unverified',async()=>{
  const requests=[];
  const result=await checkCloud(config,async(url,options)=>{
    requests.push({url,options});
    return url.includes('/settings')?{status:200,json:async()=>({external:{google:true,email:true},disable_signup:false})}:{status:url.includes('/live_rooms')?401:403,json:async()=>({code:'42501'})};
  });
  assert.equal(requests.length,4);assert.ok(requests.every(r=>r.options.method==='GET'));
  assert.equal(result.google,true);assert.equal(result.email,true);assert.ok(result.checks.every(c=>c.anonymousDenied));
  assert.equal(result.smtpVerified,false);assert.equal(result.oauthCallbackVerified,false);
});
test('Public table access or missing migrations cannot appear ready',async()=>{
  const result=await checkCloud(config,async url=>url.includes('/settings')?{status:200,json:async()=>({external:{email:true}})}:
    url.includes('/live_rooms')?{status:404,json:async()=>({code:'PGRST205'})}:{status:200,json:async()=>[]});
  assert.equal(result.google,false);assert.ok(result.checks.every(c=>!c.anonymousDenied));assert.equal(result.checks.find(c=>c.table==='live_rooms').missing,true);
});
test('Cloud network/auth failures return safe errors without exposing keys',async()=>{
  await assert.rejects(checkCloud(config,async()=>{throw Error(config.key);}),error=>!error.message.includes(config.key)&&error.message.includes('Không kết nối'));
  await assert.rejects(checkCloud(config,async()=>({status:401,json:async()=>({})})),/Auth settings/);
});
