import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {publicConfig} from './public-config.mjs';

export function migrationConnection(env=process.env) {
  const {url}=publicConfig(env);
  if(!url)throw Error('Migrations require the public Supabase project URL to verify database ownership.');
  const expected=new URL(url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  const raw=env.POSTGRES_URL_NON_POOLING||env.POSTGRES_URL||env.DATABASE_URL;
  if(!raw)throw Error('Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL. Connect the Supabase resource to this Vercel project before production deployment.');
  let target;
  try{target=new URL(raw);}catch{throw Error('Invalid PostgreSQL connection URL.');}
  const username=decodeURIComponent(target.username);
  const direct=expected&&target.hostname===`db.${expected}.supabase.co`&&username==='postgres';
  const pooled=expected&&target.hostname.endsWith('.pooler.supabase.com')&&username===`postgres.${expected}`;
  if(!['postgres:','postgresql:'].includes(target.protocol)||(!direct&&!pooled))throw Error('Database connection does not match the configured Supabase project. Refusing migration.');
  if(target.hash)throw Error('Invalid PostgreSQL URL fragment.');
  // Do not allow URI sslmode to override certificate verification in node-postgres.
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert','ssl'])target.searchParams.delete(key);
  return {connectionString:target.toString(),ssl:{rejectUnauthorized:true,...(env.HANZI_DB_CA_CERT?{ca:env.HANZI_DB_CA_CERT}:{})},connectionTimeoutMillis:15000,application_name:'hanzi-release-migrations'};
}
export async function readMigrations() {
  const names=(await readdir('supabase/migrations')).filter(name=>/^\d+_[a-z_]+\.sql$/.test(name)).sort();
  return Promise.all(names.map(async name=>{
    const text=(await readFile('supabase/migrations/'+name,'utf8')).replace(/\r\n/g,'\n');
    if(!/^begin;\s/i.test(text)||!/commit;\s*$/i.test(text))throw Error('Migration lacks explicit transaction: '+name);
    return {name,checksum:createHash('sha256').update(text).digest('hex'),sql:text.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'')};
  }));
}
export async function applyMigrations(db,migrations) {
  migrations??=await readMigrations();
  await db.query('begin');
  try {
    await db.query("set local lock_timeout='15s'; set local statement_timeout='120s'");
    await db.query('select pg_advisory_xact_lock(481638210)');
    await db.query(`create schema if not exists hanzi_release;
      revoke all on schema hanzi_release from public,anon,authenticated;
      create table if not exists hanzi_release.migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now());
      revoke all on hanzi_release.migrations from public,anon,authenticated;`);
    const applied=(await db.query('select name,checksum from hanzi_release.migrations order by name')).rows;
    for(const row of applied) {
      const file=migrations.find(m=>m.name===row.name);
      if(!file||file.checksum!==row.checksum)throw Error('An applied migration is missing or modified: '+row.name);
    }
    if(!applied.length) {
      const {rows}=await db.query("select to_regclass('public.profiles') is not null or to_regclass('public.classes') is not null or to_regclass('public.content_items') is not null as occupied");
      if(rows[0].occupied)throw Error('Existing schema has no Hanzi migration ledger. Review and baseline it before automatic migrations.');
    }
    let count=0;
    for(const migration of migrations) {
      if(applied.some(row=>row.name===migration.name))continue;
      await db.query(migration.sql);
      await db.query('insert into hanzi_release.migrations(name,checksum) values($1,$2)',[migration.name,migration.checksum]);
      count++;
    }
    await db.query("notify pgrst, 'reload schema'");
    await db.query('commit');return count;
  }catch(error){await db.query('rollback');throw error;}
}
export async function migrateCloud(env=process.env) {
  let db;
  try {
    db=new pg.Client(migrationConnection(env));await db.connect();
    const count=await applyMigrations(db);console.log(`Supabase migrations complete: ${count} applied.`);
  }catch(error){
    // Never print a connection string, password, or driver response in build logs.
    if(!db)throw error;
    throw Error(`Supabase migration failed${/^[0-9A-Z]{5}$/.test(error.code||'')?` (SQLSTATE ${error.code})`:''}. Check project ownership, TLS, migration ledger and database settings.`);
  }finally{if(db)await db.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{await migrateCloud();}catch(error){console.error(error.message);process.exitCode=1;}
}
