# Nghiên cứu mở rộng học liệu và luyện tập

Đối chiếu ngày **2026-10-29**, với mã nguồn nền `68b2289`. Đây là nghiên cứu và tiêu chí triển khai; tài liệu này không xác nhận một tính năng mới đã chạy trên production, không nhập thêm dữ liệu và không sử dụng API trả phí.

## Cập nhật triển khai 2026-10-30

Các phần dưới giữ bối cảnh nghiên cứu ban đầu. Tiến độ mã nguồn hiện tại:

| Hạng mục | Đã triển khai | Còn lại |
| --- | --- | --- |
| Quiz từ vựng | Nghĩa Anh và pinyin; tối đa 10 câu, bốn lựa chọn khác nhau; luyện lại từ sai; lịch sử có loại quiz/phạm vi, đi cùng sao lưu và đồng bộ curriculum | Báo câu mơ hồ cho biên tập viên; đánh giá sư phạm nghĩa gần nhau |
| Hàng đợi ôn | Quiz chỉ hỏi từ đến hạn, lấy phương án nhiễu từ cấp/chặng đang chọn; không tự đổi lịch SRS. Nút nghe/đánh giá thẻ dùng đúng từ đang hiển thị | Nghiệm thu đa thiết bị với người học thật |
| Luyện nét | Hanzi Writer 3.7.3, dữ liệu từng chữ ghim `hanzi-writer-data@2.0.1`, thử lại khi tải lỗi, dừng khi đóng/đổi màn; license MIT đóng gói riêng | Snapshot/hash dữ liệu nét, đo độ phủ ký tự; kiểm tra bút/cảm ứng trên thiết bị thật |
| Câu Trung–Việt | Migration, bộ nhập Tatoeba vào nháp, attribution từng câu, RLS và duyệt bằng quyền admin; dry-run cache local chọn 528 câu cho 391 từ | Duyệt thử 50 cặp câu, quyền/nguồn cho tối đa 20 audio; chưa xác nhận migration/seed production |
| Nghĩa còn thiếu | Resolver CC-CEDICT đã có trong `main`, giữ provenance và trạng thái duyệt | Biên tập `精彩纷呈`, `口哨儿`, dịch/duyệt nghĩa Việt |

Quiz pinyin loại mục có số đồng tự và từ có nhiều cách đọc được phát hiện trong tập đang chọn; chuẩn hóa khoảng trắng khi khử trùng, giữ khác biệt dấu thanh. Không đòi hỏi nghĩa Anh để hỏi pinyin. Các bài này vẫn là luyện từ, không phải đề thi HSK chuẩn hóa. Kết quả test dùng dữ liệu giả; không thay thế nghiệm thu nguồn nét, dịch câu, audio hay provider AI thật.

