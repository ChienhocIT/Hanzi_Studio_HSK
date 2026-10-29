import {pathToFileURL} from 'node:url';
import {managementClient} from './management-api.mjs';
import {readdirSync,readFileSync} from 'node:fs';
// Configure Supabase Auth for production: site URL, redirect allow list, custom SMTP with Vietnamese emails, Google sign-in.
// Dry run by default; pass --apply to write. Secrets come from .env.local and are masked in every printout.
export const SECRET_FIELDS=['smtp_pass','external_google_secret'];
const TEMPLATE_DIR=new URL('../supabase/email-templates/',import.meta.url);
const TEMPLATE_NAMES=['confirmation','recovery','magic_link','email_change','invite','reauthentication'];
// One HTML file per Supabase email type; the <title> is the subject line.
export function emailTemplates(dir=TEMPLATE_DIR) {
  const files=new Set(readdirSync(dir));
  return Object.fromEntries(TEMPLATE_NAMES.filter(name=>files.has(name+'.html')).map(name=>{
    const html=readFileSync(new URL(name+'.html',dir),'utf8');
    const subject=html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    if(!subject)throw Error(`Mẫu email ${name}.html thiếu <title> làm tiêu đề.`);
    return [name,[subject,html]];
  }));
}
const httpsOrigin=(value,name)=>{
  let parsed;try{parsed=new URL(value);}catch{throw Error(`${name} không phải URL hợp lệ.`);}
  const local=parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname);
  if((parsed.protocol!=='https:'&&!local)||parsed.username||parsed.search||parsed.hash||!['','/'].includes(parsed.pathname))throw Error(`${name} phải là origin HTTPS, không có đường dẫn, ví dụ https://hanzistudiohsk.vercel.app.`);
  return parsed.origin;
};
export function authPayload(env,current={}) {
  const site=httpsOrigin(env.HANZI_SITE_URL||'https://hanzistudiohsk.vercel.app','HANZI_SITE_URL');
  const extra=(env.HANZI_AUTH_EXTRA_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>httpsOrigin(x,'HANZI_AUTH_EXTRA_ORIGINS'));
  // Keep redirect entries someone added in the dashboard; only add ours.
  const allow=[...new Set([...(current.uri_allow_list||'').split(',').map(x=>x.trim()).filter(Boolean),...[site,...extra].map(x=>x+'/**')])];
  const payload={site_url:site,uri_allow_list:allow.join(','),external_email_enabled:true,mailer_autoconfirm:false,mailer_secure_email_change_enabled:true};
  const smtpKeys=['SMTP_HOST','SMTP_USER','SMTP_PASS','SMTP_FROM'];
  const smtpSet=smtpKeys.filter(k=>env[k]);
  if(smtpSet.length&&smtpSet.length<smtpKeys.length)throw Error(`Cấu hình SMTP thiếu: ${smtpKeys.filter(k=>!env[k]).join(', ')}.`);
  const smtp=smtpSet.length===smtpKeys.length;
  if(smtp) {
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.SMTP_FROM))throw Error('SMTP_FROM phải là một địa chỉ email, ví dụ no-reply@tenmien.vn.');
    if(!/^[a-z0-9.-]+$/i.test(env.SMTP_HOST))throw Error('SMTP_HOST chỉ gồm tên máy chủ, ví dụ smtp.resend.com.');
    const port=String(env.SMTP_PORT||'587');
    if(!['25','465','587','2525'].includes(port))throw Error('SMTP_PORT nên là 465 hoặc 587.');
    const rate=Number(env.SMTP_RATE_LIMIT||30);
    if(!Number.isInteger(rate)||rate<1||rate>1000)throw Error('SMTP_RATE_LIMIT phải là số email mỗi giờ, từ 1 đến 1000.');
    Object.assign(payload,{smtp_host:env.SMTP_HOST,smtp_port:port,smtp_user:env.SMTP_USER,smtp_pass:env.SMTP_PASS,smtp_admin_email:env.SMTP_FROM,smtp_sender_name:env.SMTP_SENDER_NAME||'Hanzi Studio',smtp_max_frequency:60,rate_limit_email_sent:rate});
  }
  // Supabase only sends customised templates through custom SMTP.
  if(smtp||current.smtp_host)for(const [name,[subject,content]] of Object.entries(emailTemplates())){payload[`mailer_subjects_${name}`]=subject;payload[`mailer_templates_${name}_content`]=content;}
  const googleSet=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'].filter(k=>env[k]);
  if(googleSet.length===1)throw Error('Cần cả GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.');
  const google=googleSet.length===2;
  if(google) {
    if(!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID))throw Error('GOOGLE_CLIENT_ID phải có dạng <số>-<mã>.apps.googleusercontent.com.');
    Object.assign(payload,{external_google_enabled:true,external_google_client_id:env.GOOGLE_CLIENT_ID,external_google_secret:env.GOOGLE_CLIENT_SECRET});
  }
  return {payload,smtp,google};
}
export const mask=payload=>Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,SECRET_FIELDS.includes(k)?'••••':/^mailer_templates_/.test(k)?`<HTML ${v.length} ký tự>`:v]));
const summary=c=>({site_url:c.site_url,uri_allow_list:c.uri_allow_list||'(trống)',email_confirm:c.mailer_autoconfirm===false?'bắt buộc xác nhận':'tự xác nhận',smtp:c.smtp_host?`${c.smtp_host}:${c.smtp_port} từ ${c.smtp_admin_email}`:'SMTP mặc định của Supabase (chỉ gửi cho thành viên project, ~2 email/giờ)',email_per_hour:c.rate_limit_email_sent,google:c.external_google_enabled?`bật (${c.external_google_client_id})`:'tắt'});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const api=managementClient();
    const current=await api.request('GET','/config/auth');
    console.log('Cấu hình Auth hiện tại:',summary(current));
    const {payload,smtp,google}=authPayload(process.env,current);
    console.log(`\nGoogle callback URL cần khai báo trong Google Cloud Console: https://${api.ref}.supabase.co/auth/v1/callback`);
    if(!smtp)console.log('Chưa đặt SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM: giữ nguyên SMTP hiện tại.');
    if(!google)console.log('Chưa đặt GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: giữ nguyên Google provider.');
    console.log('\nThay đổi sẽ gửi:',mask(payload));
    if(!process.argv.includes('--apply')){console.log('\nChạy thử, chưa ghi gì. Thêm --apply để áp dụng: npm run auth:configure -- --apply');}
    else {
      const updated=await api.request('PATCH','/config/auth',payload);
      console.log('\nĐã áp dụng. Cấu hình mới:',summary(updated));
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
