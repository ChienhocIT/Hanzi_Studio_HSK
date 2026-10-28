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

Phạm vi OCR tích lũy: 50 file reviewable. Mã nguồn, cấu hình, migration, test, metadata nguồn, gallery asset và mẫu email được rà soát. Riêng `data/hsk2-reference.json` được kiểm tra toàn bộ bằng assertions về cấu trúc/nguồn, nhưng chưa đọc duyệt ngữ nghĩa từng mục; được ghi skipped riêng trong checklist nội dung với lý do này. Không khẳng định coverage 100% cho nội dung học liệu. Chi tiết checklist và hash ở `.review/report.json`. OCR loại các tệp Markdown, `.env.example` và lockfile; tài liệu/cấu hình public được kiểm tra riêng. `CLAUDE.md` được giữ nguyên.

Summary: `total_files=50`, `reviewed_files=49`, `skipped_files=1`, `coverage_rate=98%`.

Runner Production đã kiểm tra cài mới nguyên tử, không chạy lại migration cũ, từ chối checksum bị sửa và rollback cả schema/ledger khi một migration thất bại. Unit test từ chối URL database khác project và không cho `sslmode` trong URL vô hiệu hóa xác thực TLS. Chưa chạy DDL trên project cloud thật ở thời điểm ghi nhận này.

Đã sửa rủi ro đồng bộ khi JWT đổi tài khoản giữa yêu cầu, tránh tăng revision khi không có thay đổi, và không cache callback/Auth/API qua service worker. Không còn phát hiện High/Critical chưa xử lý trong phạm vi rà soát này. Giới hạn dung lượng, danh sách và nghiệp vụ còn thiếu được ghi trong [IMPLEMENTATION.md](IMPLEMENTATION.md).

Rà soát phòng thi đã sửa việc escape tên phòng ở danh sách, tránh phản hồi chậm của phòng trước thay nội dung phòng đang mở, giữ đúng room ID khi nộp trong lúc đổi phòng và hủy timer/listener khi rời tab. Có kiểm thử XSS hồi quy cho tên phòng và người tham gia.

## Chưa xác nhận

Google OAuth/email/SMTP, migration trên project thật, refresh/khôi phục tài khoản thực, đồng bộ nhiều thiết bị thực, micro/video trên các trình duyệt thực, accessibility toàn ứng dụng, tải lớn và backup/phục hồi database production. Workflow CI nằm trong repo; kết quả chạy GitHub và Vercel phải kiểm tra theo commit phát hành.

Đã thực hiện GET bằng publishable key trên project thật `rpoqcklcmsnrbmhfxdxg.supabase.co`: email bật, Google tắt và các bảng chính thiếu migration. Không tạo tài khoản/gửi thư/ghi dữ liệu. Tệp `.env.local` chứa cấu hình public bị Git ignore; build nhận các cặp biến Marketplace. Các mẫu email và bootstrap SQL mới chỉ được chuẩn bị local. Xem [các bước kết nối còn lại](CLOUD-SETUP-ACTIONS.md).
