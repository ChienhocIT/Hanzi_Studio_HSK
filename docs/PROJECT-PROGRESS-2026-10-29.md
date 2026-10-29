# Tiến độ Hanzi Studio và kết quả rà soát

Đối chiếu ngày 2026-10-29. Mã nền rà soát: `68b2289`; working tree ban đầu sạch. Phân biệt dữ liệu production, mã được kiểm thử và nghiệm thu người dùng thật.

## Trạng thái đã xác nhận

| Hạng mục | Bằng chứng và giới hạn |
| --- | --- |
| GitHub → Vercel | CI và deployment của `68b2289` thành công; website: https://hanzistudiohsk.vercel.app |
| Supabase | 8 migration; `profiles`, `assignment_questions`, `live_rooms` từ chối truy cập khách |
| Đăng nhập | Public Auth settings báo Google/email bật. Chưa lặp lại đăng nhập Google, xác nhận email hoặc gửi SMTP trong đợt kiểm tra này; trạng thái OAuth public cần chủ sở hữu xác nhận |
| Danh mục CLEC 2025 | Database có 11.000 mục `published`: 300/200/500/1.000/1.600/1.800/5.600 theo cấp 1/2/3/4/5/6/7–9. Trạng thái xuất bản không thay thế đánh giá sư phạm |
| Nghĩa tiếng Anh | Đã bổ sung đúng 15 mục còn trống; SQL kiểm tra lại được 10.998/11.000 mục có nghĩa, không đổi chữ, pinyin, cấp hoặc trạng thái duyệt |
| Học liệu cũ | Giữ riêng flashcard 500 từ HSK 3 tiếng Việt và bộ tham khảo 4.997 mục HSK 2.0; không cộng chúng thành số từ duy nhất |
| Lớp học/phòng thi | Có luồng và kiểm thử phân quyền, giao/nộp/chấm bài, phòng luyện trực tiếp; chưa nghiệm thu toàn bộ với người dùng thật trong đợt này |
| Trợ giảng AI | Có handler xác thực, quota và UI hỏi/chấm câu; kiểm thử dùng phản hồi giả, không gọi Gemini bằng khóa thật hoặc đo chất lượng câu trả lời |

## Bổ sung trong đợt này

- **Luyện trắc nghiệm** tại màn Từ vựng HSK 1–9: tối đa 10 câu, bốn lựa chọn nghĩa Anh, chỉ dùng mục đã xuất bản có đủ nghĩa khác nhau. Có đáp án, điểm, danh sách từ sai và luyện lại từ sai. Đây là luyện từ điển, không phải đề HSK chuẩn hóa; nghĩa gần nhau vẫn cần giáo viên đánh giá.
- Kết quả lưu tối đa 30 phiên trong nhóm curriculum hiện có, đi cùng sao lưu/đồng bộ tài khoản. Không tự tăng mức nhớ hoặc dời lịch SRS. Bộ nhớ đầy báo chưa lưu và cho thử lưu lại.
- Bộ nhập nghĩa phân biệt nghĩa thường `surname and given name` với mục tên họ và đi theo dẫn chiếu `variant of`, `see`, `abbr. for` có giới hạn độ sâu/chống chu kỳ. Giữ attribution/CC BY-SA 4.0 và hash nguồn.
- Hai mục **精彩纷呈**, **口哨儿** vẫn để trống vì snapshot không có entry. Bổ sung 15 nghĩa không tăng số đầu từ HSK và chưa tạo bản dịch tiếng Việt.

## Code review

OCR chọn file và rule; agent trực tiếp đọc diff/code. Phạm vi gồm commit nền và phần mở rộng: `total_files=28`, `reviewed_files=28`, `skipped_files=0`, `coverage_rate=100%` trên các file reviewable; không phải kiểm duyệt ngữ nghĩa toàn bộ 11.000 mục. Checklist/hash ở `.review/` bị Git ignore. Markdown/ảnh và `.env.example` được xét riêng, không đưa secret vào báo cáo.

| Mức | File/vị trí | Phát hiện và xử lý |
| --- | --- | --- |
| High | `src/syllabus.js`, `fetchLevel/load` | Phản hồi admin đến chậm có thể điền bản nháp vào cache/UI học viên sau đổi tài khoản. Đã tái hiện ở bản nền; thêm session/request generation, giữ client của yêu cầu và bỏ phản hồi cũ |
| High | `src/tutor.js`, `ask/grade/setSession` | Kết quả chấm câu của tài khoản cũ có thể hiện sang tài khoản mới. Đã tái hiện; hủy request, bỏ stream/grade/quota cũ và reset trạng thái bận khi đổi tài khoản |
| Medium | `scripts/cedict-glosses.mjs` | Bộ lọc làm mất nghĩa thường và bỏ dẫn chiếu hợp lệ; đã sửa bằng resolver có kiểm thử |
| Medium | `scripts/seed-glosses.mjs` | Cùng source ID nhưng hash khác vẫn được dùng để nhập nghĩa. Đã từ chối trước khi cập nhật dữ liệu |
| Medium | `server/tutor.mjs`, kiểm tra output chấm câu | Có score/errors nhưng thiếu pinyin/câu sửa vẫn có thể được chấp nhận. Đã kiểm tra kiểu, nội dung bắt buộc, kích thước và từng trường lỗi |

Các lỗi trên đã có regression test. Thay đổi audio, chặng học và model/timeout Gemini xuất hiện đồng thời trong workspace chính được giữ nguyên tại máy, tách khỏi bản sửa này. Bản phát hành được kiểm tra riêng trong worktree `Hanzi_Studio_HSK-learning-expansion`; không khẳng định benchmark hoặc xác minh model bằng lời gọi thật.

## Kiểm chứng và việc tiếp theo

Worktree phát hành đạt **38 unit test, 47 kiểm tra PostgreSQL trong container riêng, 37 luồng Playwright và build Production**. Có kiểm tra lưu điểm, luyện lại từ sai, lỗi dung lượng và phản hồi khác tài khoản. API AI trong kiểm thử dùng fake. Kiểm tra production và CI của commit phát hành được báo riêng sau khi push.

Nghiên cứu nguồn và tiêu chí chi tiết nằm ở [LEARNING-EXPANSION-RESEARCH.md](LEARNING-EXPANSION-RESEARCH.md). Ưu tiên tiếp theo: duyệt/dịch nghĩa Việt và hai mục thiếu; luyện nét Hanzi Writer với thông báo giấy phép riêng cho mã/dữ liệu; thử nhập câu/audio có quyền từ Tatoeba qua trạng thái nháp. Ngân hàng nghe/đọc/ngữ pháp đa cấp, thi chuẩn hóa, phát âm chuyên sâu và nghiệm thu thương mại vẫn còn công việc.
