# Kết quả kiểm chứng local

Ngày: 2026-10-29. Phạm vi: gói phát hành vào `main`; không phải nghiệm thu production.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run check` | 21 kiểm thử dữ liệu/cấu hình đạt; build `dist/` thành công |
| `npm run test:db` | 34 nhóm nghiệp vụ và 5 kiểm tra runner/guard đạt trên PostgreSQL 16 riêng, áp dụng đủ 5 migration |
| Playwright | 21 luồng giao diện với API/session giả hoặc dữ liệu tham khảo local; không gọi Supabase thật |
| Hồi quy giao diện | Điều hướng đủ 22 màn cũ, không có JavaScript exception trong bài kiểm tra |
| Mobile và theme | Kiểm tra rộng 390 px, không tràn ngang; xem ảnh sáng/tối và kiểm tra tương phản nút được đo |
| `git diff --check` | Đạt |

## Luồng trình duyệt

Học flashcard khi không cấu hình cloud; 22 route; đăng nhập giữ tiến độ khách; chủ động bật đồng bộ và nhận xung đột; tác giả tạo/gửi duyệt; học viên tham gia lớp và nộp bài tự luận; quản trị viên xuất bản và mở phân quyền; XSS/hiển thị mobile sáng tối; giáo viên tạo trắc nghiệm; học viên nộp trắc nghiệm và xem điểm server trả về; xuất tệp phục hồi đúng định dạng; giáo viên tạo lớp/giao bài/chấm điểm/xem báo cáo.

Phòng thi: hai context tạo/vào/bắt đầu/lưu/nộp/kết thúc/xem bảng điểm, nối lại sau tải trang, giữ lựa chọn khi cập nhật trạng thái, mobile sáng/tối, phục hồi kết nối và chống XSS ở tên phòng/tên học viên. Database kiểm tra riêng quyền host, mã hết hạn, lưu lựa chọn, từ chối nộp lại, giấu điểm trước khi kết thúc và chấm bản lưu/câu bỏ trống khi hết giờ. Bộ May Long trên `main` được giữ lại; browser kiểm tra logo, hero và linh vật tải đúng trong gói build.

Các bài kiểm thử trình duyệt dùng dữ liệu giả. Tính quyền truy cập, điểm trắc nghiệm, hạn nộp, CAS và khả năng từ chối dữ liệu giả mạo được kiểm tra riêng trên PostgreSQL thật với schema Auth giả lập. Chưa có kiểm thử browser qua Data API Supabase thật.

Bộ tham khảo: kiểm tra đủ 4.997 ID duy nhất, nhãn unreviewed, nguồn revision theo cấp, giữ đa nghĩa, 12 mục thiếu nghĩa; trình duyệt kiểm tra tải/tìm kiếm/luyện thẻ/lưu ôn/tải lại, lỗi tải có retry và dung lượng đầy không báo lưu thành công. Đây là kiểm tra kỹ thuật và provenance; không phải phê duyệt sư phạm 4.997 từ.

## Rà soát mã

Đã dùng `ocr delegate preview --format json` và `ocr delegate rule --format json` để lấy danh sách/rule, rồi rà soát bởi agent, không gọi endpoint LLM của OCR. Checklist và rule nằm trong `.review/` (bị Git ignore).

Phạm vi OCR tích lũy: 59 file reviewable. Mã nguồn, cấu hình, migration, test, metadata nguồn, gallery asset và mẫu email được rà soát. Riêng `data/hsk2-reference.json` được kiểm tra toàn bộ bằng assertions về cấu trúc/nguồn, nhưng chưa đọc duyệt ngữ nghĩa từng mục; được ghi skipped riêng trong checklist nội dung với lý do này. Không khẳng định coverage 100% cho nội dung học liệu. Chi tiết checklist và hash ở `.review/report.json`. OCR loại các tệp Markdown, `.env.example` và lockfile; tài liệu/cấu hình public được kiểm tra riêng. `CLAUDE.md` được giữ nguyên.

Summary: `total_files=59`, `reviewed_files=58`, `skipped_files=1`, `coverage_rate=98.31%`.

Runner cài mới đã kiểm tra tính nguyên tử, không chạy lại migration cũ, từ chối checksum bị sửa và rollback cả schema/ledger khi một migration thất bại. Unit test từ chối URL database khác project và không cho `sslmode` trong URL vô hiệu hóa xác thực TLS. Build Vercel không dùng runner này; Supabase integration quản lý migration của project thật. Import danh mục nháp không ghi đè mục đã duyệt hoặc đổi hash nguồn dưới cùng ID.

Đã sửa rủi ro đồng bộ khi JWT đổi tài khoản giữa yêu cầu, tránh tăng revision khi không có thay đổi, và không cache callback/Auth/API qua service worker. Không còn phát hiện High/Critical chưa xử lý trong phạm vi rà soát này. Giới hạn dung lượng, danh sách và nghiệp vụ còn thiếu được ghi trong [IMPLEMENTATION.md](IMPLEMENTATION.md).

Rà soát phòng thi đã sửa việc escape tên phòng ở danh sách, tránh phản hồi chậm của phòng trước thay nội dung phòng đang mở, giữ đúng room ID khi nộp trong lúc đổi phòng và hủy timer/listener khi rời tab. Có kiểm thử XSS hồi quy cho tên phòng và người tham gia.

## Production đã xác minh

Commit mã nguồn `8b7ac94` đã push vào `main`; [CI GitHub](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/40764179379) và [Vercel project đích](https://vercel.com/minh-chienhoc-it/hanzi_studio_hsk/E5BFNRHGCtrasWXYf7nrvdQLp1Kr) đều thành công. Trên `https://hanzistudiohsk.vercel.app`, `cloud-config.js`, `cloud.bundle.js` và `data/hsk2-reference.json` trả HTTP 200; SHA-256 của bundle và bộ 4.997 mục khớp build local.

