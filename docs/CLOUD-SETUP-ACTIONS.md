# Kết nối project cloud hiện tại

## Đã kiểm tra thật

Project API đúng: **https://rpoqcklcmsnrbmhfxdxg.supabase.co**. URL đuôi `.supabase.com` trước đó không phân giải DNS. Publishable key do chủ dự án cung cấp được đặt trong `.env.local` bị Git ignore, không dùng secret/service-role ở trình duyệt.

Ngày 2026-10-29, GET Auth settings cho thấy email bật, Google tắt; GET Data API cho thấy các bảng `profiles`, `assignment_questions`, `live_rooms` chưa có trong schema cache. Không tạo tài khoản, gửi email hay ghi dữ liệu cloud trong các phép kiểm tra này. Chưa có phiên quản trị Supabase hoặc phiên Vercel CLI để thực hiện thiết lập thay chủ dự án.

## Database

Đã có runner `scripts/migrate.mjs`: Production Vercel áp dụng bốn migration qua `POSTGRES_URL_NON_POOLING`/`POSTGRES_URL` trong môi trường server, lưu ledger/checksum, khóa chạy đồng thời và rollback nếu lỗi. Đây là đường triển khai chính khi Supabase Marketplace đã cung cấp kết nối database. Không đủ hai biến public để chạy DDL. Xem [biến Production và build](DEPLOYMENT.md#phát-hành-vào-project-vercel-hiện-tại).

`npm run db:bundle` vẫn xuất `.review/hanzi-bootstrap.sql` cho phương án SQL Editor thủ công; không dùng song song với runner. Guard từ chối bảng Hanzi đã tồn tại. Với cài đặt thủ công có sẵn, cần đối chiếu lịch sử trước khi baseline ledger; không tự nhận một schema chưa kiểm chứng là đã migrate đúng.

Sau đó chạy `npm run check:cloud`; phép kiểm tra public vẫn chưa thay thế nghiệm thu tài khoản thật, dữ liệu cá nhân và policy.

## Google OAuth

Cần chủ dự án xác định tài khoản Google quản lý dự án và email hỗ trợ. Tạo OAuth Web Application trong Google Auth Platform, đặt tên Hanzi Studio, origin theo domain Vercel thực tế và redirect URI chính xác:

```text
https://rpoqcklcmsnrbmhfxdxg.supabase.co/auth/v1/callback
```

Client ID/secret cấu hình trực tiếp trong [Supabase Google provider](https://supabase.com/dashboard/project/rpoqcklcmsnrbmhfxdxg/auth/providers). Secret không đưa vào Git hoặc bundle. Nếu app đang Testing, thêm tài khoản thử đúng email. Consent/publishing theo tài khoản tổ chức của chủ dự án; chưa được thực hiện tự động trong đợt này. [Hướng dẫn chính thức](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Email và SMTP

Cần tên miền gửi do chủ dự án sở hữu, email From và tài khoản nhà cung cấp SMTP. Chỉ domain `vercel.app` không cho dự án quyền tự thêm DNS gửi email. Chưa tạo dịch vụ có phí hoặc cam kết thuê bao.

Sau khi có dịch vụ, xác minh domain bằng DNS do nhà cung cấp yêu cầu, cấu hình host/port/user/password trong Supabase Auth SMTP và kiểm tra SPF/DKIM. Các mẫu tiếng Việt sẵn ở `supabase/email-templates/confirmation.html` và `recovery.html`; dùng biến chuẩn `{{ .ConfirmationURL }}`. Chưa đưa mẫu lên dashboard hoặc gửi thư thử. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Vercel và callback của ứng dụng

Project đích do chủ dự án chỉ định: [minh-chienhoc-it / hanzi_studio_hsk](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/deployments). Phát hành qua Git integration nhánh `main`; máy hiện chưa có phiên Vercel CLI để đọc/sửa biến hoặc xem log riêng tư. Không cần tạo project mới.

Build nhận `HANZI_SUPABASE_*`, hoặc các cặp biến public `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` từ Marketplace; không sử dụng secret. Với local, `npm run build` và `check:cloud` tự đọc `.env.local`; biến đã đặt trong môi trường có ưu tiên cao hơn tệp.

Supabase Site URL và Redirect URLs cần domain ứng dụng thật, gồm callback `https://<domain>/index.html` và localhost cần dùng. Các luồng email/Google trong ứng dụng đưa về `#settings`. [Redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

Nghiệm thu: đăng ký/xác nhận email, đăng nhập Google, quên mật khẩu, refresh phiên, hai tài khoản, hai thiết bị, đọc/ghi tiến độ đúng quyền, lớp học và phòng thi thật. Chưa có bước nào ở đây được xác nhận production chỉ vì Marketplace báo đã connect.
