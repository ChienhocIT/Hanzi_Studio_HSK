import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrationConnection,readMigrations} from '../scripts/migrate.mjs';
const base={HANZI_SUPABASE_URL:'https://fixtureproject.supabase.co',HANZI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
test('Migration connection is bound to the public project and always verifies TLS',()=>{
  const direct=migrationConnection({...base,POSTGRES_URL:'postgres://postgres:fixture@db.fixtureproject.supabase.co:5432/postgres?sslmode=disable'});
  assert.equal(direct.ssl.rejectUnauthorized,true);assert.ok(!direct.connectionString.includes('sslmode'));
  const pool=migrationConnection({...base,POSTGRES_URL_NON_POOLING:'postgres://postgres.fixtureproject:fixture@aws-0-test.pooler.supabase.com:5432/postgres'});
  assert.equal(pool.ssl.rejectUnauthorized,true);
  for(const url of ['postgres://postgres:fixture@db.another.supabase.co/postgres','postgres://postgres.another:fixture@aws-0-test.pooler.supabase.com/postgres','postgres://postgres.fixtureproject:fixture@example.org/postgres'])assert.throws(()=>migrationConnection({...base,POSTGRES_URL:url}),/does not match/);
  assert.throws(()=>migrationConnection(base),/Missing POSTGRES/);
});
test('Every migration is hashed and the runner removes the file transaction wrappers',async()=>{
  const migrations=await readMigrations();assert.equal(migrations.length,11);
  for(const m of migrations){assert.match(m.checksum,/^[a-f0-9]{64}$/);assert.ok(!/^begin;/.test(m.sql));assert.ok(!/commit;\s*$/.test(m.sql));}
});
