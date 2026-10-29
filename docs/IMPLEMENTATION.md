# Trạng thái triển khai nghiệp vụ

Đây là phạm vi mã nguồn của bản phát hành, không phải xác nhận nghiệm thu production. Trạng thái deploy và cấu hình project thực phải kiểm tra riêng sau khi push.

| Nhóm | Đã triển khai trong mã nguồn | Còn lại |
| --- | --- | --- |
| A: tài khoản và dữ liệu | Email/password, Google OAuth, đặt lại mật khẩu, tên hiển thị, ba quyền, RLS, snapshot bốn nhóm tiến độ, CAS chống ghi đè, di chuyển dữ liệu khách, test tự động | Tạo/kết nối project, SMTP/OAuth thật, migration production và nghiệm thu nhiều thiết bị |
| B: học liệu | Quy trình nháp/duyệt/xuất bản; thêm bộ tham khảo riêng 4.997 mục HSK 2.0, nguồn revision/hash và CC BY-SA 4.0, tra cứu/phân trang/luyện thẻ, lưu ôn cùng tiến độ hiện tại | Ngân hàng HSK 1-9 theo đề cương mới, dịch/duyệt tiếng Việt, xử lý 12 mục chưa khớp nghĩa, audio được cấp quyền, nhập hàng loạt CMS |
| C: nghe/nói/thi | Giữ các màn luyện hiện tại và đồng bộ dữ liệu tương ứng | Audio chuẩn, đánh giá âm tiết/thanh điệu, nét chữ, đề thi theo phiên bản đề cương, phân tích lỗi và gợi ý ôn |
| D: lớp học | Tạo lớp/mã tham gia, đóng/mở nhận học viên, giao bài từ học liệu duyệt, tự luận/trắc nghiệm, báo cáo; phòng luyện thi có mã chờ 24 giờ, bắt đầu/kết thúc, giờ server, lưu lựa chọn, chấm khi hết giờ và bảng xếp hạng | Báo cáo kỹ năng, đề bí mật độc lập với bài tập, kiểm thử tải và nghiệm thu cloud thật |
| E: vận hành | Lockfile, build chỉ xuất public assets, CI, regression tests, service worker tránh cache auth/API | Quan sát lỗi production, backup DB theo lịch/diễn tập, kiểm thử tải, kiểm định accessibility/SEO toàn app, AI gia sư và thanh toán |

## Giao diện v5 (2026-10-29)

- Trang giới thiệu `#welcome`: hiển thị ở lần truy cập đầu tiên.
- Trang tài khoản `#auth`: đăng nhập, đăng ký có tên hiển thị, quên và đặt lại mật khẩu.
- Trang lớp học `#classroom`: nội dung hiển thị theo vai trò. Sau khi đăng nhập, học viên về trang tổng quan, giáo viên và quản trị viên vào lớp học.
- Logo chính Mây Long, icon chuyên mục 3D, font Be Vietnam Pro tự host, chế độ sáng/tối.
- Danh mục HSK 3.0 trong `vocab_entries` có màn tra cứu, luyện thẻ và xuất bản theo cấp (`src/syllabus.js`). Chưa có nghĩa tiếng Việt; nghĩa tiếng Anh lấy từ bộ tham khảo CC-CEDICT khi trùng chữ.

## Ranh giới dữ liệu

Không tự chuyển dữ liệu mẫu thành học liệu được kiểm duyệt. Không tạo hàng nghìn câu HSK giả để đủ số lượng. Quy trình biên tập yêu cầu tác giả cung cấp nguồn, giấy phép, phiên bản đề cương và người duyệt có chuyên môn. Các số lượng trong báo cáo người dùng chưa được tái kiểm kê cho mục tiêu phát hành này.

Bộ tham khảo mới gồm 4.997 mục HSK 2.0 cộng đồng, nghĩa tiếng Anh/phiên âm dạng số, không thay đổi 500 từ hiện có hoặc tự trộn vào lộ trình 3.0. Xem [nguồn và phép biến đổi](HSK-SOURCES-RESEARCH.md). Thẻ tham khảo có ghi nhớ/hẹn ôn, lưu trong nhóm curriculum hiện có; chưa có bộ câu hỏi được giáo viên duyệt hoặc bản dịch tiếng Việt cho bộ này.

Điểm khớp lời nói cũ vẫn chỉ dựa vào văn bản nhận dạng. Không có lời gọi model hoặc dịch vụ phát âm trả phí trong kiểm thử. YouTube tiếp tục dùng trình nhúng và transcript người dùng cung cấp.

## Giới hạn vận hành của phần mới

Workspace hiện hiển thị tối đa 200 học liệu gần nhất, 100 lớp, 100 bài mỗi lớp, 1.000 bài nộp và 200 tài khoản. Có thông báo giới hạn trên UI. Luồng giao bài gồm tự luận và trắc nghiệm 1-50 câu, mỗi câu 2-6 lựa chọn. Phòng thi trực tiếp sử dụng lại bộ câu hỏi bài tập: phù hợp luyện tập cùng lớp; chưa phải kỳ thi HSK chuẩn hóa với đề bí mật. Bài tập lưu snapshot học liệu tại thời điểm giao để nội dung không đổi giữa kỳ.

Phòng thi cập nhật trạng thái bằng polling mỗi 3 giây khi đang mở tab phòng, có giới hạn 100 học viên/phòng và 10 phòng đang mở/lớp. Điểm và thứ tự xếp hạng chỉ công bố khi kết thúc. Lựa chọn được lưu riêng trên server; khi hết giờ, lần đọc kết quả tiếp theo chấm bản lưu cuối, câu bỏ trống tính sai. Nếu không có kết nối, lựa chọn chưa được báo đã lưu không được đảm bảo phục hồi. Kết quả phòng không thay đổi điểm bài tập về nhà.

Muốn vận hành thương mại cần hoàn thành những mục còn lại, không chỉ bật kết nối cloud. Hướng dẫn triển khai và nghiệm thu ở [DEPLOYMENT.md](DEPLOYMENT.md).
