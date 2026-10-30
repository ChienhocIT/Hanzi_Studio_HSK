# Flashcard: UX, học liệu và bảo trì

Đối chiếu ngày **2026-10-30**, nền `7db4c6b`. Người dùng chọn **chuyển nhanh giữa từng bộ riêng biệt**. Không trộn lịch SRS của bộ 500 từ nghĩa Việt với danh mục CLEC 2025.

## Thiết kế và luồng học

Giữ màu tím, font Be Vietnam Pro, nhận diện và cấu trúc điều hướng hiện có. Đây là màn học cần tập trung: một thẻ chính, một bước mở đáp án, hai mức đánh giá; công cụ tra cứu/quiz và giải thích nguồn nằm ở phần mở rộng. Mức biến thể 4/10, chuyển động 2/10, mật độ 4/10. Dùng JavaScript/CSS hiện có, native select/button/dialog; không thêm framework.

- Bộ chọn cố định phía trên cho tám bộ; giữ lựa chọn khi tải lại. CLEC lưu vị trí từng cấp/chặng trong curriculum để đi cùng backup/sync. Bộ Việt giữ vị trí khi chuyển qua lại trong phiên.
- Chọn chặng → nhớ đáp án → mở thẻ → nghe/xem nét → tự đánh giá. Quiz vẫn tách khỏi SRS.
- Bàn phím chỉ tác động lên bộ đang hiện; nút native nhận Space đúng một lần. Trường nhập và dialog không kích hoạt phím học.
- Nút đánh giá nằm trong vùng nhìn trên màn hình nhỏ; bộ lọc không bị ép thành ô quá hẹp. Giữ cả giao diện sáng/tối và reduced motion.

## Phát hiện và xử lý

| Mức | Phát hiện trước thay đổi | Kết quả |
| --- | --- | --- |
| Cao | Phím của bộ Việt vẫn chạy khi đang học bộ CLEC | Chặn handler khi bộ Việt bị ẩn; kiểm thử tiến độ không bị ghi nhầm |
| Cao | localStorage đầy vẫn chuyển thẻ và báo thành công | Hoàn tác bản ghi/lịch sử khi lưu thất bại; giữ thẻ để thử lại |
| Vừa | Chọn bộ sau reload có thể không khớp cấp đang tải | Khôi phục đúng cấp/vị trí, hủy dữ liệu trễ khi đổi tài khoản |
| Vừa | Lỗi tải bộ thiếu thao tác khôi phục rõ ràng | Nút thử lại, trạng thái tải/rỗng/lỗi riêng; sửa CSS ghi đè thuộc tính hidden |
| Vừa | Câu ví dụ tải xong thay toàn thẻ, mất focus | Chỉ cập nhật vùng ví dụ; giữ nút đang dùng |
| Vừa | Quá nhiều chip/công cụ, đánh giá nằm dưới thanh điều hướng | Một select có nhãn, công cụ mở rộng, cuộn/focus về thẻ, bố cục mobile gọn |
| Vừa | Thẻ có tên truy cập không chứa nội dung hiển thị | Tên lấy từ chữ và thao tác hiển thị; aria-pressed, lang và mặt ẩn rõ ràng |

## Phần mở rộng đã triển khai kỹ thuật

- **Báo câu quiz:** học viên gửi loại vấn đề và snapshot bốn lựa chọn, không đổi điểm/SRS. RPC giới hạn 20 báo cáo/ngày; chống gửi trùng đang mở. Admin xem hàng đợi và đóng với ghi chú. RLS không cho đọc báo cáo người khác hay ghi trực tiếp.
- **Biên tập:** hàng đợi câu nháp có nguồn/tác giả của cả hai ngôn ngữ; duyệt từng câu. Bộ lọc nghĩa còn thiếu giúp tìm mục cần xử lý, không tự điền hai mục ngoài CC-CEDICT.
- **Nét chữ:** 50 JSON nguyên bản từ `hanzi-writer-data@2.0.1`, SHA-256 từng file, Arphic Public License đóng gói riêng; service worker giữ tập này offline. Chữ khác tiếp tục tải từ nguồn ghim phiên bản. Đo snapshot CLEC: 3.088 ký tự Hán duy nhất đều có file upstream; chỉ 50 ký tự được đóng gói offline. Có file không đồng nghĩa giáo viên đã nghiệm thu nét/chữ viết tay.
- **Câu Trung–Việt:** pilot 50 cặp ngắn có sentence ID, tác giả, attribution và hash nguồn; nhập ở `draft`, nhập lại không ghi đè bản đã duyệt.
- **Audio gốc:** schema, seeder, kiểm tra giấy phép/hash, phát lại có attribution và duyệt riêng đã có. Audio chỉ xuất bản khi câu cha đã xuất bản. Snapshot metadata có 39 bản ghi khớp các câu Mandarin liên kết Việt: 37 license trống, 2 CC BY-NC 4.0, **0** đạt danh sách CC0/CC BY của pilot. Không nhập bản thiếu quyền; không dùng giọng tổng hợp để thay số lượng audio gốc.

