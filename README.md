# Hanzi Studio HSK 3 — Learning Platform v2.0

Ứng dụng web học tiếng Trung HSK 3, tự học trên máy tính và điện thoại. **Không phải Wayground hoặc phần mềm do ChineseTest cấp phép**, không chứa đề thi HSK thật.

## Bắt đầu

- Mở `index.html` bằng trình duyệt Chrome, Edge hoặc Safari để sử dụng toàn bộ website.
- Hoặc dùng file độc lập `Hanzi_Studio_HSK3_Pro_Mo_ngay.html` bên ngoài ZIP nếu muốn mở nhanh mà không cần giải nén.
- Để có URL công khai: truy cập https://app.netlify.com/drop và thả **file ZIP của dự án** vào khu vực Upload. Netlify Drop hỗ trợ ZIP hoặc thư mục và sẽ cấp URL website. Nên giữ dự án trong tài khoản Netlify của bạn để cập nhật phiên bản sau này.
- Khi xuất bản qua HTTPS, ứng dụng hỗ trợ lưu tạm các tài nguyên cốt lõi để mở lại ngoại tuyến (service worker). Âm thanh tiếng Trung cần giọng TTS trên thiết bị.

## Chức năng

| Chức năng | Nội dung |
|---|---|
| Tổng quan | Mục tiêu, nhóm từ, hoạt động học |
| Flashcard + ôn lặp lại | 500 từ gốc; lật thẻ, nghe TTS, đánh giá nhớ/khó |
| Thư viện từ vựng | Tìm chữ Hán, Pinyin, nghĩa, lọc nhóm, lưu từ |
| Trắc nghiệm từ vựng | 10 câu ngẫu nhiên mỗi phiên |
| Ngữ pháp | 35 bài học và 35 câu điền từ, chấm/giải thích |
| Đọc hiểu | 18 đoạn văn với 54 câu hỏi đọc hiểu |
| Nghe hiểu | 24 hội thoại nguyên bản, phát âm TTS và câu hỏi |
| Ghép cặp | Game chọn 6 cặp Hán–Việt, chấm số lỗi và tốc độ |
| Xếp câu/Viết | 30 câu xếp thứ tự; tự gõ lại 500 chữ Hán từ nghĩa |
| Thi thử | Tự biên soạn các bộ 20/40/80 câu, đếm ngược, điểm từng kỹ năng |
| Sổ tay câu sai | Ghi nhận câu sai và khởi tạo lượt ôn |
| Tạo bộ câu hỏi | Tạo 4 lựa chọn/1 đáp án, nhập/xuất JSON, làm bài riêng |
| Tiến độ | Điểm kinh nghiệm, kết quả bài làm, lịch sử thi, xuất/nhập dữ liệu |
| Giao diện | Desktop/mobile responsive, light/dark, PWA manifest |

## Ngân hàng học liệu

- **500 mục từ**, phân loại nghĩa/Pinyin và ví dụ: chuyển từ PDF `Từ vựng HSK 3 (3.0).pdf` người dùng đã cung cấp (25 trang). Các mục được giữ nguyên cách diễn đạt theo nguồn, chưa coi là được thẩm định bởi CTI.
- **35 chủ điểm ngữ pháp**, **35 câu hỏi điền từ**, **18 bài đọc = 54 câu hiểu bài**, **24 đoạn hội thoại nghe = 24 câu hỏi**, **30 bài xếp câu** — được dự án biên soạn nguyên bản để luyện tập, dựa trên đặc điểm của các tài liệu tham khảo từ ChineseTest và mô hình question types Wayground; không phải câu hỏi gốc từ Wayground hay đề HSK chính thức.
- **Ngân hàng sinh động:** Trắc nghiệm từ 500 từ có thể sinh ra nhiều câu hỏi Hán→Việt, nghe→Việt, Việt→Hán và viết. Số câu sinh động không tương đương với số câu biên soạn độc lập.

## Lưu trữ / đồng bộ giữa thiết bị

- Trên một thiết bị, điểm/tiến độ/chủ đề đã học được lưu trong `localStorage` của trình duyệt; sử dụng cùng website ở thiết bị khác **không tự đồng bộ**.
- Vào **Cài đặt & dữ liệu → Xuất tiến độ**, chuyển file JSON qua Drive hoặc thiết bị khác, mở website mới → **Nhập tiến độ**.
- Muốn tự đồng bộ, đăng nhập Google, lưu cloud và có lớp học nhiều người theo chuẩn Wayground cần bổ sung backend và cơ chế xác thực. Phiên bản này tập trung vào **cá nhân tự học**, không nhận là bản sao đầy đủ Wayground.

## Hạn chế nên biết

- Thư viện TTS phụ thuộc giọng tiếng Trung cài trong OS; giọng, độ rõ và cách ngắt câu khác nhau giữa các thiết bị.
- Thi thử 80 câu mượn cấu trúc tham khảo 40 nghe / 30 đọc / 10 viết xuất hiện trên trang HSK cấp 3 của ChineseTest khi nghiên cứu, nhưng câu hỏi, âm thanh, cách làm phần viết, điểm số và giới hạn thời gian là **mô phỏng luyện tập**, không đại diện chính xác cho toàn bộ kỳ thi HSK 3.0 mới.
- Học liệu tự biên soạn có thể có một số từ vựng và cấu trúc ngoài phạm vi 500 từ do người dùng cung cấp; nên đối chiếu đề cương kỳ thi cụ thể khi ôn thi thật.
- Chế độ lớp học thời gian thực, phòng giáo viên, bảng xếp hạng nhiều người, AI tạo đề từ tệp, nhận xét bài viết từ AI, interactive video/hotspot và đồng bộ cloud chưa được xây dựng.

