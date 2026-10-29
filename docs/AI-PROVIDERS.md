# Nhà cung cấp AI miễn phí cho Hanzi Studio

Cập nhật 2026-10-29. Số liệu Gemini đo trực tiếp bằng key của dự án. Số liệu nhà cung cấp khác lấy từ trang chính thức của họ (link trong bảng). Bậc miễn phí thay đổi thường xuyên, nên kiểm tra lại trước khi bật thêm nhà cung cấp.

## Đang dùng: Google Gemini API (gói miễn phí)

| Chức năng trong app | Model | Kết quả đo |
| --- | --- | --- |
| Hỏi đáp, chấm câu | `gemini-3.1-flash-lite`, dự phòng `gemini-3.6-flash` | Lite: 1–10 s. 3.6: khoảng 9 s (có suy nghĩ). Chữ đầu tiên của stream dao động từ 0,8 s đến 26 s khi máy chủ miễn phí đông. |
| Không dùng làm mặc định | `gemini-3.8-flash` | Quá 150 s, coi như treo |
| Không dùng | `gemini-2.5-flash-lite` | Lỗi 404, không còn cho người dùng mới |
| Phụ đề từ link YouTube | `gemini-3.6-flash`, dự phòng `gemini-3.1-flash-lite` | Lỗi 503 "high demand" sau 80–97 s lúc thử. Tối đa 8 giờ video/ngày; chỉ video công khai ([tài liệu](https://ai.google.dev/gemini-api/docs/video-understanding)) |
| Luyện nói: Hội thoại | `gemini-3.8-live` | Trả âm thanh và chữ sau khoảng 6 s; trên trình duyệt có hỏi ngược và sửa lỗi |
| Luyện nói: Giọng tự nhiên | `gemini-2.5-flash-native-audio-latest` (Native Audio Dialog) | Chạy được với key này. Model gửi kèm văn bản suy nghĩ nội bộ; app chỉ hiển thị phần chép lời. |
| Luyện nói: Phiên dịch Việt ⇄ Trung | `gemini-3.5-live-translate-preview` | "我想去北京学习" → "Tôi muốn đến Bắc Kinh" sau khoảng 5 s ([tài liệu](https://ai.google.dev/gemini-api/docs/live-api/live-translate)) |
| Luyện nói: Chép lời | `gemini-3.5-transcribe-live` | Chép chính xác câu mẫu; có bản tạm trong lúc nói ([tài liệu](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)) |

Cách nối Live an toàn: máy chủ tạo **ephemeral token** dùng 1 lần, có hiệu lực 10 phút, với cấu hình khóa sẵn trong `bidiGenerateContentSetup`. Trình duyệt mở `…BidiGenerateContentConstrained?access_token=…`. Tài liệu ghi tên trường `liveConnectConstraints`, nhưng REST chỉ nhận `bidiGenerateContentSetup` ([ephemeral tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens), [Live API](https://ai.google.dev/api/live)).

Lưu ý gói miễn phí:
- Nội dung gửi lên được Google dùng để cải thiện sản phẩm ([bảng giá](https://ai.google.dev/gemini-api/docs/pricing)). App ghi rõ điều này trong màn trợ giảng và `privacy.html`.
- Giờ cao điểm hay gặp lỗi 503. Máy chủ chờ tối đa 25 s mỗi model (120 s với video) rồi chuyển sang model kế tiếp.

## Có thể bổ sung (chưa tích hợp; cần tạo tài khoản và key riêng)

| Nhà cung cấp | Bậc miễn phí (trang chính thức) | Dùng được cho | Hạn chế |
| --- | --- | --- | --- |
| [Groq](https://console.groq.com/docs/rate-limits) | `whisper-large-v3(-turbo)`: 20 req/phút, 2.000 req/ngày, 7.200 giây âm thanh/giờ, 28.800 giây/ngày. Chat `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`: 30 req/phút, 1.000 req/ngày. | Chép lời file ghi âm của học viên (Whisper hỗ trợ tiếng Trung). Chat dự phòng khi Gemini 503. | Bảng ghi là giới hạn "Developer plan"; số liệu gói free xem ở trang limits của tài khoản. TTS Orpheus chỉ có tiếng Anh và Ả Rập. |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 10.000 neuron/ngày. Whisper khoảng 41 neuron/phút âm thanh (khoảng 240 phút/ngày). MeloTTS khoảng 18,6 neuron/phút. | Chép lời, giọng đọc máy có tiếng Trung | Cần tài khoản Cloudflare và API token; giới hạn chung cho mọi model |
| [OpenRouter](https://openrouter.ai/docs/api/reference/limits) | Model `:free`: 20 req/phút; 50 req/ngày (tăng lên 1.000 req/ngày khi đã từng mua từ 10 credit) | Chat dự phòng | Danh sách model free thay đổi thường xuyên; nhà cung cấp bên dưới có thể lưu dữ liệu |
| [Azure AI Speech F0](https://azure.microsoft.com/en-us/pricing/details/speech/) | 5 giờ STT/tháng, 0,5 triệu ký tự TTS neural/tháng, 5 giờ dịch/tháng | Giọng đọc tiếng Trung chất lượng cao. Chấm phát âm zh-CN chuyên dụng. | Chấm phát âm (pronunciation assessment) không nằm trong bảng F0, là add-on trả phí |
| Web Speech của trình duyệt (đang dùng) | Miễn phí | Nút "Nghe" và shadowing trong Video Lab | Chất lượng giọng tùy thiết bị; Chrome gửi âm thanh nhận dạng lên Google |

## Khuyến nghị
1. Giữ Gemini làm nhà cung cấp chính: một key dùng được cho chat, chấm câu, video và luyện nói.
2. Nếu học viên hay gặp lỗi "máy chủ AI quá tải", thêm Groq hoặc OpenRouter làm dự phòng cho chat. Mã đã có sẵn cơ chế thử lần lượt nhiều model.
3. Chấm phát âm chuẩn hóa nên dùng Azure Speech (trả phí theo giờ) hoặc so khớp bản chép lời từ `gemini-3.5-transcribe-live` với câu mẫu (miễn phí, độ chính xác thấp hơn).
4. Không tải âm thanh YouTube về máy chủ để gửi sang nhà cung cấp khác: vi phạm điều khoản YouTube. Phụ đề video chỉ dùng tính năng đọc link YouTube của Gemini.
