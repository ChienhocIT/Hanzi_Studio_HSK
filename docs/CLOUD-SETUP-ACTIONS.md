# Kết nối project cloud hiện tại

## Đã kiểm tra thật

Project API đúng: **https://rpoqcklcmsnrbmhfxdxg.supabase.co**. URL đuôi `.supabase.com` trước đó không phân giải DNS. URL/publishable key do chủ dự án cung cấp nằm trong `config/public-cloud.json` cho build Production; `.env.local` phục vụ local vẫn bị Git ignore. Không dùng secret/service-role ở trình duyệt.

Commit `3d48fe4` đã push vào `main` ngày 2026-10-29. [CI GitHub](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/40761512437) đạt, gồm unit/build/database/browser. [Deployment Vercel đầu tiên](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/YmhdZMwzpout1WoBu2JUqpXS1NC7) thất bại; chủ dự án cung cấp log xác nhận thiếu public project URL. Bản sửa đưa cấu hình public vào gói Production và tách migration khỏi build tĩnh để dùng migration history hiện có. Cần kiểm tra trạng thái deployment của commit sửa tiếp theo.

**Bản sửa `8b7ac94` đã deploy thành công:** [Vercel](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/E5BFNRHGCtrasWXYf7nrvdQLp1Kr), [CI GitHub](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/40764179379). Domain `https://hanzistudiohsk.vercel.app` phục vụ bundle cloud và ngân hàng 4.997 mục HTTP 200, khớp hash build. Chrome kiểm tra được màn tài khoản và tra cứu bộ từ. Supabase MCP xác nhận migration thứ năm `202610290004_reference_vocabulary` đã có trong history; chưa nạp danh mục 11.000 mục vào production. Chi tiết tại [VERIFICATION.md](VERIFICATION.md).

Ngày 2026-10-29, kiểm tra đầu tiên thấy bảng còn thiếu. Sau khi push và kết nối MCP, đã xác minh bốn migration trong Supabase migration history; 11 bảng public đều bật RLS. GET Data API cho `profiles`, `assignment_questions`, `live_rooms` trả lỗi quyền cho khách đúng như thiết kế. Email bật, Google vẫn tắt. Không tạo tài khoản, gửi email hoặc ghi dữ liệu cá nhân trong các phép kiểm tra này. MCP Supabase đã đăng nhập; Vercel MCP cần chủ dự án chấp thuận quyền team `minh-chienhoc-it`.

## Database

Supabase integration đã quản lý migration history trên project thật. Build Vercel không chạy lại DDL; cấu hình public có sẵn cho project này. Kiểm tra schema qua `check:cloud` riêng với build tĩnh. Runner `scripts/migrate.mjs` vẫn là công cụ riêng cho cài mới dùng ledger Hanzi, không dùng đồng thời với migration history có sẵn nếu chưa baseline. Xem [biến Production và build](DEPLOYMENT.md#phát-hành-vào-project-vercel-hiện-tại).

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

Project đích do chủ dự án chỉ định: [minh-chienhoc-it / hanzi_studio_hsk](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/deployments). Phát hành qua Git integration nhánh `main`. MCP Vercel đã đăng nhập nhưng lần truy cập project bị 403 do chưa được cấp quyền team; đã tạo liên kết chấp thuận cho chủ dự án. Không cần tạo project mới.

Build nhận `HANZI_SUPABASE_*`, hoặc các cặp biến public `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` từ Marketplace; không sử dụng secret. Với local, `npm run build` và `check:cloud` tự đọc `.env.local`; biến đã đặt trong môi trường có ưu tiên cao hơn tệp.

Chủ dự án cung cấp domain `https://hanzistudiohsk.vercel.app`. Supabase Site URL dùng domain này; Redirect URLs cần `https://hanzistudiohsk.vercel.app/index.html` và localhost cần dùng. Các luồng email/Google trong ứng dụng đưa về `#settings`. Chưa xác nhận đã lưu các cài đặt Auth này trên dashboard. [Redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

Nghiệm thu: đăng ký/xác nhận email, đăng nhập Google, quên mật khẩu, refresh phiên, hai tài khoản, hai thiết bị, đọc/ghi tiến độ đúng quyền, lớp học và phòng thi thật. Chưa có bước nào ở đây được xác nhận production chỉ vì Marketplace báo đã connect.
