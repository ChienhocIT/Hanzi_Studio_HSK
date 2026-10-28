# Hanzi Studio v4.2 — Nền tảng luyện tiếng Trung HSK

Website production: https://hanzistudiohsk3prov3.vercel.app/

Nền tảng gốc v4.1 dùng HTML, CSS, JavaScript và JSON. Mã nguồn phát triển v4.2 bổ sung Supabase cho tài khoản, đồng bộ tiến độ và lớp học; cần build bằng Node.js. Các thay đổi local không đồng nghĩa với việc đã cập nhật website production.

## Chức năng đã tích hợp
- Flashcard 500 từ HSK 3, phát âm trình duyệt, ôn tập và theo dõi tiến độ cục bộ.
- Ngữ pháp, đọc hiểu, luyện nghe, ghép cặp, xếp câu, thi thử và sổ tay câu sai.
- Học từ video YouTube, luyện đọc theo và điền từ trong hội thoại (các chức năng phụ thuộc API/trình duyệt).
- Lộ trình cấp độ HSK 1–9, xếp trình độ, hội thoại theo chủ đề, luyện viết chữ Hán.
- Nhập học liệu có ghi nguồn, sao lưu/khôi phục dữ liệu học dưới dạng JSON.
- PWA, hỗ trợ điện thoại và máy tính.
- Tầng cloud tùy chọn: đăng nhập email/Google, ba quyền, đồng bộ bốn nhóm tiến độ, xử lý xung đột và phục hồi dữ liệu.
- Học liệu có nguồn/giấy phép, gửi duyệt độc lập và xuất bản; lớp học với mã tham gia, giao bài tự luận hoặc trắc nghiệm, hạn nộp, chấm điểm và báo cáo.
- Phòng luyện thi trực tiếp: mã phòng có hạn, giáo viên bắt đầu/kết thúc, lưu lựa chọn, giờ thi server và bảng xếp hạng sau khi kết thúc. Trạng thái cập nhật mỗi 3 giây.
- Bộ tham khảo riêng gồm 4.997 mục HSK 2.0 từ Wiktionary/CC-CEDICT, tra cứu và luyện thẻ với nghĩa tiếng Anh; nguồn và phép biến đổi theo CC BY-SA 4.0. Chưa được duyệt sư phạm, không phải bộ HSK 3.0. Xem [nguồn học liệu](docs/HSK-SOURCES-RESEARCH.md).

## Chạy tại máy
Yêu cầu Node.js 22 trở lên. Chạy `npm ci`, sau đó `npm run dev` và mở http://127.0.0.1:8000/. Server phục vụ thư mục `dist/`; chạy lại sau khi sửa mã. Nếu cổng bận, đặt `$env:PORT='18941'` trước lệnh chạy. Không mở trực tiếp bằng `file://`.

`npm test` chạy kiểm thử tiến độ; `npm run test:db` chạy kiểm tra PostgreSQL trong Docker riêng; `npm run test:e2e` chạy Playwright với API giả. Không cần khóa dịch vụ thật cho các kiểm thử này.

## Triển khai Vercel
Dự án sử dụng framework Other (tĩnh), build `npm run vercel-build`, output `dist/`. Repository hiện tại là `ChienhocIT/Hanzi_Studio_HSK`. Production tự áp dụng migration PostgreSQL qua kết nối server của Supabase Marketplace trước khi build; thiếu cấu hình hoặc migration lỗi sẽ dừng phát hành. Preview/local không tự thay đổi database. Xem [hướng dẫn kết nối Supabase và nghiệm thu](docs/DEPLOYMENT.md). Local không có cấu hình cloud vẫn học ở chế độ khách.

## Giới hạn hiện tại
Mã nguồn có luồng cloud nhưng chưa được nghiệm thu trên project Supabase/Vercel production trong đợt triển khai này. Tài liệu học các cấp ngoài HSK 3 vẫn ở mức mẫu; chưa phải ngân hàng HSK 1–9 chính thức đầy đủ. Phân tích phát âm vẫn dựa vào nhận diện tiếng nói, chưa chấm ngữ âm/thanh điệu chuyên sâu. Phòng trực tiếp hiện dùng lại câu hỏi bài tập để luyện cùng lớp, chưa phải đề thi bí mật/chuẩn hóa. Chưa có AI gia sư hoặc thanh toán. Xem [phạm vi triển khai và phần còn lại](docs/IMPLEMENTATION.md).

Không nhập mã khóa API, cookie đăng nhập hay dữ liệu cá nhân vào repository công khai.

## Nguồn học liệu
Dữ liệu 500 từ HSK 3 được chuyển từ tài liệu học do chủ dự án cung cấp. Nội dung mở rộng cần được kiểm duyệt và xác minh giấy phép trước khi xuất bản rộng rãi.

## Brand kit v4.2
Thêm bộ nhận diện Mây Long gồm logo SVG, biểu tượng PWA, 6 pose linh vật WebP/PNG, hero illustration, brand.css. Xem `BRAND_PREVIEW.html` và `BRAND_GUIDELINES.md`. Không thay đổi nghiệp vụ học tập hoặc localStorage.