Phần luyện nét/câu ví dụ đã commit trên worktree tại [`2625849`](https://github.com/ChienhocIT/Hanzi_Studio_HSK/commit/262584976e0c499749543b89480cd1da55127c42); đã đối chiếu commit này trên remote `main` và nhánh `codex/learning-expansion`. Chi tiết kiểm chứng và ranh giới production: [báo cáo 2026-10-30](PROJECT-PROGRESS-2026-10-30.md).

## Phạm vi đã có

Màn `#hsk` có tra cứu, luyện thẻ, nghe giọng thiết bị và ôn đến hạn trên danh mục **HSK 3.0 (CLEC 2025)**. Mã nguồn dùng ID `clec2025-<seq>` và tiến độ curriculum hiện có. Chưa có chế độ trắc nghiệm ngay trong màn này. Tài liệu triển khai ghi 11.000 mục, 10.983 mục có nghĩa Anh CC-CEDICT; số lượng và trạng thái xuất bản trên database cần kiểm tra riêng khi phát hành. [Mã màn học](../src/syllabus.js), [phạm vi triển khai](IMPLEMENTATION.md).

Giữ riêng danh mục CLEC 2025, chuẩn GF 0025-2021 và bộ tham khảo HSK 2.0. CTI cung cấp liên kết đề cương và đề mẫu trên trang chính thức; có liên kết tải không đồng nghĩa dự án được phân phối lại đề/audio. Giữ phiên bản đề cương trong từng bản ghi, không suy cấp bằng nghĩa từ. [CTI syllabus](https://www.chinesetest.cn/syllabus), [đối chiếu nguồn hiện có](HSK-DATA-SOURCES.md).

## 1. P0 — Quiz từ vựng theo cấp và hàng đợi ôn

**Đề xuất:** thêm phiên 10 câu ngay trong `#hsk`, lấy từ đang hiển thị hoặc đến hạn. Hai dạng: chữ Hán → pinyin và chữ Hán → nghĩa Anh. Tái sử dụng bản ghi đã xuất bản và nguồn nghĩa hiện có; không cần gọi Gemini hoặc mua ngân hàng câu hỏi. CC-CEDICT cung cấp dữ liệu từ điển theo CC BY-SA 4.0; phần nghĩa tiếp tục giữ ghi công và thông tin phép biến đổi. [MDBG/CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict), [bộ nhập nghĩa hiện có](../scripts/seed-glosses.mjs).

**Điều kiện tạo câu:** khử trùng lựa chọn sau chuẩn hóa; không dùng cùng cách đọc hay nghĩa hiển thị làm hai đáp án khác nhau. Chỉ tạo câu khi đủ lựa chọn hợp lệ; loại mục thiếu nghĩa khỏi dạng hỏi nghĩa. Các nghĩa từ điển có thể chồng lấn dù chuỗi khác nhau, nên cần nút báo câu mơ hồ và không gọi đây là đề thi HSK chuẩn hóa.

**Nghiệm thu:** kết quả đúng/sai và đáp án giải thích; chỉ chấm một lần mỗi câu; chuyển cấp/tài khoản hủy phiên cũ; xử lý thiếu dữ liệu và XSS; dùng bàn phím và điện thoại. Điểm quiz tách khỏi đánh giá nhớ của SRS, hoặc yêu cầu học viên chủ động chọn mức nhớ. Sao lưu/đồng bộ giữ được dữ liệu mới nếu có lưu lịch sử. Đây là thêm hình thức luyện, không tăng số từ hoặc tự biến dữ liệu thành nội dung đã duyệt.

### Đối chiếu 17 mục thiếu nghĩa

Đã chạy `pickGlosses()` với danh mục CLEC local và bản `.sources/cedict.txt.gz`, header **2026-10-28T00:15:09Z**, SHA-256 `366f39049fbcc9ca0cc414f319bfc56a33f6f9aba73aec1f609c5cb6502d2000`. Đây là đối chiếu kỹ thuật trên snapshot, không gọi model hoặc dịch máy. Nguồn upstream: [CC-CEDICT/MDBG](https://www.mdbg.net/chinese/dictionary?page=cc-cedict); hàm đang phân loại: [cedict-glosses.mjs](../scripts/cedict-glosses.mjs).

| Nhóm | Kết quả đọc snapshot | Hướng xử lý |
| --- | --- | --- |
| 1 mục bị lọc nhầm | `姓名`: nghĩa thường bắt đầu bằng “surname and given name; full name”, bị regex `^surname ` loại | Sửa phân loại tên họ; giữ regression test cho nghĩa thường và mục họ riêng |
| 14 mục chỉ có dẫn chiếu | `体检→体格检查`, `下功夫→下工夫`, `纯朴→淳朴`, `辞典→词典`, `得意扬扬→得意洋洋`, `磨炼→磨练`, `泰斗→泰山北斗`, `无可厚非→未可厚非`, `效仿→仿效`, `星系→恒星系`, `揠苗助长→拔苗助长`, `抑扬顿挫→顿挫抑扬`, `做证→作证`, `做主→作主` | Resolver theo dẫn chiếu rõ trong nguồn; giới hạn độ sâu, phát hiện chu kỳ, giữ đúng cách đọc đích và provenance |
| 2 mục không có entry | `精彩纷呈`, `口哨儿` | Giữ nghĩa trống, đưa vào hàng đợi biên tập; không gán nghĩa bằng fuzzy match hoặc tự bỏ hậu tố 儿 |

Resolver bổ sung nghĩa cho mục đã tồn tại, không thêm 15 từ HSK mới. Giữ chữ, pinyin và cấp của mục gốc; ghi rõ nghĩa tra qua dẫn chiếu, không đổi nhãn sư phạm thành đã duyệt. Các câu `see` cần biên tập kiểm tra mức tương đương. Tiếp tục attribution/CC BY-SA 4.0 của CC-CEDICT cho dữ liệu dẫn xuất. Các thay đổi này đang được agent chính triển khai/kiểm chứng riêng; tài liệu nghiên cứu không xác nhận đã deploy.

## 2. P1 — Xem và luyện thứ tự nét

Hanzi Writer có `animateCharacter()`, `quiz()` và callback `onMistake`/`onComplete`. Có thể tự host JSON từng chữ qua `charDataLoader`; không cần nạp toàn bộ kho khi mở trang. [Tài liệu tác giả](https://hanziwriter.org/docs.html).

Mã thư viện dùng MIT, còn dữ liệu chữ từ Make Me a Hanzi/Arphic dùng **Arphic Public License**. Phải giữ hai thông báo riêng khi đóng gói; không ghi MIT cho toàn bộ dữ liệu nét. [Trang giấy phép của tác giả](https://hanziwriter.org/license.html), [ARPHICPL.TXT của kho dữ liệu](https://github.com/chanind/hanzi-writer-data/blob/master/ARPHICPL.TXT).

**Đề xuất:** nút luyện từng chữ trong từ đang học; bước đầu chọn một tập nhỏ, ghim phiên bản/hash và công bố số chữ thực sự có dữ liệu. Không suy rằng kho nét phủ toàn bộ 11.000 từ. Dữ liệu nét là cho ký tự, không tự cung cấp nghĩa hoặc cấp HSK.

**Nghiệm thu:** thứ tự/hướng nét, bật/tắt gợi ý, đếm lỗi, thử lại; chữ thiếu dữ liệu có thông báo rõ; tải lỗi có retry; hủy quiz/animation khi rời màn; kiểm tra cảm ứng, sáng/tối và reduced motion. Gọi kết quả là phản hồi luyện nét theo mẫu, không quảng cáo như chứng nhận chất lượng thư pháp hoặc nhận dạng mọi kiểu chữ viết tay.

## 3. P1 — Ví dụ song ngữ và audio có nguồn

Tatoeba có export cặp câu và dữ liệu audio. Văn bản mặc định CC BY 2.0 FR, một phần CC0; license audio do từng người đóng góp chọn. Export audio chứa sentence ID, audio ID, username, license và attribution URL; **license rỗng không cho phép tái sử dụng ngoài Tatoeba**. [Downloads](https://tatoeba.org/en/downloads), [điều kiện tái sử dụng](https://tatoeba.org/en/terms_of_use).

**Đề xuất:** thử nghiệm biên tập 50 cặp câu Mandarin–Việt và tối đa 20 audio được phép dùng; đây là mục tiêu, chưa phải dữ liệu đã nhập. Chọn giấy phép CC0/CC BY rõ ràng cho đợt đầu. Giữ nguồn và tác giả riêng cho câu gốc, bản dịch và bản ghi âm. Ghim snapshot/hash; không hotlink một URL âm thanh rồi coi như đã đủ quyền.

**Nghiệm thu:** câu dịch liên kết trực tiếp, giáo viên duyệt nghĩa/độ tự nhiên và cấp phù hợp; audio khớp đúng câu/ngôn ngữ; người học xem được ghi công. Mọi bản nhập bắt đầu ở `draft`; chống trùng và bảo vệ bản đã duyệt khi nhập lại. Chưa xác minh số cặp Mandarin–Việt đủ điều kiện, độ phủ từ HSK hoặc chất lượng người đọc; cần đo trước khi cam kết phủ toàn cấp.

## Thứ tự thực hiện

1. Hoàn thiện quiz và hàng đợi thiếu nghĩa trên dữ liệu hiện có; không đổi tên khóa tiến độ hoặc nhãn đề cương.
2. Thêm luyện nét với tập chữ nhỏ có provenance và license đầy đủ.
3. Nhập thử câu/audio qua quy trình duyệt; chỉ mở rộng sau khi kiểm tra chất lượng và quyền từng tài sản.

Không tăng ngân hàng bằng câu sinh tự động chưa duyệt. Ghi số từ, số nghĩa, số câu, số audio và số bài kiểm tra thành các chỉ số riêng. Phần việc phụ thuộc tài khoản Google/SMTP, provider phát âm, duyệt sư phạm hoặc cấp quyền nguồn cần được báo riêng với tiến độ mã nguồn.
