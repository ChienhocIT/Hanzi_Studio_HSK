# Flashcard: UX, học liệu và bảo trì

**Cập nhật 2026-10-31:** đánh giá trước chỉ so DOM đã bỏ sót CSS ép cỡ chữ và toolbar khác nhau. Đợt bảo trì mới dùng toàn bộ workspace gốc, so computed styles trên các nguồn, giữ DOM khi lật và kiểm tra trực quan. Xem [phát hiện, kiểm chứng và ảnh](PROJECT-MAINTENANCE-2026-10-31.md); các số đo/phát hành bên dưới thuộc các bản lịch sử được ghi rõ.

Đối chiếu ngày **2026-10-30**, nền `7db4c6b`. Người dùng chọn **chuyển nhanh giữa từng bộ riêng biệt**. Không trộn lịch SRS của bộ 500 từ nghĩa Việt với danh mục CLEC 2025.

## Thiết kế và luồng học

Giữ màu tím, font Be Vietnam Pro, nhận diện và cấu trúc điều hướng hiện có. Mẫu chuẩn là thẻ HSK 3 nghĩa Việt trong ảnh người dùng: mặt trước/mặt sau, pinyin, nghĩa, ví dụ, tiến độ, điều hướng và bốn mức **Chưa nhớ / Khó nhớ / Đã nhớ / Rất dễ**. Mức biến thể 3/10, chuyển động 2/10, mật độ 4/10. Dùng JavaScript/CSS hiện có, native select/button/dialog.

- Bộ chọn cố định phía trên cho tám bộ; giữ lựa chọn khi tải lại. CLEC lưu vị trí từng cấp/chặng trong curriculum để đi cùng backup/sync. Bộ Việt giữ vị trí khi chuyển qua lại trong phiên.
- Trang Flashcard chọn cấp là mở thẻ ngay; chọn chặng và chế độ bằng select. Thư viện vẫn có lưới chặng. Luồng học: nhớ đáp án → mở thẻ → nghe/xem nét → tự đánh giá. Quiz vẫn tách khỏi SRS.
- Bàn phím chỉ tác động lên bộ đang hiện; nút native nhận Space đúng một lần. Trường nhập và dialog không kích hoạt phím học.
- Nút đánh giá nằm trong vùng nhìn trên màn hình nhỏ; bộ lọc không bị ép thành ô quá hẹp. Giữ cả giao diện sáng/tối và reduced motion.

## Đồng bộ mẫu thẻ theo HSK 3 (nền e851178)

Đợt trước mới đồng bộ bộ chọn, còn CLEC dùng thẻ gọn hai mức nên chưa đáp ứng yêu cầu cùng format. Đợt này dùng [renderer chung](../src/study-card.js) cho CLEC, tham khảo và Lộ trình; bộ Việt dùng cùng bộ CSS `.classic-study` với markup tĩnh để giữ tốc độ hiển thị ban đầu.

| Điểm vào | Kết quả |
| --- | --- |
| `#study`, bộ Việt 500 từ | Giữ mẫu chuẩn và bốn mức, nâng tương phản chữ ở cả hai theme |
| `#study`, CLEC 1-6 và 7-9 | Mở thẻ trực tiếp, chọn chặng/chế độ, cùng mặt trước/mặt sau và bốn mức |
| `#hsk`, luyện thẻ hoặc ôn đến hạn | Cùng renderer; giữ tra cứu, quiz, hàng đợi biên tập và attribution |
| `#contenthub`, HSK 2.0 tham khảo | Cùng renderer; giữ các cách đọc/nghĩa Anh và nhãn nguồn tham khảo |
| `#path`, dữ liệu trên máy/đã nhập | Cùng renderer; giữ nhãn mẫu/chưa duyệt, ví dụ của bộ Việt khi có |
| `#library` và `#review` của bộ Việt | Mở từ/nhóm từ/ôn đến hạn sẽ chọn lại đúng bộ Việt dù trước đó đang chọn CLEC |

Phím Space và mũi tên thống nhất; 1-4 tương ứng bốn mức. Mặt ẩn có `inert`/`aria-hidden`, chỉ mặt hiện nhận focus; tải câu ví dụ chỉ thay vùng ví dụ. Đổi bộ chưa có cache che thẻ cũ và hiện khung tải cùng kích thước. Mục chưa có ví dụ đã duyệt ghi rõ trạng thái, không tạo ví dụ/ nghĩa Việt thay cho dữ liệu thiếu.

Lịch sử và ID nguồn giữ riêng. Với curriculum/reference, hai mức cũ giữ công thức: `again` hẹn 10 phút, `good` khởi đầu 1 ngày rồi nhân 2,2 làm tròn lên. Thêm `hard` khởi đầu 1 ngày rồi nhân 1,3, `easy` khởi đầu 4 ngày rồi nhân 3. `lastRating` là trường tùy chọn trong snapshot; tiến độ cũ vẫn đọc được. Lưu thất bại giữ thẻ hiện tại và hoàn tác bản ghi, kể cả thẻ Lộ trình.

Kiểm tra đợt đồng bộ: 59 unit tests, 80 browser scenarios (7 regression mới), cùng ảnh desktop/mobile dọc/ngang, sáng/tối và reduced motion. Tương phản bốn nút đạt từ 5,39:1 ở light và 6,15:1 ở dark. Lighthouse accessibility local đạt 100. Review 13 file mã/test theo OCR rules, 0 bỏ qua; tài liệu kiểm tra riêng. Các số đo production ở phần phát hành bên dưới thuộc bản trước; bản đồng bộ cần đối chiếu bundle và CI đúng commit khi phát hành.

