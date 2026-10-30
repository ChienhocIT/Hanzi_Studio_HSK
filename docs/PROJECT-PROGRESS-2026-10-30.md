# Tiến độ luyện nét và câu ví dụ Trung–Việt

Ngày đối chiếu: **2026-10-30**. Nhánh `main`, nền `3e282c8`. Workspace đã có thay đổi về Hanzi Writer và Tatoeba khi bắt đầu; đợt này tiếp tục hoàn thiện chúng. Đây là kết quả local, chưa xác nhận phát hành production.

## Phạm vi hoàn thiện

- **Luyện nét:** mở từ màn luyện chữ, kết quả gõ chữ và thẻ HSK 1–9; chọn từng ký tự, xem thứ tự, luyện viết, đếm lỗi, bật/tắt gợi ý và viết lại. Dữ liệu từng chữ tải từ `hanzi-writer-data@2.0.1`, có cache trong phiên; chữ thiếu dữ liệu có thông báo, lỗi mạng/dữ liệu hỏng cho thử lại, yêu cầu tải giới hạn 15 giây. Đóng hộp hoặc đổi màn hủy quiz/animation và bỏ phản hồi đến muộn. Một instance Hanzi Writer được tái sử dụng để không tích lũy listener trên `document` mỗi lần viết lại.
- **Câu ví dụ:** migration `202610300001_example_sentences.sql` lưu câu gốc, bản dịch, ID/tác giả từng câu, nguồn/hash và trạng thái duyệt. Học viên đọc câu đã xuất bản; giáo viên xem nháp; chỉ quản trị viên được duyệt qua RPC, không được ghi trực tiếp bằng tài khoản người học.
- **Thẻ từ:** mở đáp án mới tải câu ví dụ; có nghe bằng cơ chế giọng đọc hiện có và attribution từng câu. Tải thất bại có nút thử lại; phản hồi của phiên cũ không điền vào tài khoản mới. Duyệt trong hàng đợi ôn dùng đúng từ đang hiển thị và chỉ báo thành công khi server cập nhật một bản ghi.
- **Bộ nhập:** `npm run db:seed-examples -- --dry-run` chọn câu bằng khớp từ dài nhất, bỏ câu chứa ký tự chỉ có ở phía phồn thể của CC-CEDICT, tối đa hai câu/từ. Bỏ ID không hợp lệ, sai ngôn ngữ và bản dịch rỗng; đây là bộ lọc kỹ thuật, chưa bảo đảm chất lượng dịch hay cấp độ câu. Nhập thật luôn tạo nháp, không ghi đè câu đã tồn tại; nguồn cùng ID nhưng hash khác bị từ chối.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Unit test | 54 test đạt |
| PostgreSQL dùng một container test riêng | 48 nhóm kiểm tra đạt, gồm 5 kiểm tra runner và 43 kịch bản nghiệp vụ; cài đủ 9 migration |
| Playwright toàn ứng dụng | 56/56 test đạt trên Chrome sau sửa vòng đời Hanzi Writer |
| Build | `npm run check` đạt: 54 unit test và build `dist/` với public config từ môi trường local; Playwright cũng build được gói guest |
| Dry-run Tatoeba trên cache local | 798 liên kết → 528 câu cho 391 từ; không ghi database |

Browser test dùng Supabase/API AI/dữ liệu nét giả. Các test bao gồm vẽ nét đúng/sai bằng chuột, lỗi tải/thử lại, dữ liệu nét hỏng, reduced motion, màn hình 375px và theme tối, đổi tài khoản khi đang tải, XSS, duyệt từ trong hàng đợi ôn và không tích lũy listener. Hình một nét trong fixture dùng chung cho nhiều chữ nhằm kiểm tra luồng, không minh họa thứ tự nét thật của các chữ đó. Chưa kiểm tra bút/cảm ứng trên thiết bị thật hoặc độ phủ dữ liệu nét cho toàn bộ danh mục.

## Nguồn và vận hành

Hanzi Writer dùng MIT; build phân phối đầy đủ license của dependency tại `dist/data/HANZI-WRITER-LICENSE.txt`. Dữ liệu chữ có giấy phép Arphic riêng, không gộp thành MIT. [Giấy phép tác giả](https://hanziwriter.org/license.html).

Văn bản Tatoeba mặc định theo CC BY 2.0 FR; giữ liên kết và tác giả riêng cho cả câu Mandarin và bản dịch Việt. Chưa nhập bản ghi audio; nút nghe dùng luồng đọc hiện có. [Điều kiện Tatoeba](https://tatoeba.org/en/terms_of_use).

Để nhập bằng công cụ CLI, cần sẵn `.sources/hsk3-2025-vocabulary.json` và `.sources/cedict.txt.gz` từ các bước nhập nguồn hiện có. Script tải ba export Tatoeba vào `.sources/tatoeba/` nếu chưa có. Chạy dry-run trước; chỉ chạy `npm run db:seed-examples` sau khi database đích đã có migration mới và đã xác định project đúng. Chỉ publish `dist/` lên Vercel; static build không chạy DDL hoặc seed dữ liệu.

Chưa áp dụng migration hoặc seed lên production trong đợt này; chưa push/deploy. Cần duyệt sư phạm trước khi xuất bản các câu: cache thực tế có câu về chủ đề nhạy cảm và bản dịch chưa phù hợp. 528 câu được chọn không đồng nghĩa 528 câu đã duyệt, cũng không tăng số đầu từ HSK. OAuth/SMTP, chất lượng AI, phát âm bằng provider thật và nghiệm thu lớp học vẫn là các bước xác minh riêng.
