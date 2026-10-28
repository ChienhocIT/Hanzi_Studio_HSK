# Hanzi Studio — Bộ asset linh vật Mây Long (CHỈ BÀN GIAO THIẾT KẾ)

Không có thay đổi nào được thực hiện trên GitHub hoặc Vercel trong lần tạo bộ asset này. Chỉ sử dụng bộ ảnh này khi bạn duyệt và muốn đưa vào ứng dụng.

## Có gì trong bộ này
- **01_hq_transparent/**: 6 PNG 512×512 thật sự nền trong suốt + WebP 420×420, phù hợp banner, onboarding, trang chủ.
- **02_expressions/**: 12 biểu cảm PNG nền trong suốt 384×384 + WebP 256×256, nên hiển thị **64–160 px**.
- **03_learning/**: 9 hoạt động học (đọc, nghe, viết, nói, online, ôn tập, tốt nghiệp, mục tiêu, thành tích).
- **04_outfits/**: 11 trang phục/chủ đề (cổ trang, Tết, giáo viên, du lịch, công nghệ...).
- **05_hero_banners/**: 8 background có nhân vật; gồm 4 chủ đề ở tỷ lệ desktop và mobile, có khoảng trống để website đặt chữ HTML chứ không đóng chữ vào ảnh.
- **06_brand/**: logo SVG và app icons cùng concept đã chọn.
- **07_original_boards/**: ảnh board gốc chất lượng cao để designer tham khảo/tạo thêm.
- **ASSET_MANIFEST.json**: metadata đường dẫn, vai trò, kích thước khuyên dùng.
- **PREVIEW_CONTACT_SHEET.png** và **ASSET_GALLERY.html**: bảng xem nhanh và thư viện lọc ảnh.

## Sử dụng trong website
- Trang chủ: `05_hero_banners/home_desktop_1600x600.webp` (mobile: `home_mobile_750x900.webp`).
- Flashcard / đọc: `01_hq_transparent/study.webp`.
- Luyện nghe / nói: `01_hq_transparent/listening.webp`, `speaking.webp`.
- Đáp án đúng: `01_hq_transparent/success.webp`; câu khó: `thinking.webp`.
- Streak / thưởng / mini badges: từ `02_expressions/` và `03_learning/`.
- Hình nhỏ nên để `width: 72px; height: 72px; object-fit: contain`.
- Kết hợp bố cục với màu chính `#6B5CE7`, xanh ngọc `#29AA95`, màu phụ `#A78BFA`, `#FFC453`.

### Ví dụ
```html
<img src="assets/mascot/hello.webp" alt="Mây Long chào người học" width="120" height="120" loading="lazy">
```
Đổi đường dẫn theo cấu trúc thư mục khi chép asset vào website. Không dùng logo dạng ảnh nhỏ cho văn bản yêu cầu sắc nét; ưu tiên SVG.

### Minh bạch chất lượng
Một số sticker mini được tách từ bảng minh họa tổng hợp bằng kỹ thuật tách nền; độ chi tiết nguồn nhỏ hơn 6 bản render HQ. Những bản mini chủ yếu dùng ở cỡ sticker, không kéo giãn thành poster. Nên kiểm tra silhouette trên nền tối trước khi đưa lên sản phẩm.

## Quy tắc xuất bản
Giữ thống nhất sừng vàng, lọn mây tím, mắt đen to, bụng mint, đuôi mây. Có thể thay màu nền và text trong UI nhưng không bóp méo linh vật. Các asset sinh bằng AI nên kiểm tra quyền thương hiệu và tính tương đồng thị trường trước khi đăng ký nhãn hiệu.