## Dùng trực tiếp template HSK 3 gốc (nền af3db7c)

Bản đồng bộ trước dựng HTML tương tự nên chưa đúng yêu cầu dùng nguyên mẫu ban đầu. `src/study-card.js` hiện tạo template từ chính `#page-study .study-layout` trong `index.html`; mỗi nguồn chỉ thay nội dung, ID và hành động. Thay đổi template gốc sẽ áp dụng cho mọi bộ khi tải trang, không cần sửa một bản HTML thẻ thứ hai.

- CLEC 1–6, 7–9, HSK 2.0 tham khảo và Lộ trình giữ nguyên cấu trúc hai mặt, ký hiệu trên bốn nút, nút mũi tên và cột thống kê/phím tắt. Cột phụ ẩn khi vùng chứa hẹp giống bố cục mobile của mẫu gốc.
- Bấm toàn thẻ lật qua/lại; liên kết nguồn, audio và nút duyệt trong ví dụ không làm lật thẻ. Với mặt có tương tác bên trong, gợi ý sẵn có ở chân thẻ nhận bàn phím để tránh lồng nút. Phím trên audio/video giữ thao tác phát của trình duyệt.
- Thống kê phiên chỉ tăng sau khi lưu thành công; SRS/backup và ID nguồn giữ nguyên. Không sao chép tiến độ của bộ Việt sang CLEC.
- Nội dung dài cuộn từ đầu trong thẻ, không cắt mất chữ Hán phía trên. Font, màu, bo góc và bố cục lấy từ mẫu gốc.

Regression so cấu trúc DOM của `.study-layout` với mẫu gốc cho cả bảy bộ CLEC, trước/sau khi lật, và các điểm vào tham khảo/Lộ trình. Nội dung thay đổi theo từ và trạng thái ẩn/hiện được tách khỏi phép so; nút, lớp bố cục và cấu trúc còn lại phải khớp. Kiểm tra bổ sung lật lại, thống kê lưu thành công/thất bại và liên kết trong ví dụ. Ảnh kiểm tra desktop/mobile sáng/tối dùng API giả; không gọi provider thật.

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
- Lighthouse màn Flashcard production sau sửa tải trang: **performance 99, accessibility 100, LCP 1,4 giây, CLS 0**. Baseline trước thay đổi: performance 93, accessibility 90, LCP 1,7 giây. Đây là các lần đo mobile mô phỏng, không phải số liệu người dùng thực tế.
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
4. Shell HTML/CSS và tải module toàn ứng dụng vẫn là nợ hiệu năng. Đo production phát hiện `defer` hạ ưu tiên tải các script khởi tạo, nên giữ thứ tự/chế độ thực thi ban đầu và preload `app.js` với ưu tiên cao. Select và tiêu đề được render ngay trong HTML, tránh thay tám chip bằng select sau khi cloud bundle tải xong rồi mới đưa chữ trên thẻ vào viewport. Select chỉ mở tương tác sau khi listener sẵn sàng. Chỉ tách tải theo route khi đo chỉ ra lợi ích rõ ràng. Lighthouse local từ máy dev không nén không đại diện cho CDN production.
5. Khi đổi nguồn audio, kiểm tra lại tác giả, license, URL, hash và nội dung khớp câu trước khi nhập; số lượng 20 là trần pilot, không phải chỉ tiêu buộc phải lấp bằng tài sản thiếu quyền.

## Kiểm chứng bản phát hành

`c6d43d2` đã có trên `main` và nhánh worktree. [CI main](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/41001262979) chạy đúng SHA, đạt 59 unit / 51 nhóm database / 73 browser flows. Vercel đã phát hành, bundle khớp SHA-256 `97c373702c9b7e7412339126a78beeee87c9b2fb43b8595da97386ea698facb9`; smoke trên domain production qua chọn tám bộ, đánh giá SRS riêng, chuyển bộ/reload giữ vị trí, nút đánh giá mobile và nét chữ thật đóng gói. Các API tài khoản/AI trong smoke dùng fixture, không ghi tiến độ người thật.

Lighthouse production ở bản này: accessibility **100**, performance **81**, LCP **4,3 giây**, CLS **0,001** (một lần đo mạng mobile mô phỏng). Đây là lý do bỏ thử nghiệm `defer` và thêm preload ở bản tiếp theo; không coi CI xanh là bằng chứng đạt mục tiêu hiệu năng. Hai bố cục trước/sau có phần tử LCP khác nhau, cần đọc trace cùng điểm số.

Bản mã cuối `9adb263` giữ picker trong HTML ban đầu và ưu tiên tải script khởi tạo. Đã đối chiếu 8 asset trên domain thực (chuẩn hóa CRLF/LF của Windows; service worker đối chiếu nội dung ngoài build ID phụ thuộc byte nền tảng). Bundle SHA-256 là `841684bedf07bcf3784c9e52b94ae3fdcb77feb2b4ea28c6465f485f4d77fe9f`. Smoke chọn bộ/đánh giá/đổi bộ/reload/mobile/nét chữ qua, không có lỗi JavaScript. Lighthouse cuối: **99 / 100, LCP 1,4 giây, CLS 0**. [CI đúng SHA trên main](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/41002140128), [CI nhánh worktree](https://github.com/ChienhocIT/Hanzi_Studio_HSK/actions/runs/41002124352); kết quả tổng là 59 unit, 51 nhóm database, 73 browser flows. Các commit tài liệu sau đó không thay bundle/runtime.