## Cấu trúc dự án

- `index.html`: giao diện ứng dụng web
- `app.js`: flashcard, thư viện, trắc nghiệm, cài đặt
- `advanced.js`: các module luyện tập và bài thi nâng cao
- `content.js`: dữ liệu HSK 3 mở rộng (ngữ pháp, đọc, nghe, viết)
- `advanced.css`: giao diện các module nâng cao
- `words.json`, `grammar.json`, `passages.json`, `dialogues.json`, `reorders.json`: học liệu JSON để tiếp tục phát triển
- `manifest.webmanifest`, `sw.js`, icon: PWA và bộ nhớ cache
- `NGHIEN_CUU_VA_LO_TRINH.md`: nghiên cứu nguồn và định hướng nâng cấp tương lai

## Nguồn tham khảo

- Wayground: https://help.wayground.com/support/solutions/articles/158000411419-question-types-explained
- Wayground: https://help.wayground.com/support/solutions/articles/158000404918-live-session-modes-on-wayground
- Wayground: https://help.wayground.com/support/solutions/articles/158000404058-reports-on-wayground
- ChineseTest HSK 3: https://www.chinesetest.cn/HSK/3
- ChineseTest ngữ pháp cấp 3: https://admin.chinesetest.cn/newhsk/standardsAction.do?content=&detail=&grammarproject=&leves=&means=getSummaryList&pager.offset=170&type=

---

## Nâng cấp v3.0 — YouTube & Shadowing Studio

Mở trang **Học theo YouTube** ở sidebar (hoặc `#video` trên URL website).

**Đã triển khai, dùng được trong website:**

1. Dán hoặc kéo-thả URL của YouTube (watch, youtu.be, Shorts, livestream). Video chạy trong trình phát nhúng YouTube chính thức; chỉ video được chủ kênh cho phép nhúng mới phát được.
2. Thêm phụ đề `SRT`/`VTT` có timestamp hoặc dán transcript (kể cả dạng copy từ mục "Hiện bản chép lời" trên YouTube), hoặc gõ các câu Hán ngữ theo từng dòng.
3. Click từng câu phụ đề có mốc thời gian để tìm đúng đoạn trên video. Chỉnh tốc độ 0,75×–1,5× (phụ thuộc video/khả năng hỗ trợ), lặp câu, nghe giọng mẫu TTS.
4. Chế độ **Điền từ**: tự chọn từ HSK 3 có mặt trong câu (ưu tiên các mục từ dài hơn), tự tạo 1–3 chỗ trống; nhập câu trả lời, chấm đúng/sai, hiện đáp án.
5. Chế độ **Luyện nói (shadowing)**: bật micro nhận dạng tiếng Trung `zh-CN`, xem lời mà công cụ nhận dạng nghe được, chấm điểm *độ giống văn bản* so với câu mẫu. Có thể nhập văn bản thủ công khi trình duyệt không hỗ trợ nhận dạng.
6. **24 hội thoại HSK 3** từ chính ngân hàng học liệu v2 là mẫu luyện tập riêng (không gán cho video bất kỳ); lưu bài học video/đoạn hội thoại trên trình duyệt; xuất/nhập JSON gồm cả bài học và thống kê cơ bản.
7. Các phần flashcard 500 từ, ngữ pháp, đọc hiểu, nghe, xếp câu, trắc nghiệm, game, thi thử, thống kê được giữ nguyên.

**Giới hạn kỹ thuật không thể bỏ qua:**

- **Không tự lấy transcript chỉ từ link YouTube.** `IFrame Player API` để phát/điều khiển video; `captions.list` chỉ trả metadata, còn `captions.download` yêu cầu quyền chỉnh sửa video. Người học phải cung cấp văn bản phụ đề được phép sử dụng. Không tự download video/audio, không bypass YouTube.
- **Điểm nói KHÔNG phải điểm phát âm chuẩn**: tính từ khoảng cách Levenshtein giữa chữ Hán chuẩn và bản văn bản nhận dạng. Không xác định thanh điệu, khẩu hình, âm học hoặc chấm điểm HSK chính thức. Tùy thiết bị/bộ nhận dạng có thể sai dù người học nói đúng.
- **Micro cần HTTPS hoặc localhost**, cấp quyền micro. Nhận dạng `SpeechRecognition` chưa được hỗ trợ nhất quán ở mọi trình duyệt; một số trình duyệt gửi âm thanh lên máy chủ của hãng để nhận dạng. Hanzi Studio không lưu tệp âm thanh.
- **Không có đồng bộ dữ liệu cloud**; bài học Video Lab lưu ở localStorage riêng. Người dùng xuất/nhập JSON trong tab "Bài đã lưu" để chuyển dữ liệu giữa các thiết bị.
- Một số video giới hạn nhúng hoặc IFrame API có thể bị chặn bởi chính sách mạng/trình duyệt; ứng dụng có đường link mở trực tiếp trên YouTube để dự phòng.

### Nguồn kỹ thuật v3

- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- YouTube Captions download authorization: https://developers.google.com/youtube/v3/docs/captions/download
- YouTube Help — Xem bản chép lời: https://support.google.com/youtube/answer/15930243?hl=vi
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- MDN getUserMedia / secure context: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
