import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionConfig} from '../scripts/release-build.mjs';
const env={HANZI_SUPABASE_URL:'https://fixture.supabase.co',HANZI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
test('Production public defaults allow Git deployments without database credentials and respect environment overrides',()=>{
  assert.equal(productionConfig({}).url,'https://rpoqcklcmsnrbmhfxdxg.supabase.co');
  assert.deepEqual(productionConfig(env),{url:env.HANZI_SUPABASE_URL,key:env.HANZI_SUPABASE_PUBLISHABLE_KEY});
});
test('Production defaults cannot conceal partial environment configuration or ship a secret key',()=>{
  assert.throws(()=>productionConfig({HANZI_SUPABASE_URL:env.HANZI_SUPABASE_URL}),/both/);
  assert.throws(()=>productionConfig({...env,HANZI_SUPABASE_PUBLISHABLE_KEY:'sb_secret_fixture'}),/secret/);
});
