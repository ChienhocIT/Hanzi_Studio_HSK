# Hanzi Studio v4.1 — triển khai website đa cấp độ HSK

- Kế thừa **v4**: 500 từ HSK 3 từ PDF người dùng, 55 từ mẫu ngoài HSK 3, 21 hội thoại tự biên soạn, lộ trình HSK 1–6 và HSK 7–9, flashcard, ngữ pháp, nghe, đọc, game, thi thử, luyện viết, video YouTube.
- **v4.1**: Sao lưu/khôi phục đồng thời **cả 4 kho localStorage** (HSK 3 + lộ trình HSK 1–9 + video/điền từ + hội thoại), có kiểm định định dạng, giới hạn dung lượng và xác nhận trước khi ghi đè.
- Đóng gói **đa tệp**, đủ JavaScript/CSS/ảnh icon/PWA/manifest. Không triển khai HTML đơn lẻ khi thiếu tài nguyên đi kèm.
- Bản v4.1 **chưa có** cloud sync, tài khoản Google, đánh giá thanh điệu chuyên sâu, lớp học realtime, hay bộ 11.000 mục từ đã duyệt.

## Cách deploy
Đưa toàn bộ file trong thư mục này vào root Vercel (static, Framework Preset = Other); Vercel tự phục vụ index.html. Có thể dùng GitHub tích hợp Vercel để chạy CI/CD.

## Lưu ý quyền học liệu
Bộ từ 500 mục đến từ tài liệu PDF do người dùng cung cấp; trước khi mở công khai cho nhiều người cần kiểm tra quyền phân phối. Bộ 55 từ và 21 đoạn hội thoại chỉ là ví dụ, chưa qua kiểm duyệt học thuật. Chấm nói dựa trên văn bản nhận dạng; **không phải** kiểm tra độ chính xác thanh điệu.


## Brand kit v4.2
Thêm bộ nhận diện Mây Long gồm logo SVG, biểu tượng PWA, 6 pose linh vật WebP/PNG, hero illustration, brand.css. Xem `BRAND_PREVIEW.html` và `BRAND_GUIDELINES.md`. Không thay đổi nghiệp vụ học tập hoặc localStorage.