Chrome headless trên domain thật: màn tài khoản có nút đăng nhập, Google tắt được hiển thị đúng; bộ tham khảo tải đủ 4.997 mục và tìm `爸爸` trả nghĩa. Không có JavaScript exception hay yêu cầu ghi cloud trong phép thử. Ảnh kiểm tra nằm trong `.review/` bị Git ignore. Đây chưa phải nghiệm thu tài khoản hay lớp học với người dùng thật.

Supabase MCP xác nhận đủ năm migration trong history, gồm `reference_vocabulary`. Đã kiểm tra bốn migration nền tạo 11 bảng public có RLS và ba bảng chính từ chối khách. Security advisor ghi cảnh báo RPC `SECURITY DEFINER` cho authenticated và INFO về bảng không có policy; đây là quyền gọi RPC có kiểm tra vai trò và bảng khóa truy cập trực tiếp theo thiết kế. Xem [hướng dẫn advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Không tự mở policy để xóa cảnh báo.

## Đợt bổ sung 2026-10-29: giao diện v5, vòng đời tài khoản, bảo mật

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | 21/21 đạt |
| `npm run test:db` | Áp dụng đủ 6 migration; 17 + 5 + 8 + 4 + 5 nhóm nghiệp vụ đạt, gồm xóa học viên/giáo viên, giáo viên bị hạ quyền, đọc phòng đã kết thúc không chờ khóa dòng |
| Playwright | 25/25 đạt: thêm landing lần đầu, đăng ký gửi tên hiển thị, giáo viên vào lớp sau đăng nhập, nhập lại bản sao lưu giáo trình, chặn chèn mã qua video ID |
| Ảnh kiểm tra | Landing desktop/mobile/tối, trang đăng nhập desktop/mobile, lớp học, tổng quan; không tràn ngang ở 390 px |

Rà soát OCR do Codex thực hiện (chỉ đọc): 61/61 file reviewable, phát hiện 3 High, 2 Medium, 1 Low. Đã sửa cả 3 High: giáo viên bị hạ quyền vẫn còn quyền dạy, chèn mã qua `videoId` của Video Lab, bộ đếm câu sai chưa được escape. Đã sửa 2 Medium: nhập lại bản sao lưu giáo trình, giữ nguồn theo từng hàng. Đã sửa Low: `CLAUDE.md`. Sơ đồ dữ liệu và trạng thái production nằm ở [DATABASE.md](DATABASE.md).

## Chưa xác nhận

Google OAuth, gửi thư SMTP/xác nhận email thực, refresh/khôi phục tài khoản thực, đồng bộ nhiều thiết bị thực, lớp học và phòng thi với tài khoản thật, micro/video trên các trình duyệt thực, accessibility toàn ứng dụng, tải lớn và backup/phục hồi database production.

GET bằng publishable key trên project thật `rpoqcklcmsnrbmhfxdxg.supabase.co` cho thấy email bật, Google tắt. Không tạo tài khoản/gửi thư/ghi dữ liệu trong kiểm tra này. Cấu hình public Production đã đóng gói; mẫu email chưa được đưa lên Auth dashboard. Xem [các bước kết nối còn lại](CLOUD-SETUP-ACTIONS.md).
