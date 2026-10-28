import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { exerciseDatabase } from '../tests/database.mjs';
import { exerciseQuizzes } from '../tests/quiz-database.mjs';
import { exerciseLiveRooms } from '../tests/live-database.mjs';
import { exerciseVocabulary } from '../tests/vocabulary-database.mjs';
import {migrationBundle} from './bundle-migrations.mjs';
import {applyMigrations,readMigrations} from './migrate.mjs';
const name='hanzi-tests-'+randomUUID().slice(0,8), password=randomUUID();
let started=false,db;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try {
  docker('run','--detach','--rm','--name',name,'--label','app=hanzi-disposable-tests','--publish','127.0.0.1::5432','--env',`POSTGRES_PASSWORD=${password}`,'postgres:16-alpine');
  started=true;
  const port=JSON.parse(docker('inspect',name))[0].NetworkSettings.Ports['5432/tcp'][0].HostPort;
  for(let attempt=0;attempt<40;attempt++) {
    db=new pg.Client({host:'127.0.0.1',port:Number(port),user:'postgres',password,database:'postgres'});
    try {await db.connect();break;} catch(error) {await db.end().catch(()=>{});db=null;if(attempt===39)throw error;await new Promise(resolve=>setTimeout(resolve,500));}
  }
  await db.query(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  const migrations=await readMigrations();
  assert.equal(await applyMigrations(db,migrations),migrations.length);
  console.log(`PASS Production runner installs the ${migrations.length} migrations atomically.`);
  assert.equal(await applyMigrations(db,migrations),0);
  console.log('PASS Production runner does not reapply existing migrations.');
  await assert.rejects(applyMigrations(db,migrations.map((m,i)=>i===0?{...m,checksum:'changed'}:m)),/missing or modified/);
  console.log('PASS Production runner rejects modified migration history.');
  await assert.rejects(applyMigrations(db,[...migrations,{name:'999999999999_test_failure.sql',checksum:'test',sql:'create table public.hanzi_rollback_probe(id integer); select 1/0;'}]));
  assert.equal((await db.query("select to_regclass('public.hanzi_rollback_probe') name")).rows[0].name,null);
  assert.equal((await db.query('select count(*)::integer count from hanzi_release.migrations')).rows[0].count,migrations.length);
  console.log('PASS Production runner rolls back a failed pending migration.');
  let guarded=false;
  try{await db.query(await migrationBundle());}catch(error){guarded=error.message.includes('Hanzi tables already exist');await db.query('rollback');}
  if(!guarded)throw Error('Bootstrap must reject existing Hanzi tables.');
  console.log('PASS Initial bootstrap refuses an existing installation without altering data.');
  await exerciseDatabase(db);
  await exerciseQuizzes(db);
  await exerciseLiveRooms(db);
  await exerciseVocabulary(db);
} finally {
  if(db)await db.end();
  if(started) {
    const item=JSON.parse(docker('inspect',name))[0];
    if(item.Name==='/'+name&&item.Config.Labels['app']==='hanzi-disposable-tests')docker('stop',name);
  }
}
