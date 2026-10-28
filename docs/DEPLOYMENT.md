# Kết nối tài khoản và lớp học

## Kiến trúc

Website vẫn dùng HTML/CSS/JavaScript trên Vercel. Bundle mới gọi Supabase Auth và PostgreSQL Data API. Mọi bảng đều bật RLS. Trình duyệt chỉ được đọc dữ liệu được phép; ghi thông qua RPC kiểm tra tài khoản, quyền và trạng thái. Tiến độ cá nhân không được chia sẻ cho giáo viên hay quản trị viên.

Các mẫu tích hợp dựa trên tài liệu chính thức: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [Google OAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth), [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Thiết lập môi trường thử nghiệm

1. Kết nối đúng project Supabase vào Vercel. Runner `npm run db:migrate` áp dụng các tệp trong `supabase/migrations/` theo thứ tự, lưu checksum vào ledger riêng và chạy toàn bộ phần còn thiếu trong một transaction. Không chạy bootstrap thủ công nếu sẽ dùng runner; database có sẵn bảng Hanzi nhưng thiếu ledger cần đối chiếu và baseline trước.
2. Bật email/password, email confirmation và Google provider trong Supabase Auth. Cấu hình SMTP, hạn mức và CAPTCHA phù hợp trước khi nhận người dùng công khai. Các cơ chế chống lạm dụng Auth do nhà cung cấp thực hiện; frontend không thay thế được chúng.
3. Cấu hình Site URL theo domain sử dụng và allowlist callback `https://<domain>/index.html` (bao gồm URL preview được phép). Google redirect URI phải là callback do Supabase cung cấp. Xác nhận email và đặt lại mật khẩu dùng PKCE, cần mở cùng trình duyệt đã gửi yêu cầu.
4. Thêm hai biến **public** vào môi trường build Vercel: `HANZI_SUPABASE_URL`, `HANZI_SUPABASE_PUBLISHABLE_KEY`; hoặc dùng cặp public `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` mà Marketplace tạo. Cho local, điền `.env.local` bị Git ignore hoặc đặt biến môi trường PowerShell trước `npm run dev`. Lệnh build/check cloud đọc `.env.local`, không đọc `.env`. Không dùng `service_role`, `sb_secret_*`, hay mật khẩu database.
5. Đăng ký tài khoản quản trị đầu tiên, xác nhận email, rồi cấp quyền bằng SQL Editor với UUID đã xác minh:

   ```sql
   update public.profiles set role = 'admin' where id = '<verified-auth-user-uuid>';
   ```

6. Cấp quyền giáo viên trong Cài đặt → Phân quyền. Tài khoản mới luôn là học viên, bất kể metadata đăng ký.
7. Build local bằng `npm ci` và `npm run build`. Vercel dùng `npm run vercel-build`; chỉ môi trường Production tự chạy migration trước khi xuất bản `dist/`. Migration, test, `node_modules` và `.env` không được xuất bản.

Không có cấu hình cloud thì local/preview chạy chế độ khách. Production yêu cầu cấu hình cloud để tránh phát hành nhầm bản không có tài khoản.

## Phát hành vào project Vercel hiện tại

Project đích: [minh-chienhoc-it / hanzi_studio_hsk](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/deployments), Git repository `ChienhocIT/Hanzi_Studio_HSK`, production branch `main`. Giữ framework **Other**, output **dist**, Node.js **22** trở lên; không ghi đè Build Command trong dashboard khác với `vercel.json`.

Trong Environment Variables của **Production**, kiểm tra cặp public ở bước 4 và kết nối server `POSTGRES_URL_NON_POOLING` hoặc `POSTGRES_URL` do Marketplace cung cấp. Ưu tiên session pooler cổng 5432 khi kết nối trực tiếp không hỗ trợ IPv4. `DATABASE_URL` cũng được chấp nhận. Không thêm tiền tố `NEXT_PUBLIC_`/`VITE_` cho URL database; không đưa giá trị này vào Git. Runner kiểm tra host và username trùng project public, khóa chạy đồng thời, xác thực TLS, từ chối migration đã bị sửa và rollback nếu lỗi. Nếu chứng chỉ cần CA riêng, thêm PEM từ dashboard Supabase vào biến server `HANZI_DB_CA_CERT`; không tắt kiểm tra TLS.

Push `main` kích hoạt Git deployment nếu integration đã liên kết đúng repository. Build Production sẽ chạy đủ bốn migration lần đầu, lần sau bỏ qua bản đã ghi ledger. Thiếu kết nối database, sai project hoặc lỗi migration làm build thất bại; bản production cũ vẫn được Vercel giữ. Đọc Build Logs, hoàn tất cấu hình rồi Redeploy đúng commit. Build thành công không tự bật Google, cấu hình SMTP hoặc cấp quyền admin.

Trạng thái project đã kiểm tra và các bước đang chờ quyền quản trị được ghi cụ thể tại [CLOUD-SETUP-ACTIONS.md](CLOUD-SETUP-ACTIONS.md).

## Kiểm tra cloud trước khi triển khai

Sau khi đặt hai biến public, chạy `npm run check:cloud`. Lệnh chỉ gửi GET để đọc Auth settings và kiểm tra truy cập ẩn danh vào `profiles`, `assignment_questions`, `live_rooms` bị từ chối. Lệnh báo Google/email đã bật hay chưa, cùng bảng thiếu migration hoặc quyền chưa đúng. Không có tài khoản/email/dữ liệu nào được tạo. Kết quả này không xác nhận SMTP gửi thư, Google callback, dữ liệu người dùng hay mọi policy đều đúng.

Vercel CLI cần đăng nhập bằng `vercel login` trên máy và xác minh đúng team/project trước khi liên kết hoặc deploy. Không dán token quản trị vào mã nguồn. Bốn migration hiện được áp dụng theo thứ tự tên; migration phòng thi là `202610290003_live_rooms.sql`.

Tài liệu gốc về cấu hình: [Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [public Auth settings](https://supabase.github.io/auth/).

## Kiểm thử nghiệp vụ trước khi mở sử dụng

- Email đăng ký/xác nhận, đăng nhập, Google OAuth, refresh token, đăng xuất và email đặt lại mật khẩu trên domain thực.
- Hai tài khoản trên cùng trình duyệt phải giữ tiến độ riêng. Khi đăng nhập, tiến độ khách được cất riêng; chọn **Nhập tiến độ khách** để chuyển, rồi chọn **Dùng bản thiết bị** để đồng bộ.
- Thiết bị thứ hai chọn **Lấy bản trên cloud**. Sửa cùng lúc trên hai thiết bị phải báo xung đột; thao tác chọn bản cloud/thiết bị giữ bản bị thay thế trong localStorage.
- Giáo viên tạo học liệu có nguồn HTTPS, quyền sử dụng và phiên bản đề cương → gửi duyệt → quản trị viên khác xuất bản. Bản bị từ chối phải có lý do, tác giả sửa rồi gửi lại. Học liệu xuất bản không sửa trực tiếp; tạo bản mới nếu cần hiệu chỉnh.
- Giáo viên tạo lớp, chia sẻ mã, học viên tham gia; đóng nhận học viên phải chặn mã mới. Giao bài từ học liệu đã xuất bản với hạn nộp tương lai. Học viên đọc, nộp/sửa trước hạn, giáo viên chấm 0-100 kèm nhận xét và xem báo cáo. Server chặn bài trễ, sửa bài đã chấm và người ngoài lớp.
- Giáo viên chọn **Giao bài trắc nghiệm**, soạn 1-50 câu, mỗi câu có 2-6 lựa chọn và đáp án đúng. Học viên mở bài, trả lời đủ và nộp đúng một lần. Server giữ đáp án trong schema private và tính điểm 0-100. Kiểm tra báo cáo có điểm; gọi lại endpoint không được làm lại hay tự sửa điểm. Đây là bài tập do giáo viên soạn, chưa phải đề thi HSK chuẩn hóa.
- Thử mất mạng, dung lượng localStorage đầy, khôi phục JSON, thiết bị di động và cả giao diện sáng/tối. Dữ liệu cloud không được cache bởi service worker.
- Trong tab **Phòng thi**, giáo viên chọn lớp/bài trắc nghiệm và thời gian 1-120 phút rồi tạo phòng. Học viên đã thuộc lớp nhập mã 8 ký tự trước khi giáo viên bắt đầu. Kiểm tra hai trình duyệt, lưu lựa chọn, tải lại trang, nộp một lần, giấu điểm khi đang thi, hết giờ/giáo viên kết thúc và bảng xếp hạng. Kết quả phiên trực tiếp tách khỏi bài tập. Mã chờ hết hạn sau 24 giờ; tối đa 100 học viên/phòng và 10 phòng đang mở/lớp. Các con số này là ràng buộc sản phẩm, chưa phải mức tải đã được benchmark.

## Đồng bộ và sao lưu

Đồng bộ snapshot của bốn nhóm dữ liệu cũ, bao gồm SRS, lịch sử quiz, lộ trình và video. Revision được tăng nguyên tử trên server. Không tự gộp lịch ôn vì phép gộp có thể làm sai ngày ôn và lịch sử.

Mỗi lần đổi tài khoản giữ một snapshot trong `hanzi-cloud-archive:<user-id>`; khách dùng hậu tố `guest`. Khi chọn ghi đè cloud, bản cloud trước đó nằm ở `hanzi-cloud-remote-backup:<user-id>`. Đây là bản phục hồi cục bộ mới nhất, không phải hệ thống backup nhiều phiên bản. Mở **Phục hồi dữ liệu trước khi thay thế**, xuất bản thiết bị/cloud trước, rồi dùng **Khôi phục tất cả** để nhập tệp nếu cần. Các tệp này không chứa token đăng nhập. Dùng các nút xuất JSON để lưu bản riêng ngoài trình duyệt. Dữ liệu mỗi tài khoản chỉ tải cloud sau khi người dùng chọn bản khởi đầu. Phiên đăng xuất trả về dữ liệu khách.

Thiết lập backup database và diễn tập phục hồi bằng công cụ của Supabase theo gói được chọn. Cấu hình production, SMTP/OAuth, giám sát lỗi và phục hồi database chưa được thực hiện bởi mã nguồn này.
