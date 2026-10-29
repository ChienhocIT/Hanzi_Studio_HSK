import {publicConfig} from './public-config.mjs';
// Supabase Management API client for release operators. The personal access token stays in .env.local and is never printed.
export function managementTarget(env=process.env) {
  const {url}=publicConfig(env);
  const ref=url&&new URL(url).hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
  if(!ref)throw Error('Thiếu HANZI_SUPABASE_URL dạng https://<ref>.supabase.co để xác định project.');
  const token=env.SUPABASE_ACCESS_TOKEN;
  if(!token)throw Error('Thiếu SUPABASE_ACCESS_TOKEN. Tạo token tại https://supabase.com/dashboard/account/tokens và đặt vào .env.local.');
  if(!/^sbp_[A-Za-z0-9_]{20,}$/.test(token))throw Error('SUPABASE_ACCESS_TOKEN không đúng dạng sbp_… của Supabase.');
  return {ref,token};
}
export function managementClient(env=process.env,fetcher=fetch) {
  const {ref,token}=managementTarget(env);
  async function request(method,path,body) {
    const response=await fetcher(`https://api.supabase.com/v1/projects/${ref}${path}`,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
    const text=await response.text();
    if(!response.ok)throw Error(`Supabase Management API ${method} ${path}: HTTP ${response.status} ${text.slice(0,300)}`);
    return text?JSON.parse(text):null;
  }
  return {
    ref,request,
    // node-postgres-shaped adapter. Each statement commits on its own, so callers must not rely on begin/rollback.
    database:{atomic:false,query:async(sql,parameters=[])=>({rows:await request('POST','/database/query',{query:sql,parameters})})}
  };
}
