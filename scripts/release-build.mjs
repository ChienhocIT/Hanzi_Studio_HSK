import {pathToFileURL} from 'node:url';
import {publicConfig} from './public-config.mjs';
import deployment from '../config/public-cloud.json' with {type:'json'};

// Supabase's repository integration owns migrations. Static builds only verify
// public configuration; availability is checked separately with check:cloud.
export function productionConfig(env=process.env) {
  const configured=publicConfig(env);
  return configured.url?configured:publicConfig({HANZI_SUPABASE_URL:deployment.url,HANZI_SUPABASE_PUBLISHABLE_KEY:deployment.key});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.env.VERCEL_ENV==='production') {
    const config=productionConfig();
    process.env.HANZI_SUPABASE_URL=config.url;
    process.env.HANZI_SUPABASE_PUBLISHABLE_KEY=config.key;
  }
  await import('./build.mjs');
}
