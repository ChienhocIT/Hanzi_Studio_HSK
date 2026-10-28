# Hanzi Studio v4.1 — Nền tảng luyện tiếng Trung HSK

Website production: https://hanzistudiohsk3prov3.vercel.app/

Phiên bản v4.1 được đồng bộ từ bản phát hành trên Vercel về repository này. Đây là ứng dụng frontend tĩnh HTML, CSS, JavaScript và JSON, không yêu cầu quá trình build.

## Chức năng đã tích hợp
- Flashcard 500 từ HSK 3, phát âm trình duyệt, ôn tập và theo dõi tiến độ cục bộ.
- Ngữ pháp, đọc hiểu, luyện nghe, ghép cặp, xếp câu, thi thử và sổ tay câu sai.
- Học từ video YouTube, luyện đọc theo và điền từ trong hội thoại (các chức năng phụ thuộc API/trình duyệt).
- Lộ trình cấp độ HSK 1–9, xếp trình độ, hội thoại theo chủ đề, luyện viết chữ Hán.
- Nhập học liệu có ghi nguồn, sao lưu/khôi phục dữ liệu học dưới dạng JSON.
- PWA, hỗ trợ điện thoại và máy tính.

## Chạy tại máy
Trong thư mục gốc, dùng web server tĩnh, ví dụ: `python3 -m http.server 8000`, sau đó mở http://localhost:8000/. Không chạy trực tiếp với file:// nếu cần nạp tệp JSON hoặc dùng service worker.

## Triển khai Vercel
Dự án sử dụng framework Other (tĩnh). Các file `index.html`, JS, CSS, JSON, manifest và icon nằm tại gốc repository. `vercel.json` cấu hình các HTTP header bảo mật. Có thể liên kết repo `ChienhocIT/Hanzi_Studio_HSK3_Pro_v3` với project Vercel hiện tại để tự deploy khi cập nhật `main`.

## Giới hạn hiện tại
Đây **chưa phải** nền tảng backend đa tài khoản hoàn chỉnh. Dữ liệu học chủ yếu lưu trong trình duyệt và có sao lưu JSON thủ công; chưa có đồng bộ tài khoản đám mây. Tài liệu học các cấp ngoài HSK 3 mới ở mức mẫu, chưa phải ngân hàng HSK 1–9 chính thức đầy đủ. Phân tích phát âm phụ thuộc hỗ trợ nhận diện tiếng nói của trình duyệt và chưa tương đương chấm điểm phát âm chuyên sâu.

Không nhập mã khóa API, cookie đăng nhập hay dữ liệu cá nhân vào repository công khai.

## Nguồn học liệu
Dữ liệu 500 từ HSK 3 được chuyển từ tài liệu học do chủ dự án cung cấp. Nội dung mở rộng cần được kiểm duyệt và xác minh giấy phép trước khi xuất bản rộng rãi.
