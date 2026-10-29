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

## Cấu hình Auth, Google, SMTP và dữ liệu bằng script (2026-10-29)

Mọi bước ghi dùng một **Supabase personal access token** đặt trong `.env.local` (Git ignore; build không đưa vào `dist/`). Tạo tại [Account → Access Tokens](https://supabase.com/dashboard/account/tokens), nên đặt hạn dùng ngắn và thu hồi sau khi xong. Token có quyền trên mọi project của tài khoản, không gửi qua chat hay commit. Xem các biến ở `.env.example`.

1. **SMTP.** Chọn nhà cung cấp (ví dụ Resend, Brevo, Amazon SES) và xác minh domain gửi bằng SPF/DKIM theo hướng dẫn của họ. Domain `vercel.app` không thêm DNS được, nên cần domain riêng. Đặt `SMTP_HOST`, `SMTP_PORT` (465/587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Nếu thiếu SMTP riêng, Supabase chỉ gửi thư tới thành viên project, khoảng 2 thư/giờ, nên học viên thật không nhận được email xác nhận.
2. **Google.** Trong [Google Auth Platform](https://console.cloud.google.com/auth/clients), tạo OAuth client loại *Web application*:
   - Authorized JavaScript origins: `https://hanzistudiohsk.vercel.app`
   - Authorized redirect URIs: `https://rpoqcklcmsnrbmhfxdxg.supabase.co/auth/v1/callback`
   - Data Access: thêm scope `openid` (email, profile có sẵn). Khi app còn ở chế độ Testing, chỉ tài khoản test được đăng nhập; chuyển sang In production khi phát hành.

   Đặt `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. `npm run auth:configure` đọc cấu hình hiện tại và in thay đổi (secret được che), chưa ghi gì. Kiểm tra xong chạy `npm run auth:configure -- --apply`. Script đặt:
   - Site URL và giữ các redirect đã có, thêm `https://hanzistudiohsk.vercel.app/**`.
   - Bắt buộc xác nhận email.
   - SMTP và 6 mẫu email tiếng Việt trong `supabase/email-templates/` (tiêu đề là thẻ `<title>`).
   - Google provider.

   Nhóm biến nào để trống thì nhóm đó giữ nguyên.
4. `npm run check:cloud` xác nhận email và Google đã bật. Sau đó thử thật: đăng ký, nhận email, đăng nhập Google, quên mật khẩu.
5. **Quản trị viên đầu tiên:** đăng ký trên website, bấm link xác nhận, rồi chạy `npm run db:promote-admin -- email@cua-ban.vn`. Từ đó cấp quyền trong tab "Phân quyền".
6. **11.000 từ HSK 3.0:** `npm run data:import-hsk3` (một lần, tạo `.sources/`), rồi `npm run db:seed-vocabulary`. Lệnh dùng `POSTGRES_URL` nếu có, nếu không thì gửi qua Management API theo lô 1.000 mục. Có thể chạy lại an toàn. Mọi mục vào ở trạng thái nháp. Quản trị viên mở **Kho dữ liệu → Danh mục từ HSK 3.0**, chọn cấp, đối chiếu rồi bấm "Xuất bản" để học viên thấy.

## Vercel và callback của ứng dụng

Project đích do chủ dự án chỉ định: [minh-chienhoc-it / hanzi_studio_hsk](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/deployments). Phát hành qua Git integration nhánh `main`. MCP Vercel đã đăng nhập nhưng lần truy cập project bị 403 do chưa được cấp quyền team; đã tạo liên kết chấp thuận cho chủ dự án. Không cần tạo project mới.

Build nhận `HANZI_SUPABASE_*`, hoặc các cặp biến public `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` từ Marketplace; không sử dụng secret. Với local, `npm run build` và `check:cloud` tự đọc `.env.local`; biến đã đặt trong môi trường có ưu tiên cao hơn tệp.

Chủ dự án cung cấp domain `https://hanzistudiohsk.vercel.app`. Supabase Site URL dùng domain này; Redirect URLs cần `https://hanzistudiohsk.vercel.app/index.html` và localhost cần dùng. Các luồng email/Google trong ứng dụng đưa về `/index.html#auth` (mã PKCE nằm ở query `?code=`). Allow list `https://hanzistudiohsk.vercel.app/**` do `auth:configure` thêm bao trùm đường dẫn này. [Redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

Nghiệm thu: đăng ký/xác nhận email, đăng nhập Google, quên mật khẩu, refresh phiên, hai tài khoản, hai thiết bị, đọc/ghi tiến độ đúng quyền, lớp học và phòng thi thật. Chưa có bước nào ở đây được xác nhận production chỉ vì Marketplace báo đã connect.
