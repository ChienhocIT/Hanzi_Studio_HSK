# Kết nối tài khoản và lớp học

## Kiến trúc

Website vẫn dùng HTML/CSS/JavaScript trên Vercel. Bundle mới gọi Supabase Auth và PostgreSQL Data API. Mọi bảng đều bật RLS. Trình duyệt chỉ được đọc dữ liệu được phép; ghi thông qua RPC kiểm tra tài khoản, quyền và trạng thái. Tiến độ cá nhân không được chia sẻ cho giáo viên hay quản trị viên.

Các mẫu tích hợp dựa trên tài liệu chính thức: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [Google OAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth), [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Thiết lập môi trường thử nghiệm

1. Kết nối đúng project Supabase và repository. Supabase integration quản lý các tệp trong `supabase/migrations/` theo thứ tự; kiểm tra migration history và schema trên đúng project trước khi phát hành. Có thể áp dụng migration còn thiếu qua Supabase MCP/CLI. Không chạy lại migration nền trên database đã cài đặt.
2. Bật email/password, email confirmation và Google provider trong Supabase Auth. Cấu hình SMTP, hạn mức và CAPTCHA phù hợp trước khi nhận người dùng công khai. Các cơ chế chống lạm dụng Auth do nhà cung cấp thực hiện; frontend không thay thế được chúng.
3. Cấu hình Site URL theo domain sử dụng và allowlist callback `https://<domain>/index.html` (bao gồm URL preview được phép). Google redirect URI phải là callback do Supabase cung cấp. Xác nhận email và đặt lại mật khẩu dùng PKCE, cần mở cùng trình duyệt đã gửi yêu cầu.
4. Thêm hai biến **public** vào môi trường build Vercel: `HANZI_SUPABASE_URL`, `HANZI_SUPABASE_PUBLISHABLE_KEY`; hoặc dùng cặp public `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*` mà Marketplace tạo. Cho local, điền `.env.local` bị Git ignore hoặc đặt biến môi trường PowerShell trước `npm run dev`. Lệnh build/check cloud đọc `.env.local`, không đọc `.env`. Không dùng `service_role`, `sb_secret_*`, hay mật khẩu database.
5. Đăng ký tài khoản quản trị đầu tiên, xác nhận email, rồi cấp quyền bằng SQL Editor với UUID đã xác minh:

   ```sql
   update public.profiles set role = 'admin' where id = '<verified-auth-user-uuid>';
   ```

6. Cấp quyền giáo viên trong Cài đặt → Phân quyền. Tài khoản mới luôn là học viên, bất kể metadata đăng ký.
7. Build local bằng `npm ci` và `npm run build`. Vercel dùng `npm run vercel-build`; Production kiểm tra định dạng cấu hình public rồi build tĩnh, không gọi dịch vụ ngoài. Kiểm tra Auth/schema riêng bằng `npm run check:cloud`. Migration, test, `node_modules` và `.env` không được xuất bản.

Không có cấu hình cloud thì local/preview chạy chế độ khách. Production yêu cầu cấu hình cloud để tránh phát hành nhầm bản không có tài khoản.

## Phát hành vào project Vercel hiện tại

Project đích: [minh-chienhoc-it / hanzi_studio_hsk](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/deployments), Git repository `ChienhocIT/Hanzi_Studio_HSK`, production branch `main`. Giữ framework **Other**, output **dist**, Node.js **22** trở lên; không ghi đè Build Command trong dashboard khác với `vercel.json`.

Production dùng cặp public từ Environment Variables ở bước 4 nếu đã đặt đủ; nếu chưa có, dùng `config/public-cloud.json` đã được chủ dự án cung cấp cho project này. Đây là URL/publishable key được phép xuất hiện trong browser, không phải secret. Cấu hình nửa cặp hoặc secret key vẫn bị từ chối. Preview/local không tự dùng fallback Production. Build tĩnh không cần URL/mật khẩu database. Website chủ dự án chỉ định là `https://hanzistudiohsk.vercel.app`; đặt Supabase Site URL theo website và thêm redirect chính xác `https://hanzistudiohsk.vercel.app/index.html`.

Push `main` kích hoạt Git deployment nếu integration đã liên kết đúng repository. Build từ chối cấu hình nửa cặp hoặc secret key. Lệnh `check:cloud` báo email/Google bị tắt, bảng thiếu migration hoặc mở truy cập ẩn danh; chạy riêng khi nghiệm thu dịch vụ. UI hiển thị rõ Google chưa bật. Build thành công không tự bật Google, cấu hình SMTP hoặc cấp quyền admin.

`npm run db:migrate` là công cụ riêng cho cài đặt mới dùng ledger Hanzi, không chạy trong build Vercel. Nó nhận `POSTGRES_URL_NON_POOLING`/`POSTGRES_URL`/`DATABASE_URL`, kiểm tra project, TLS và checksum, chạy transaction có khóa. Không dùng trên cài đặt do Supabase migration history quản lý nếu chưa đối chiếu/baseline ledger. Secret chỉ nằm trong môi trường server; nếu cần CA riêng, đặt PEM vào `HANZI_DB_CA_CERT`, không tắt xác thực TLS.

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

## Flashcard, báo câu và pilot học liệu

Trước khi phát hành bundle Flashcard mới, áp dụng `202610300002_vocab_reports.sql` và `202610300003_example_audio.sql` theo lịch sử migration hiện tại. Production đang dùng `supabase_migrations.schema_migrations`: áp dụng qua Supabase MCP/CLI hoặc Management API, giữ version/name và SQL trong lịch sử, kiểm tra lại schema sau transaction. Không chạy `db:migrate` của ledger Hanzi trên cài đặt này. Hai migration thêm bảng/RPC/RLS; không sửa lịch ôn hay xuất bản câu/audio. Với cấu hình operator nằm trong `.env.local` bị ignore, kiểm tra/nhập pilot sau migration:

```powershell
npm run db:seed-examples -- --pilot --dry-run
npm run db:seed-examples -- --pilot
npm run db:seed-example-audio -- --dry-run
```

Trong worktree không có `.env.local`, dùng `node --env-file=<đường-dẫn-env-operator> scripts/seed-examples.mjs --pilot`. Không sao chép secret vào Git hoặc dist. Seeder nhập 50 câu pilot ở nháp, giữ bản đã tồn tại/đã duyệt. Admin mở Thư viện → hàng đợi câu ví dụ để duyệt từng cặp; lọc nghĩa còn thiếu để biên tập riêng. Snapshot audio hiện có 0 bản đạt giấy phép, nên dry-run không nhập audio. Xem [audit và giới hạn nghiệm thu](FLASHCARD-UX-AUDIT.md).

## Đồng bộ và sao lưu

Đồng bộ snapshot của bốn nhóm dữ liệu cũ, bao gồm SRS, lịch sử quiz, lộ trình và video. Revision được tăng nguyên tử trên server. Không tự gộp lịch ôn vì phép gộp có thể làm sai ngày ôn và lịch sử.

Mỗi lần đổi tài khoản giữ một snapshot trong `hanzi-cloud-archive:<user-id>`; khách dùng hậu tố `guest`. Khi chọn ghi đè cloud, bản cloud trước đó nằm ở `hanzi-cloud-remote-backup:<user-id>`. Đây là bản phục hồi cục bộ mới nhất, không phải hệ thống backup nhiều phiên bản. Mở **Phục hồi dữ liệu trước khi thay thế**, xuất bản thiết bị/cloud trước, rồi dùng **Khôi phục tất cả** để nhập tệp nếu cần. Các tệp này không chứa token đăng nhập. Dùng các nút xuất JSON để lưu bản riêng ngoài trình duyệt. Dữ liệu mỗi tài khoản chỉ tải cloud sau khi người dùng chọn bản khởi đầu. Phiên đăng xuất trả về dữ liệu khách.

Thiết lập backup database và diễn tập phục hồi bằng công cụ của Supabase theo gói được chọn. Cấu hình production, SMTP/OAuth, giám sát lỗi và phục hồi database chưa được thực hiện bởi mã nguồn này.