## Kiểm chứng và ranh giới nghiệm thu

- 59 unit tests; 51 nhóm kiểm tra database trong PostgreSQL dùng một lần; 73 Playwright flows, gồm đổi tài khoản, quota/quyền, lỗi storage/mạng, bàn phím, mobile dọc/ngang, sáng/tối, reduced motion và PWA offline.
- Lighthouse accessibility local: **100/100** trên màn Flashcard mặc định. Baseline CDN production trước thay đổi: performance 93, LCP 1,7 giây; số đo sau phát hành cần đối chiếu riêng, không suy từ điểm local.
- Dữ liệu/tài khoản/API giả trong E2E. Audio dương tính được kiểm tra bằng fixture có nguồn/giấy phép giả; không chứng minh snapshot thật có bản ghi đủ quyền.
- 50 file nét so sánh byte với package ghim phiên bản và kiểm tra hash/schema. Không gọi model/provider trả phí.
- Cần áp dụng hai migration mới **trước** bundle dùng quan hệ `example_audio`; hướng dẫn tại [DEPLOYMENT.md](DEPLOYMENT.md#flashcard-báo-câu-và-pilot-học-liệu).
- Trước phát hành frontend, đã xác minh production có đủ 11 migration, 50 câu pilot ở nháp, hai bảng mới bật RLS và từ chối đọc ẩn danh (HTTP 401 / `42501`). Không có câu/audio nào được tự xuất bản trong bước này.
- OCR delegate chọn 83 file reviewable: đã review 83, bỏ qua 0 (100%); 5 file bị bộ lọc loại gồm tài liệu, lockfile và giấy phép đã kiểm tra thủ công. Review dữ liệu nét gồm schema và so sánh byte/hash với package, không phải thẩm định sư phạm.
- Giáo viên vẫn cần duyệt nghĩa gần nhau, 50 bản dịch và cấp phù hợp; thiết bị thật vẫn cần kiểm tra bút/cảm ứng, audio và voice. Đây là công việc nghiệm thu nội dung/thiết bị, không được đánh dấu hoàn tất bằng mock test.

## Bảo trì cần giữ

1. Duyệt hàng đợi báo câu và câu nháp định kỳ. Chỉ xuất bản khi người có chuyên môn xác nhận; không nhập lại để xóa lịch sử duyệt.
2. Khi cập nhật nguồn, chạy các lệnh prepare, đối chiếu hash/giấy phép/count rồi review diff dữ liệu. Không tự nâng dependency hoặc gom toàn bộ kho nét vào precache.
3. Giữ hợp đồng giữa hai engine SRS, curriculum và cloud snapshots. Chưa có lý do đổi toàn bộ framework hoặc gộp lịch ôn; tiếp tục giữ test tài khoản/storage mỗi lần sửa luồng học.
4. Shell HTML/CSS và tải module toàn ứng dụng vẫn là nợ hiệu năng. Đã dùng `defer` đúng thứ tự script; chỉ tách tải theo route khi đo trên bản phát hành chỉ ra lợi ích rõ ràng. Lighthouse local từ máy dev không nén không đại diện cho CDN production.
5. Khi đổi nguồn audio, kiểm tra lại tác giả, license, URL, hash và nội dung khớp câu trước khi nhập; số lượng 20 là trần pilot, không phải chỉ tiêu buộc phải lấp bằng tài sản thiếu quyền.
