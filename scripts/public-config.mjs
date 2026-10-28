export function publicConfig(env=process.env) {
  // Select a complete namespace; never pair a URL from one project with another key.
  const pairs=[['HANZI_SUPABASE_URL','HANZI_SUPABASE_PUBLISHABLE_KEY'],['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'],['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY']];
  const hasHanzi=env.HANZI_SUPABASE_URL||env.HANZI_SUPABASE_PUBLISHABLE_KEY;
  const pair=hasHanzi?pairs[0]:pairs.slice(1).find(([url,key])=>env[url]&&env[key])||pairs.slice(1).find(([url,key])=>env[url]||env[key]);
  const [url,key]=pair?[env[pair[0]]||'',env[pair[1]]||'']:['',''];
  if(Boolean(url)!==Boolean(key))throw Error('Set both public Supabase configuration values.');
  if(!url)return {url:'',key:''};
  let parsed;
  try{parsed=new URL(url);}catch{throw Error('Invalid Supabase URL.');}
  if(parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('Supabase URL must not contain credentials, query or fragment.');
  if(parsed.protocol!=='https:' && !(parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error('Supabase requires HTTPS.');
  if(key.startsWith('sb_secret_'))throw Error('A secret key cannot be shipped to the browser.');
  if(!key.startsWith('sb_publishable_')) {
    try {
      const parts=key.split('.');
      if(parts.length!==3||JSON.parse(Buffer.from(parts[1],'base64url').toString()).role!=='anon')throw Error();
    }catch{throw Error('Only a publishable key or legacy anon JWT is allowed.');}
  }
  return {url:url.replace(/\/$/,''),key};
}
