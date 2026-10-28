import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export async function migrationBundle() {
const files=(await readdir('supabase/migrations')).filter(x=>/^\d+_[a-z_]+\.sql$/.test(x)).sort();
const sections=[];
for(const file of files) {
  const text=await readFile('supabase/migrations/'+file,'utf8');
  if(!/^begin;\s/i.test(text)||!/commit;\s*$/i.test(text))throw Error('Unexpected migration transaction format: '+file);
  sections.push(`-- ${file}; SHA-256 ${createHash('sha256').update(text).digest('hex')}\n`+text.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,''));
}
const guard=`do $$ begin
  if to_regclass('public.profiles') is not null or to_regclass('public.learning_progress') is not null
    or to_regclass('public.classes') is not null or to_regclass('public.content_items') is not null then
    raise exception 'Hanzi tables already exist. Apply missing individual migrations instead of this initial bootstrap.';
  end if;
end $$;`;
return `-- Hanzi Studio: first installation only. Verify project rpoqcklcmsnrbmhfxdxg in Supabase SQL Editor.\n-- Entire installation is atomic. No drop table or user data deletion.\nbegin;\n${guard}\n${sections.join('\n')}\ncommit;\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  await mkdir('.review',{recursive:true});await writeFile('.review/hanzi-bootstrap.sql',await migrationBundle());
  console.log('Prepared .review/hanzi-bootstrap.sql. Not executed on any cloud database.');
}
