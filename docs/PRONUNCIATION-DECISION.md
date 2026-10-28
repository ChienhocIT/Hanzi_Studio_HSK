# Chọn dịch vụ chấm phát âm

Trạng thái: chờ chủ dự án chọn nhà cung cấp, tài khoản dịch vụ và ngân sách. Chưa tích hợp hoặc gọi API trả phí.

## Kết quả đối chiếu ngày 2026-10-29

Azure Speech có pronunciation assessment cho Mandarin `zh-CN`; xem [danh sách ngôn ngữ](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment). Tài liệu nêu hỗ trợ tên âm vị SAPI cho `zh-CN`, nhưng syllable grouping và prosody assessment được mô tả là chỉ có ở `en-US`. Vì vậy không thể quảng bá tích hợp Azure như một bộ chấm thanh điệu tiếng Trung riêng biệt chỉ dựa trên các chỉ số đó. [Nguồn Microsoft](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment#supported-features-per-locale), [giới hạn prosody](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment#configuration-methods).

Đây là một lựa chọn để đánh giá ngữ âm, chưa phải quyết định nhà cung cấp cuối cùng. Nếu bắt buộc chỉ ra lỗi từng thanh điệu, cần dịch vụ công bố hỗ trợ rõ ràng và bộ âm thanh chuẩn do giáo viên kiểm định để nghiệm thu. Không suy ra độ chính xác thanh điệu từ điểm nhận dạng văn bản.

## Thông tin cần chủ dự án cung cấp

- Nhà cung cấp mong muốn hoặc quyền thử nghiệm một dịch vụ cụ thể.
- Ngân sách, số học viên dự kiến và hạn mức chấm/người/ngày.
- Mức chấm cần thiết: câu/từ/âm vị hay bắt buộc từng thanh điệu.
- Quy định đồng ý ghi âm, lưu/xóa bản ghi và khu vực xử lý dữ liệu.

Khóa nhà cung cấp phải nằm trong secret backend. Sau khi chốt dịch vụ, luồng cần triển khai là xác thực → kiểm tra hạn mức → nhận audio → gọi dịch vụ → chuẩn hóa kết quả → phản hồi theo phạm vi thực sự được đo. Kiểm thử ban đầu dùng audio giả/response giả; cuộc gọi tính phí chỉ thực hiện khi được chủ dự án cho phép.
