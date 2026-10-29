import pg from 'pg';
import {migrationConnection} from './migrate.mjs';
import {managementClient} from './management-api.mjs';
// Bootstrap the first administrator. Later role changes go through the in-app "Phân quyền" tab (RPC set_role).
const email=process.argv[2]?.trim();
let db;
try {
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Dùng: npm run db:promote-admin -- email@cua-ban.vn (tài khoản phải đã đăng ký và xác nhận email).');
  const direct=process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL||process.env.DATABASE_URL;
  if(direct){db=new pg.Client(migrationConnection());await db.connect();}else db=managementClient().database;
  const rows=(await db.query(`update public.profiles p set role='admin' from auth.users u
    where u.id=p.id and lower(u.email)=lower($1) and u.email_confirmed_at is not null returning p.id`,[email])).rows;
  if(!rows.length)throw Error('Không tìm thấy tài khoản đã xác nhận email với địa chỉ này. Đăng ký và bấm liên kết trong email xác nhận trước.');
  console.log('Đã cấp quyền quản trị viên. Đăng xuất rồi đăng nhập lại để thấy tab "Phân quyền".');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(db?.end)await db.end().catch(()=>{});}
