import { publicConfig } from './public-config.mjs';
import { pathToFileURL } from 'node:url';

// Read-only probes: never sign up, send email, change auth settings, or write data.
export async function checkCloud(config,fetcher=fetch) {
  if(!config.url||!config.key)throw Error('Thiếu HANZI_SUPABASE_URL và HANZI_SUPABASE_PUBLISHABLE_KEY.');
  const headers={apikey:config.key};
  if(!config.key.startsWith('sb_publishable_'))headers.Authorization=`Bearer ${config.key}`;
  const get=async path=>{
    let response;
    try {response=await fetcher(config.url+path,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(10000)});}
    catch{throw Error('Không kết nối được cloud. Kiểm tra project URL và mạng.');}
    let body;try{body=await response.json();}catch{throw Error('Cloud trả về dữ liệu không hợp lệ.');}
    return {status:response.status,body};
  };
  const settings=await get('/auth/v1/settings');
  if(settings.status!==200)throw Error('Không đọc được Auth settings. Kiểm tra URL và publishable key.');
  const tables=['profiles','assignment_questions','live_rooms'];
  const checks=await Promise.all(tables.map(async table=>{
    const result=await get(`/rest/v1/${table}?select=*&limit=0`);
    return {table,anonymousDenied:[401,403].includes(result.status)&&result.body.code==='42501',missing:result.body.code==='PGRST205'||result.body.code==='42P01'};
  }));
  return {google:settings.body.external?.google===true,email:settings.body.external?.email===true,signups:settings.body.disable_signup===false,checks,smtpVerified:false,oauthCallbackVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const result=await checkCloud(publicConfig());
    console.log(`Google provider: ${result.google?'đã bật':'chưa bật'}. Email provider: ${result.email?'đã bật':'chưa bật'}.`);
    for(const check of result.checks)console.log(`${check.table}: ${check.anonymousDenied?'đã từ chối truy cập ẩn danh':check.missing?'thiếu migration':'quyền truy cập chưa đúng hoặc chưa xác minh'}.`);
    console.log('SMTP gửi thực, Google callback và luồng học viên vẫn cần nghiệm thu riêng. Không có email hay dữ liệu nào được tạo bởi lệnh này.');
    if(!result.google||!result.email||result.checks.some(c=>!c.anonymousDenied))process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
