# Nghiên cứu tính năng Wayground & học liệu HSK 3 — 23/10/2026

## 1. Nguồn được đối chiếu

1. Wayground — tổng quan mô hình đa tài nguyên học tập: https://help.wayground.com/support/solutions/articles/158000403991-what-is-wayground-
2. Wayground — mô tả hơn 18 loại câu hỏi: https://help.wayground.com/support/solutions/articles/158000411419-question-types-explained
3. Wayground — kiểu thi và học Mastery Peak: https://help.wayground.com/support/solutions/articles/158000404918-live-session-modes-on-wayground
4. Wayground — báo cáo theo người học và theo câu hỏi: https://help.wayground.com/support/solutions/articles/158000404058-reports-on-wayground
5. ChineseTest — HSK cấp 3, cấu trúc Nghe/Đọc/Viết: https://www.chinesetest.cn/HSK/3
6. ChineseTest — các chủ điểm ngữ pháp cấp 3 (越…越, kết quả, xu hướng và khả năng): https://admin.chinesetest.cn/newhsk/standardsAction.do?content=&detail=&grammarproject=&leves=&means=getSummaryList&pager.offset=170&type=
7. Từ vựng của người học: `Từ vựng HSK 3 (3.0).pdf` 25 trang, 500 mục được trích xuất.

## 2. Ma trận tính năng sau nâng cấp

| Năng lực | Wayground tham chiếu | Hanzi Studio v2 | Ghi chú |
|---|---|---|---|
| Assessment / quiz | Đa dạng loại câu | ✓ Trắc nghiệm, điền từ, xếp câu, nghe hiểu, đọc hiểu | Có chấm tự động các loại đã hỗ trợ |
| Flashcards | Pre-read, Practice | ✓ Lật thẻ, đánh giá, ôn lặp lại | 500 từ gốc |
| Passages | Bài đọc với câu hỏi | ✓ 18 bài, 54 câu | Biên soạn mới |
| Audio questions | Nghe và phản hồi | ✓ 24 hội thoại TTS | Không ghi âm lời nói của học viên |
| Match / Reorder | Ghép / sắp xếp | ✓ Ghép đôi, 30 câu xếp | Hỗ trợ chạm trên di động |
| Gamification | Mastery Peak, points | ✓ Điểm XP, game thời gian, câu sai ôn lại | Một người chơi, không có đội hoặc power-up |
| Timed test | Test Mode | ✓ 20/40/80 câu và đếm ngược | Không phải cấu trúc đề chính thức |
| Reports | Theo người, nhóm, câu | ✓ Điểm cá nhân và lịch sử bài làm | Chưa có tổng hợp theo lớp |
| Resource authoring | Soạn đề / nhập tài liệu | ✓ Tự viết câu hỏi, JSON import/export | Chưa AI sinh bài từ PDF/video |
| Live session / multiplayer | Phòng thi trực tuyến | ✗ | Cần xác thực, backend, websockets |
| Cloud sync | Tài khoản / nhiều thiết bị | ✗ | Tạm chuyển thủ công bằng JSON |
| Interactive video / hotspot / draw | Có | ✗ | Có thể phát triển sau |

## 3. Kiến trúc tiếp theo nếu muốn ngang Wayground

**P1 — Học cá nhân đã triển khai**: SPA/PWA, ngân hàng học liệu tại trình duyệt, flashcards/SRS, đọc/nghe/ngữ pháp/xếp câu, chấm điểm, quiz editor, thống kê, backup JSON.

**P2 — Đồng bộ đám mây, đăng nhập**: Supabase hoặc Firebase Auth cho Google login, Postgres/Firestore cho reviews/attempts/progress, Row-level security. Cần thông tin dự án và quyền deploy; không thể tự giả lập bằng localStorage.

**P3 — Tác giả và quản trị học liệu**: phiên bản bộ câu hỏi, tags chủ đề/độ khó, import DOCX/PDF/CSV, duyệt câu bằng người, phân tích lỗi Pinyin, phát âm ghi sẵn thay vì phụ thuộc TTS.

**P4 — Năng lực lớp học kiểu Wayground**: lớp/nhóm, mã phòng, live multiplayer bằng websocket, assignment, deadline, leaderboard, gian lận/anti-cheat, báo cáo theo học viên, mẫu báo cáo xuất CSV.

**P5 — AI và multimedia nâng cao**: passage generation có kiểm tra nguồn, tự sinh đề có human-review, chấm viết Hán tự theo rubric, phỏng vấn hội thoại, câu hỏi liên kết video, hotspot trên hình ảnh.

## 4. Lưu ý chuẩn HSK

Trên trang ChineseTest/HSK/3 thời điểm nghiên cứu có bảng HSK cấp 3 với 80 câu, khoảng 85 phút làm bài (90 phút gồm thủ tục), chia 40 nghe – 30 đọc – 10 viết và tổng điểm 300. Trang hiện có nhãn HSK 3.0 ở điều hướng, nhưng thông tin này không tự chứng minh rằng **mọi thay đổi của đề HSK 3.0 mới** đã phản ánh trong bảng. Do đó, bài thi của ứng dụng được ghi rõ là **mô phỏng**, không phải đề chuẩn hay nguồn chính thức.

Các bài đọc, câu hỏi, hội thoại, ngữ pháp mở rộng đều được biên soạn cho dự án; không sao chép đề, trích đoạn hoặc bảng câu hỏi có bản quyền từ Wayground hay ChineseTest.

## Khả năng mới v3 — Interactive YouTube video

- YouTube IFrame API cho phép phát, tạm dừng, seek, tốc độ (nếu được player chấp nhận). Giao diện Video Lab có timeline phụ đề nhập thủ công, lặp đoạn và tự chuyển câu khi video phát.
- Không dùng `captions.download` trái quyền: tài liệu chính thức YouTube nói chỉ tài khoản được phép chỉnh sửa video mới tải phụ đề qua Data API. Video Lab vì vậy hỗ trợ phụ đề SRT/VTT/TXT hoặc transcript do người dùng được phép cung cấp.
- Browser SpeechRecognition trả về transcript chứ không trả điểm phát âm; điểm đang triển khai chỉ là khoảng cách văn bản, phải hiển thị rõ giới hạn thanh điệu. Muốn chấm phát âm chuẩn thanh điệu cần dịch vụ ASR/phoneme-level scoring và consent audio qua backend.
- Chưa có giáo viên, bài tập giao lớp, phiên thi live đa học sinh, leaderboard multiplayer, transcript tự lấy qua OAuth/video owner, cloud sync; không nhận là bản sao đầy đủ Wayground.
