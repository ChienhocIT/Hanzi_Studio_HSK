# Nguồn học liệu HSK và dữ liệu tham khảo

Đối chiếu ngày 2026-10-29. Phân biệt đề cương chính thức, danh sách cộng đồng và nội dung đã được giáo viên duyệt.

## Phiên bản đề cương

CTI công bố HSK 3.0 ra mắt toàn cầu ngày **2026-12-13**; tại thời điểm kiểm tra đây là mốc tương lai. Không suy ra mọi kỳ thi đã chuyển đổi từ số phiên bản hay ngày in trên tài liệu. [Thông báo của CTI](https://admin.chinesetest.cn/gonewcontent.do?id=51336883).

Đề cương/tài liệu mẫu cần lấy từ [trang syllabus chính thức](https://www.chinesetest.cn/syllabus). Các liên kết tải được nhận diện khi nghiên cứu gồm [PDF đề cương mới](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf) và [gói đề mẫu HSK 3.0](https://hsk-sample-1409982902.cos.ap-beijing.myqcloud.com/HSK3.0.zip). Chúng được dẫn nguồn để tham khảo; dự án chưa sao chép đề/audio hoặc khẳng định có quyền tái phân phối. Trang syllabus không luôn trả lời khi kiểm tra tự động, vì vậy cần kiểm tra lại tệp trực tiếp trước khi xây đề chuẩn hóa.

Các số lượng “HSK 3.0” trong dữ liệu cộng đồng có thể gắn chuẩn 2021, không đồng nghĩa danh mục thi mới nhất. Tài liệu cần trường phiên bản và ngày đối chiếu, không chỉ `level`.

## Dữ liệu đã đưa vào dự án

`data/hsk2-reference.json` có **4.997** mục từ lấy từ sáu revision cố định của Wiktionary, giữ nhãn **HSK 2.0, cộng đồng, chưa duyệt**. Theo cấp: 150, 149, 298, 600, 1.300, 2.500. Đây là số thực tế trích xuất, không làm tròn thành 5.000. Các revision: 79426444, 79426451, 79426457, 79426548, 79426556, 79426627. URL từng trang và lịch sử tác giả nằm trong `data/hsk2-provenance.json`. [Ví dụ trang nguồn cấp 1](https://en.wiktionary.org/w/index.php?oldid=79426444), [quyền tái sử dụng văn bản Wiktionary](https://en.wiktionary.org/wiki/Wiktionary:Copyrights).

Đối chiếu chữ giản thể chính xác với bản CC-CEDICT **2026-10-28T00:15:09Z**, giữ mọi cách đọc và nghĩa tiếng Anh, không tự dịch hoặc chọn nghĩa theo cấp. Có 12 mục chưa khớp, được ghi riêng để biên tập. CC-CEDICT cho phép dùng thương mại theo CC BY-SA 4.0 với ghi công và chia sẻ bản sửa đổi cùng giấy phép. [Nguồn MDBG và điều kiện sử dụng](https://www.mdbg.net/chinese/dictionary?page=cedict).

Dữ liệu kết hợp được phát hành theo **CC BY-SA 4.0**, kèm tên cộng đồng tác giả, revision/lịch sử nguồn, mô tả phép biến đổi, SHA-256 bản từ điển và [toàn văn giấy phép](../data/CC-BY-SA-4.0.txt). Nghĩa tiếng Anh, phiên âm dạng số và phân cấp cần giáo viên kiểm tra trước khi dùng làm nội dung thi/khóa học. Giấy phép này áp dụng cho bộ dữ liệu; không tự tuyên bố giấy phép cho mọi tài sản khác trong repository.

Tái tạo bằng `npm run data:import-reference`. Raw tải về lưu trong `.sources/` bị Git ignore. Script kiểm tra revision và hash từ điển; khi upstream đổi bản, cần đánh giá lại rồi cập nhật hash tường minh. Build không tải nguồn bên ngoài; chỉ phục vụ artifact đã nhập.

## Nguồn đã loại khỏi đợt nhập

Không coi giấy phép MIT ở gốc repository là bằng chứng mọi nghĩa từ đều thuộc MIT. Ví dụ dữ liệu `gigacool/hanyu-shuiping-kaoshi` có header ghi nghĩa từ CEDICT và điều kiện BY-NC, dù repository có tệp MIT. [Header dữ liệu upstream](https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/hsk.csv). Do chưa giải quyết chuỗi quyền này, dự án không nhập dữ liệu từ chuỗi đó cho sản phẩm thương mại.

## Công việc sư phạm còn lại

Chọn danh mục thi hiện hành theo CTI, đối chiếu cấp từng mục, dịch/duyệt tiếng Việt, bổ sung ví dụ nguyên gốc hoặc được cấp quyền, audio và câu hỏi. Không tự đánh dấu dữ liệu cộng đồng là chính thức hay đã kiểm duyệt. HSK 7-9 chưa được bổ sung trong bộ tham khảo này.
