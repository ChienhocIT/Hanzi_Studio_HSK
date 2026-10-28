# Nguồn dữ liệu HSK mở và giấy phép

Ngày đối chiếu: **2026-10-29**. Tài liệu này mở rộng [HSK-SOURCES-RESEARCH.md](HSK-SOURCES-RESEARCH.md) và chỉ khảo sát nguồn: chưa nhập dữ liệu mới, chưa thay đổi mã hay schema. Mọi số lượng ghi "đếm ngày 2026-10-29" do người nghiên cứu tự đếm trên tệp tải về thư mục tạm (không đưa vào repo). Mục nào chưa kiểm chứng được từ nguồn gốc thì ghi **chưa xác minh**.

Phạm vi: chuẩn HSK chính thức (2.0 và 3.0), danh sách từ máy đọc được, từ điển (Anh/Việt, Hán-Việt), dữ liệu chữ Hán và nét viết, âm thanh, câu ví dụ, điểm ngữ pháp. Đối tượng là PWA tiếng Việt của dự án (frontend tĩnh trên Vercel, Supabase/PostgreSQL tùy chọn).

## Tóm tắt khuyến nghị

1. **Hiện có hai văn bản "HSK 3.0" khác nhau, phải tách nhãn.** (a) Chuẩn quốc gia GF 0025-2021: 11.092 từ, 3.000 chữ, 572 điểm ngữ pháp. (b) **《HSK考试大纲》 do 中外语言交流合作中心 phát hành (2025-11, thực hiện 2026-07)**: 11.000 từ, chia cấp khác hẳn (HSK 1 có 300 từ, không phải 500). CTI đang liên kết văn bản (b) trên trang syllabus. Đề thi HSK mới bám theo (b).
2. **Lấy danh sách từ/chữ/ngữ pháp trực tiếp từ PDF chính thức**, ghim SHA-256 rồi đối chiếu với `ivankra/hsk30` (cho chuẩn 2021) và `krmanik/HSK-3.0` (cho đề cương 2025). Chỉ dùng bộ cộng đồng để kiểm tra chéo, không dùng làm nguồn chuẩn. Quyền tái phân phối danh sách chính thức **chưa rõ** (xem §1.4), nên trong app chỉ dùng như danh mục tham chiếu (từ, cấp, pinyin, từ loại) và ghi rõ nguồn.
3. **Nghĩa tiếng Anh tiếp tục lấy từ CC-CEDICT (CC BY-SA 4.0)** như `scripts/import-reference.mjs`. **Nghĩa tiếng Việt phải do giáo viên biên soạn**: chưa tìm được từ điển Trung–Việt mở nào có giấy phép xác minh được, vì repo CVDICT hiện trả 404. Nếu dịch từ nghĩa CEDICT thì bản dịch là tác phẩm phái sinh và phải theo CC BY-SA.
4. **Dữ liệu chữ:** Unihan (Unicode License v3) cho pinyin và số nét; Make Me a Hanzi / `hanzi-writer-data` (Arphic Public License) cho nét viết; `dictionary.txt` của MMAH theo LGPL-3.0+. **Không dùng `kVietnamese` làm nguồn Hán-Việt duy nhất**: trường này chỉ phủ 2.111/3.000 chữ HSK 3.0, kể cả khi tra qua chữ phồn thể, và thiếu cả chữ cơ bản như 爱, 这.
5. **Tránh hoặc cách ly:** dữ liệu có chuỗi giấy phép NC hoặc không rõ (`gigacool/hanyu-shuiping-kaoshi` → `clem109/hsk-vocabulary`), audio trong `krmanik/HSK-3.0` (không ghi nguồn), CJKVI IDS (GPLv2/CHISE) nếu ship trong app, Forvo. Gắn MIT ở gốc repo cộng đồng **không** làm nghĩa CEDICT bên trong thành MIT.

## 1. Chuẩn chính thức

### 1.1 《国际中文教育中文水平等级标准》 GF 0025-2021

- **Cơ quan ban hành:** 教育部 và 国家语言文字工作委员会. 国家语委语言文字规范标准审定委员会 thẩm định. 教育部中外语言交流合作中心 tổ chức biên soạn. Áp dụng như quy phạm ngôn ngữ của 国家语委 **từ 2021-07-01**. Thông báo trên moe.gov.cn đề ngày 2021-03-31. [MOE](http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html)
- **Cấu trúc:** "三等九级" (sơ, trung, cao; 9 cấp, trong đó cấp 7–9 gộp thành một khối). "四维基准" gồm 音节, 汉字, 词汇, 语法. Ba chiều đánh giá: 言语交际能力, 话题任务内容, 语言量化指标. Năm kỹ năng: nghe, nói, đọc, viết, dịch. [MOE](http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html)
- **Văn bản:** phụ lục PDF trên moe.gov.cn: [W020210329527301787356.pdf](http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/W020210329527301787356.pdf). Tệp dài 260 trang, khoảng 51 MB, SHA-256 `e451fdf0899d9267bbd122db66e7e75bdd2851ad1e6732e47b6e960290d73a63` (tải ngày 2026-10-29). PDF xuất từ InDesign với font nhúng không trích được văn bản, nên phải OCR. `ivankra/hsk30` cũng ghi nhận PDF này "không có lớp văn bản". Bản in do 北京语言大学出版社 phát hành (ISBN 9787561957196; [nhà sách](https://yuyi.com.sg/products/9787561957196); nguồn thương mại, chỉ dùng để tham khảo).

Chỉ tiêu định lượng. Bảng dưới là số mới của từng cấp, trong ngoặc là số lũy kế:

| Cấp | 音节 | 汉字 | 词汇 | 语法 |
| --- | --- | --- | --- | --- |
| 1 | 269 | 300 | 500 | 48 |
| 2 | 199 (468) | 300 (600) | 772 (1.272) | 81 (129) |
| 3 | 140 (608) | 300 (900) | 973 (2.245) | 81 (210) |
| 4 | 116 (724) | 300 (1.200) | 1.000 (3.245) | 76 (286) |
| 5 | 98 (822) | 300 (1.500) | 1.071 (4.316) | 71 (357) |
| 6 | 86 (908) | 300 (1.800) | 1.140 (5.456) | 67 (424) |
| 7–9 | 202 (**1.110**) | 1.200 (**3.000**) | 5.636 (**11.092**) | 148 (**572**) |

Mức độ kiểm chứng: không đọc máy được trên PDF chính thức. Các số trên khớp với bản chép lại văn bản chuẩn trên [tuttocina.it](https://www.tuttocina.it/HSK/NuovoHSK-lineamenti.pdf) (nguồn thứ cấp). Chúng cũng khớp với số mục đếm ngày 2026-10-29 trong bộ OCR `ivankra/hsk30`: từ 500/772/973/1.000/1.071/1.140/5.636 = 11.092, chữ 3.000. Bộ `ivankra` có 573 dòng ngữ pháp, cấp 2 là 82 thay vì 81; nguyên nhân **chưa xác minh**. Số chữ viết tay lũy kế đến cấp 7–9 là 1.200 (theo cùng bản chép lại).

### 1.2 《HSK考试大纲》 2025-11 (đề cương thi mới)

- **Bìa:** "中文水平考试 HSK 考试大纲 … 2025-11 发布 2026-07 实施 中外语言交流合作中心 发布". Gồm 任务大纲, 话题大纲, 词汇大纲, 汉字大纲, 语法大纲. Phần giới thiệu ghi đề cương tham khảo GF 0025-2021, nhưng đây là **văn bản riêng** và không mang số hiệu GF.
- **Tệp:** trang [chinesetest.cn/syllabus](https://www.chinesetest.cn/syllabus) liên kết tới [新版HSK考试大纲1219.pdf](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf). Tệp dài 406 trang, có lớp văn bản, SHA-256 `ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941`, Last-Modified 2026-01-16. `krmanik/HSK-3.0` dẫn thêm bản [词汇、汉字、语法](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf) dài 330 trang, SHA-256 `a4544ceb…a023`. Bảng từ của hai tệp trùng khớp (so sánh ngày 2026-10-29). Bảng từ có các cột 序号 | 等级 | 词语 | 拼音 | 词性.
- **Số lượng** (đếm ngày 2026-10-29 trên PDF, theo ranh giới số thứ tự):

| Cấp | Từ (mới) | Chữ nhận đọc (mới) | Chữ viết tay |
| --- | --- | --- | --- |
| 1 | 300 | 246 | 100 (gộp cấp 1–2) |
| 2 | 200 | 125 | (gộp) |
| 3 | 500 | 284 | 150 |
| 4 | 1.000 | 441 | 150 |
| 5 | 1.600 | 431 | 150 |
| 6 | 1.800 | 413 | 150 |
| 7–9 | 5.600 | 1.148 | 500 |
| Tổng | **11.000** | **3.088** | **1.200** |

Số ngữ pháp theo JSON của `krmanik/HSK-3.0` (2025) là 70/78/96/95/70/50/134 = 593 mục. PDF trình bày ngữ pháp dạng bảng không đánh số, nên số này **chưa xác minh** với nguồn gốc. Các con số "HSK 1 có 300 từ" trên blog thứ cấp khớp với PDF.

### 1.3 Tình trạng chuyển đổi kỳ thi

- CTI thông báo "HSK 3.0 将于2026年12月13日全球正式开考". Hạn đăng ký thi giấy là 2026-11-16, thi máy là 2026-12-03 (giờ Bắc Kinh). [CTI](https://admin.chinesetest.cn/gonewcontent.do?id=51336883). Thông báo **không nêu** cấp nào thi theo đề cương nào, cũng không nêu lịch dừng HSK 2.0 (**chưa xác minh**).
- Theo nguồn thứ cấp, kỳ 2026-01-31 là thi thử và các kỳ HSK 1–6 thường lệ năm 2026 vẫn theo 2.0 ([studycli.org](https://studycli.org/zh-CN/hsk/hsk-levels-guide/)). Chưa đối chiếu được bản gốc của CTI (**chưa xác minh**). Trước khi gắn nhãn "đề thi hiện hành", cần kiểm tra lại trên chinesetest.cn.
- Không tìm thấy thông báo năm 2025/2026 của 中国国际中文教育基金会 về đề cương (**chưa xác minh**).

### 1.4 Bản quyền và quyền tái sử dụng (chưa chắc chắn)

- Điều 5 Luật Bản quyền Trung Quốc (sửa đổi năm 2020, hiệu lực 2021-06-01) loại trừ khỏi phạm vi bảo hộ "法律、法规，国家机关的决议、决定、命令和其他具有立法、行政、司法性质的文件，及其官方正式译文", tin tức thời sự thuần túy, cũng như lịch, bảng số và công thức thông dụng. [WIPO Lex](https://www.wipo.int/wipolex/zh/legislation/details/21065)
- GF 0025-2021 là quy phạm do cơ quan nhà nước (教育部, 国家语委) ban hành. Có lập luận rằng nó là "văn bản có tính chất hành chính", nhưng **chưa thấy án lệ hay giải thích chính thức** xếp quy phạm GF vào Điều 5. Chân trang moe.gov.cn ghi "版权所有：中华人民共和国教育部". `ivankra/hsk30` cũng nhận xét việc các repo MIT "claim copyright" là đáng ngờ và rằng dữ liệu "might be public domain" tùy luật Trung Quốc. [README ivankra](https://github.com/ivankra/hsk30)
- Đề cương 2025 do 中外语言交流合作中心 phát hành. Đây là đơn vị sự nghiệp, không phải "国家机关", nên lập luận Điều 5 **yếu hơn**. PDF không có câu tuyên bố bản quyền hay giấy phép (đã tìm 版权/著作权/保留 ngày 2026-10-29).
- Một danh sách từ đơn thuần (từ + cấp) có thể ít yếu tố sáng tạo. Tuy vậy, tính tuyển chọn và sắp xếp vẫn có thể được bảo hộ, và người dùng ở Việt Nam/quốc tế còn chịu luật khác. **Kết luận: rủi ro pháp lý chưa xác định.** Cách thận trọng: không phân phối lại PDF, đề hay audio chính thức. Chỉ lưu dữ kiện tối thiểu (từ, cấp, pinyin, từ loại), dẫn nguồn và trang. Liên hệ CTI/CLEC nếu muốn dùng thương mại quy mô lớn.

### 1.5 HSK 2.0 (2009/2012)

- Đề cương 《新汉语水平考试大纲》 HSK 1–6 do 孔子学院总部/国家汉办 biên soạn. Theo [Đại học Genève](https://www.unige.ch/ic/hsk/vocabulaire), có bản in năm 2009/2010 của 商务印书馆 và bản sửa năm 2015 của 人民教育出版社, với danh sách từ khác nhau. Năm xuất bản và các mục khác nhau giữa các bản **chưa xác minh** từ bản gốc.
- Quy mô thường được nêu là 150/300/600/1.200/2.500/5.000 từ lũy kế. Bộ Wiktionary đã nhập có 4.997 từ (150/149/298/600/1.300/2.500), nên lệch 3 mục so với 5.000. Nguyên nhân có thể là khử trùng lặp trong cấp hoặc mục đánh chú thích, cần biên tập viên đối chiếu.
- Bản quyền: sách in là xuất bản phẩm thương mại của Hanban. Không có giấy phép mở nào được xác minh. Bộ hiện có lấy theo Wiktionary (CC BY-SA 4.0) là lựa chọn rõ ràng nhất về chuỗi giấy phép, nhưng vẫn là dữ liệu cộng đồng.

## 2. Bộ dữ liệu cộng đồng trên GitHub

Số mục đếm ngày 2026-10-29 trên nhánh mặc định. Cột "Giấy phép" ghi theo tệp LICENSE hoặc README của repo. Cột "Độ tin cậy" là đánh giá về chuỗi nguồn và chất lượng.

| Nguồn | Giấy phép | Phạm vi/số lượng | Định dạng | Độ tin cậy | Ghi chú/URL |
| --- | --- | --- | --- | --- | --- |
| `ivankra/hsk30` (commit `4ff9e39`, push 2023-12-03) | MIT (code). README ghi dữ liệu "largely derived" từ `elkmovie/hsk30` và `shawkynasr/HSK-official-Query-System`, đều MIT | Chuẩn 2021: 11.092 từ (ID `Ln-nnnn` theo PDF), pinyin, POS, phồn thể, biến thể, khóa CEDICT; 3.000 chữ kèm cấp viết; ~573 điểm ngữ pháp | CSV (~0,95 MB) | Cao nhất cho 2021: kiểm tra chéo OCR Pleco với CSDL web của CTI | Không có nghĩa từ, nên tránh được vấn đề CEDICT. [repo](https://github.com/ivankra/hsk30) |
| `elkmovie/hsk30` (commit `7f3d4fd`, 2023-11) | MIT, "Copyright (c) 2021 Pleco Inc." | 2021: `wordlist.txt` 11.103 dòng, `charlist.txt` 4.214 dòng (có tiêu đề/nhóm) | TXT | OCR bằng Pleco từ PDF MOE; chỉ có chữ, không có pinyin | [repo](https://github.com/elkmovie/hsk30) |
| `krmanik/HSK-3.0` (commit `d30e970`, push 2026-10-24) | `License.md` liệt kê nhiều nguồn: CC-CEDICT (CC BY-SA 4.0), SUBTLEX-CH (CC BY-SA 4.0), danh sách Pleco (MIT), "HSK 3.0 word lists — Mani, CC BY-SA 4.0"; BCT/YCT chỉ ghi chinesetest.cn. GitHub: NOASSERTION | 2021: từ 500/771/973/1.000/1.071/1.140/5.636, chữ 300×6 + 1.200, ngữ pháp TXT. 2025: từ 300/204/507/1.019/1.638/1.815/5.622, chữ 246/125/284/441/431/413/1.148, ngữ pháp JSON 593 mục. Còn có thư mục `Audio/*.mp3` | TXT, TSV, JSON, XLSX, MP3 | Trung bình: dữ liệu 2025 lệch vài mục so với PDF (có thể do tách biến thể), ngữ pháp OCR; nguồn audio không ghi | Bộ có cấu trúc ngữ pháp 2025 duy nhất tìm thấy. Phần có nghĩa CEDICT theo BY-SA. **Không dùng audio.** [repo](https://github.com/krmanik/HSK-3.0), [License.md](https://github.com/krmanik/HSK-3.0/blob/main/License.md) |
| `drkameleon/complete-hsk-vocabulary` (commit `7ac65bf`, push 2026-03-27) | LICENSE MIT, nhưng nghĩa từ lấy từ CC-CEDICT (BY-SA). README ghi nguồn: clem109 (2.0), elkmovie (3.0), MDBG, makemeahanzi, krmanik, SUBTLEX-CH, HanLP | `old` 150/147/298/598/1.298/2.500 = 4.991; `new` (2021) 506/750/953/972/1.059/1.123/5.606 = 10.969; `newest` ("2026 syllabus") 294/197/487/972/1.547/1.684/4.876 = 10.057 | JSON (`complete.json` 9,8 MB; bản min 3,0 MB) | Trung bình: mỗi từ chỉ ghi một cấp thấp nhất nên số theo cấp không khớp chuẩn; nhánh 2.0 kế thừa chuỗi clem109 → gigacool | Hữu ích để xem trước schema (pinyin, POS, classifier, tần suất). Không dùng làm nguồn cấp độ. [repo](https://github.com/drkameleon/complete-hsk-vocabulary) |
| `clem109/hsk-vocabulary` (push 2019-10-29) | MIT | HSK 2.0 kèm vài câu ví dụ | JSON | Thấp: nguồn là `gigacool/hanyu-shuiping-kaoshi`, có header CEDICT kèm điều kiện BY-NC (xem tài liệu cũ) | **Tránh.** [repo](https://github.com/clem109/hsk-vocabulary) |
| `glxxyz/hskhsk.com` (push 2023-05-01) | MIT (code, © 2020 Alan Davies) | Danh sách HSK 2.0 (2012) và công cụ; thư mục `data/lists` | TXT/HTML | Giấy phép riêng cho phần dữ liệu và nghĩa **chưa xác minh** | Chỉ để tham khảo đối chiếu. [repo](https://github.com/glxxyz/hskhsk.com) |
| `shawkynasr/HSK-official-Query-System` | MIT | Bản sao CSDL tra cứu chuẩn 2021 trên web CTI | — | **chưa xác minh** chi tiết | Được ivankra dùng làm nguồn pinyin/POS. [repo](https://github.com/shawkynasr/HSK-official-Query-System) |

Lưu ý chung: gắn MIT vào danh sách sao chép từ văn bản nhà nước không tự tạo ra quyền. Nghĩa từ CEDICT nằm trong repo MIT vẫn chịu BY-SA.

## 3. Từ điển và nghĩa tiếng Việt

| Nguồn | Giấy phép | Phạm vi/số lượng | Định dạng | Độ tin cậy | Ghi chú/URL |
| --- | --- | --- | --- | --- | --- |
| CC-CEDICT (MDBG) | CC BY-SA 4.0. Dùng được cả thương mại, với điều kiện ghi nguồn và chia sẻ phần cải tiến theo cùng giấy phép | 125.331 mục (trang MDBG ngày 2026-10-29), nghĩa tiếng Anh | `cedict_1_0_ts_utf-8_mdbg.txt.gz` (~4,0 MB) hoặc `.zip`; mỗi dòng `Phồn Giản [pin1 yin1] /nghĩa/` | Cao, cộng đồng biên tập liên tục | Repo đã ghim SHA-256. [MDBG](https://www.mdbg.net/chinese/dictionary?page=cc-cedict), [tệp gz](https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz) |
| CVDICT (ph0ngp) — Trung–Việt | **chưa xác minh**: `github.com/ph0ngp/CVDICT` và tài khoản `ph0ngp` trả 404 ngày 2026-10-29 | **chưa xác minh** | — | Không đánh giá được | Được `phucbm/xue-hanzi` dẫn làm nguồn nghĩa tiếng Việt. **Không nhập** khi chưa có LICENSE gốc. [xue-hanzi](https://github.com/phucbm/xue-hanzi) |
| Wiktionary tiếng Việt / tiếng Anh | Văn bản theo CC BY-SA 4.0 (kèm GFDL) | Phủ HSK **chưa xác minh** | Wikitext/API | Trung bình, cộng đồng | Dùng được như bộ HSK 2.0 hiện có (ghim revision). [Wiktionary:Copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights) |
| Unihan `kVietnamese` | Unicode License v3 | 8.306 ký tự có giá trị (Unicode 18.0, Unihan_Readings 2026-07-31) | TSV trong `Unihan.zip` (8,3 MB) | **Thấp cho mục đích Hán-Việt** | Xem §4: chỉ phủ 2.111/3.000 chữ HSK 3.0 và có giá trị kiểu Nôm (們 → "món"). [UAX #38](https://www.unicode.org/reports/tr38/) |
| Từ điển Thiều Chửu, Hán Việt tự điển | Có thể đã hết thời hạn bảo hộ (tác giả mất 1954), nhưng bản số hóa có giấy phép riêng | — | — | **chưa xác minh** | Cần luật sư hoặc bản số hóa có giấy phép rõ trước khi dùng |

**Nghĩa vụ ShareAlike.** Nếu bảng từ vựng chứa "toàn bộ hoặc phần đáng kể" CC-CEDICT, theo §4 của CC BY-SA 4.0, chính CSDL đó (không phải từng mục) trở thành Adapted Material, và khi chia sẻ phải tuân thủ §3(a)/(b). [Legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en). Áp dụng thực tế:

- JSON gửi tới trình duyệt cũng là "chia sẻ". Phải kèm ghi công, liên kết giấy phép và mô tả thay đổi, như `data/hsk2-provenance.json` đang làm.
- Bản dịch tiếng Việt làm từ nghĩa CEDICT là phái sinh, phải phát hành theo CC BY-SA 4.0.
- Nghĩa tiếng Việt do giáo viên viết độc lập (không dịch từ CEDICT) có thể giữ giấy phép riêng của dự án. Khi đó cần lưu chúng ở cột hoặc bảng riêng có trường `license` riêng.
- Mã nguồn app không bị BY-SA lây sang. Chỉ dữ liệu và CSDL chứa dữ liệu đó bị ràng buộc.

## 4. Dữ liệu chữ Hán

| Nguồn | Giấy phép | Phạm vi | Định dạng | Độ tin cậy | Ghi chú/URL |
| --- | --- | --- | --- | --- | --- |
| Unicode Unihan (18.0) | Unicode License v3: cho phép dùng, sửa, bán, với điều kiện giữ thông báo bản quyền | Toàn bộ CJK. Trường hữu ích: `kMandarin` (informative, pinyin thông dụng), `kTotalStrokes` (informative), `kDefinition` (provisional, tiếng Anh), `kVietnamese` (provisional), `kRSUnicode`, `kSimplifiedVariant` | `Unihan.zip` 8,3 MB, SHA-256 `4c93ea9c…d43e` (tải ngày 2026-10-29) | Cao cho `kMandarin` và `kTotalStrokes`. UAX #38 nói rõ `kMandarin` phục vụ collation và có thể không khớp từ điển | [license.txt](https://www.unicode.org/license.txt), [UAX #38](https://www.unicode.org/reports/tr38/) |
| Make Me a Hanzi (commit `bddc96d`) | `graphics.txt` và `svgs*`: **Arphic Public License** (dẫn xuất từ font Arphic PL KaitiM GB / UKai). `dictionary.txt` (từ Unihan, CJKlib): **LGPL-3.0+** | 9.574 chữ (đếm `dictionary.txt` ngày 2026-10-29); nét SVG và trung tuyến; phân tích bộ thủ và từ nguyên | JSON-lines (`graphics.txt` 30,8 MB, `dictionary.txt` 2,6 MB) | Cao, dùng rộng rãi | [COPYING](https://github.com/skishore/makemeahanzi/blob/master/COPYING), [README](https://github.com/skishore/makemeahanzi) |
| `hanzi-writer-data` (npm 2.0.1, commit `68d10a4`) | Arphic Public License (kèm `ARPHICPL.TXT`) | Một tệp JSON mỗi chữ, dẫn xuất MMAH | JSON qua npm/jsDelivr | Cao | `curriculum.js` đã ghi "MIT; data Arphic". [README](https://github.com/chanind/hanzi-writer-data) |
| CJKVI IDS | `ids.txt` theo điều khoản CHISE. Dữ liệu khác: **GPLv2** | IDS cho toàn bộ CJK | TXT | Cao về nội dung | Copyleft. Chỉ nên dùng ở bước phân tích offline, không ship trong app nếu chưa có ý kiến pháp lý. [README](https://github.com/cjkvi/cjkvi-ids) |

Arphic PL giống GPL áp cho font: được sao chép, sửa và phân phối, kể cả có thu phí, với điều kiện giữ nguyên `ARPHICPL.TXT` và phân phối bản sửa theo cùng điều khoản. Phần không dẫn xuất từ font, nếu chỉ "gộp chung" (mere aggregation), thì không bị ràng buộc. [ARPHICPL.TXT](https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/ARPHICPL.TXT)

**Kiểm tra `kVietnamese`** (ngày 2026-10-29, 3.000 chữ trong `ivankra/hsk30-chars.csv`): 1.478 chữ có giá trị trực tiếp, 633 chữ chỉ có qua dạng phồn thể (ví dụ 学 không có, 學 = "học"), **889 chữ thiếu hoàn toàn**, trong đó có 爱/愛, 这/這, 说, 谁, 做. Hán-Việt vì vậy cần nguồn khác hoặc giáo viên nhập, với `kVietnamese` chỉ là gợi ý ban đầu.

## 5. Âm thanh mở

| Nguồn | Giấy phép | Phạm vi | Định dạng | Độ tin cậy | Ghi chú/URL |
| --- | --- | --- | --- | --- | --- |
| `hugolpz/audio-cmn` | README: "CC-by-sa". Âm tiết: Chen Wang. Từ: Yue Tan (Shtooka `cmn-caen-tan`). **Phiên bản CC chưa xác minh**: readme Shtooka không truy cập được (lỗi DNS) | 1.707 âm tiết có thanh; khoảng 8.000 từ và chữ theo HSK 2000; README nêu 582 từ HSK 2012 không có audio | MP3 (18k/24k/64k/96k) | Giọng người thật, lâu năm | Ghi công từng giọng đọc. [repo](https://github.com/hugolpz/audio-cmn) |
| Lingua Libre / Wikimedia Commons | Mặc định CC BY-SA 4.0, nhưng phải kiểm tra từng tệp trên trang Commons | Không đều theo từ | OGG/WAV | Trung bình, nhiều người đọc | [Lingua Libre](https://en.wikipedia.org/wiki/Lingua_Libre) |
| Tatoeba audio | **Giấy phép do từng người đóng góp chọn.** Trường license trống thì "may not reuse the audio outside the Tatoeba project" | Câu tiếng Trung có audio (số lượng chưa đếm) | `sentences_with_audio.tar.bz2` (id câu, id audio, username, license, attribution URL) | Trung bình | [Downloads](https://tatoeba.org/en/downloads) |
| Forvo | Không mở (điều khoản thương mại) | — | — | — | **Tránh** |
| `krmanik/HSK-3.0/New HSK (2025)/Audio` | Không ghi nguồn hay giấy phép | Theo từ HSK 2025 | MP3 | Không rõ | **Tránh** |
| Đề mẫu chính thức (`HSK3.0.zip` trên CTI) | Không có giấy phép tái phân phối | Đề và audio mẫu | ZIP | Chính thức | Chỉ liên kết, không sao chép (xem tài liệu cũ) |

## 6. Câu ví dụ

| Nguồn | Giấy phép | Ghi chú/URL |
| --- | --- | --- |
| Tatoeba | Câu theo CC BY 2.0 FR, một phần có thêm CC0 1.0 (export "Sentences (CC0)"); export cập nhật hằng tuần | Cần ghi công theo từng câu (id, người đóng góp). Bản dịch tiếng Việt có ít. Chất lượng không đều nên giáo viên phải duyệt. [Downloads](https://tatoeba.org/en/downloads) |
| Câu trong PDF chính thức (ví dụ ngữ pháp GF 0025) | Như §1.4, chưa rõ | Không sao chép hàng loạt |
| Câu do giáo viên dự án viết | Thuộc dự án | Ưu tiên; ghi `source_url` là trang nội bộ hoặc người biên soạn |

## 7. Điểm ngữ pháp

- **Chuẩn 2021 (572 điểm):** có `ivankra/hsk30/hsk30-grammar.csv` (cột No, Level, Group, Category, Details, Content; 573 dòng, cấp 2 = 82) và `krmanik/HSK-3.0/New HSK (2021)/HSK Grammar/*.txt` (OCR kèm ví dụ, mã dạng 【二01】; còn lỗi OCR và đánh dấu không đều). Chưa có bộ nào được xác nhận khớp đủ 572.
- **Đề cương 2025:** `krmanik/HSK-3.0/New HSK (2025)/HSK Grammar/json/*.json` có các trường 类别, 类别名称, 细目, 语法内容, tổng 593 mục. Số này **chưa xác minh** với PDF (PDF dùng bảng không đánh số).
- Không có giải thích tiếng Việt mở nào. Phần giải thích và ví dụ phải do giáo viên viết, lưu ở `content_items(kind='grammar')`.

## 8. Khuyến nghị nhập dữ liệu

**Ưu tiên (theo thứ tự):**

1. Danh mục từ **HSK 3.0 đề cương 2025** (PDF CTI, có văn bản): trích bảng 序号/等级/词语/拼音/词性. Đối chiếu với `krmanik` (2025) và với chuẩn 2021 của `ivankra` để đánh dấu từ đổi cấp.
2. Danh mục **GF 0025-2021** từ `ivankra/hsk30` (ghim commit), đối chiếu số lượng với §1.1.
3. Nghĩa tiếng Anh từ **CC-CEDICT** (đã có quy trình). Pinyin chữ và số nét từ **Unihan**. Nét viết từ **hanzi-writer-data**, nạp động qua CDN có ghim phiên bản hoặc tự host kèm `ARPHICPL.TXT`.
4. Audio âm tiết từ `audio-cmn` (sau khi xác minh phiên bản CC BY-SA). Audio từ chỉ lấy khi có license từng tệp.
5. Nghĩa tiếng Việt, Hán-Việt, giải thích ngữ pháp và câu ví dụ: **giáo viên biên soạn** qua quy trình duyệt hiện có.

**Tránh:** chuỗi gigacool/clem109 (NC), nhánh 2.0 và cấp độ của drkameleon, audio krmanik, Forvo, CVDICT (cho đến khi có LICENSE), CJKVI IDS trong bản phát hành, sao chép PDF hay đề mẫu chính thức.

**Nhãn trong app** (cột `syllabus` của `content_items` dài tối đa 120 ký tự):

| Dữ liệu | `syllabus` đề xuất | Trạng thái ban đầu |
| --- | --- | --- |
| Đề cương thi 2025 | `HSK 3.0 — HSK考试大纲 2025-11 (CLEC), danh mục tham chiếu` | `draft` → giáo viên duyệt cấp và pinyin → `published` |
| Chuẩn 2021 | `HSK 3.0 — GF 0025-2021 (OCR cộng đồng)` | `draft` |
| HSK 2.0 hiện có | giữ `HSK 2.0 (community reference; not HSK 3.0)` | `draft` |
| Nghĩa Việt, ví dụ | theo mục cha, kèm `license` riêng | `draft` → `in_review` → `published` |

Không ghi "chính thức" hay "đã kiểm duyệt" cho dữ liệu trích hoặc OCR. Chỉ có thể nói "trích từ đề cương do CLEC phát hành, chưa giáo viên duyệt". Cấp dùng quy ước hiện có `'1'..'6','7-9'`. Không chia nhỏ 7–9.

## 9. Cách nhập đề xuất

**Quy trình**, theo mẫu `scripts/import-reference.mjs`:

- Mỗi nguồn khai báo URL cố định: commit SHA của GitHub (`raw.githubusercontent.com/<repo>/<sha>/…`), revision Wiktionary, hoặc URL PDF kèm SHA-256 kỳ vọng. Lệch hash thì dừng.
- Tải về `.sources/` (đã có trong gitignore). Xuất JSON đã chuẩn hóa vào `data/` kèm một tệp provenance (`format`, `syllabus`, `license`, `attribution`, `modifications`, `sources[]` với hash).
- Thêm bước đối chiếu tự động: số mục theo cấp phải khớp bảng §1.1/§1.2. Liệt kê riêng mục lệch hoặc thiếu để biên tập, không tự sửa.
- Không gọi mạng trong build. Bước nhập chạy thủ công, kết quả commit sau khi duyệt.

**Phác thảo schema PostgreSQL** (mới là đề xuất, chưa viết migration):

```sql
create table public.data_sources (
  id text primary key,                 -- 'cti-hsk-syllabus-2025', 'cc-cedict-2026-10-28'
  title text not null,
  url text not null,                   -- PDF MOE chỉ có http://; content_items.source_url hiện bắt buộc https
  revision text not null,              -- commit SHA / oldid / ngày tải
  sha256 text,
  license text not null,               -- SPDX hoặc mô tả: 'CC-BY-SA-4.0', 'Unicode-3.0', 'Arphic-1999', 'unclear'
  attribution text not null,
  share_alike boolean not null default false,
  retrieved_at timestamptz not null
);
create table public.vocab_entries (
  id bigint generated always as identity primary key,
  syllabus text not null check (syllabus in ('HSK 2.0','HSK 3.0 (GF 0025-2021)','HSK 3.0 (CLEC 2025)')),
  level text not null check (level in ('1','2','3','4','5','6','7-9')),
  seq int,                              -- 序号 trong văn bản nguồn
  simplified text not null, traditional text, pinyin text not null, pos text,
  source_id text not null references public.data_sources(id),
  review_status text not null default 'draft' check (review_status in ('draft','in_review','published','rejected')),
  unique (syllabus, level, simplified, pinyin)
);
create table public.vocab_glosses (    -- tách theo ngôn ngữ và giấy phép
  entry_id bigint references public.vocab_entries(id) on delete cascade,
  lang text not null check (lang in ('en','vi')),
  gloss text not null, han_viet text,
  source_id text not null references public.data_sources(id),
  review_status text not null default 'draft'
);
create table public.hanzi_characters (
  hanzi text primary key, mandarin text, han_viet text, total_strokes int, radical text,
  read_level text, write_level text, syllabus text not null,
  source_ids text[] not null
);
create table public.grammar_points (
  id bigint generated always as identity primary key,
  syllabus text not null, level text not null, code text,  -- vd. 【二01】
  category text, subcategory text, content_zh text not null,
  explanation_vi text, source_id text not null references public.data_sources(id),
  review_status text not null default 'draft'
);
```

Một từ có thể có nhiều dòng (một dòng cho mỗi `syllabus`), nhờ đó so sánh được 2.0, 2021 và 2025 mà không ghi đè lên nhau. RLS nên giống `content_items`: đọc công khai mục `published`, chỉ giáo viên/admin được ghi.

**JSON tĩnh hay DB.** Dữ liệu từ đã chuẩn hóa nhỏ: CSV 2021 khoảng 0,95 MB, `data/hsk2-reference.json` hiện tại 1,6 MB, nén gzip/brotli còn ít hơn nhiều. Vì vậy có thể ship tĩnh theo cấp (tách tệp `level-1.json` … để PWA cache dần). DB cần cho nghĩa Việt đang biên tập, quy trình duyệt và tìm kiếm. Dữ liệu nặng nên nạp theo nhu cầu, không đưa vào precache của service worker: nét viết (MMAH 30,8 MB, hanzi-writer-data một tệp mỗi chữ), audio, toàn bộ CEDICT (~4 MB gz, 125k mục; chỉ giữ các mục khớp danh mục HSK).

**Nghĩa vụ ghi công** (hiển thị ở trang "Nguồn dữ liệu" của app và trong tệp provenance):

- CC-CEDICT: "CC-CEDICT contributors, MDBG", liên kết CC BY-SA 4.0, mô tả thay đổi. Mọi bảng hoặc tệp chứa nó phải phát hành theo BY-SA.
- Wiktionary: tên cộng đồng tác giả, liên kết lịch sử revision, BY-SA 4.0.
- Unihan: kèm thông báo Unicode License v3.
- MMAH/hanzi-writer-data: kèm `ARPHICPL.TXT`. `dictionary.txt` kèm LGPL.
- Audio CC BY-SA: tên người đọc từng tệp. Tatoeba: id câu, tác giả, giấy phép từng câu hoặc từng audio.
- Văn bản chính thức: "Nguồn: 《HSK考试大纲》(中外语言交流合作中心, 2025-11)" hoặc "GF 0025-2021, 教育部/国家语委", kèm URL. Không gắn giấy phép mở cho phần này.

## 10. Câu hỏi mở và rủi ro

- **Pháp lý:** quyền tái phân phối danh mục từ, chữ và ngữ pháp của GF 0025-2021 và đề cương 2025 chưa rõ (§1.4). Nên hỏi ý kiến luật sư hoặc CTI/CLEC trước khi phát hành thương mại.
- **Đề cương nào áp cho kỳ thi nào:** CTI công bố ngày khai thi 2026-12-13 nhưng chưa thấy văn bản gốc về lộ trình dừng 2.0 hay áp dụng cho từng cấp.
- **Lệch số lượng:** krmanik 2025 (204/507/1.019… so với 200/500/1.000…), drkameleon (gộp cấp), ivankra ngữ pháp (cấp 2 có 82 mục), HSK 2.0 (4.997 so với 5.000). Mọi lệch phải được liệt kê, không được làm tròn.
- **OCR:** chuẩn 2021 chỉ có bản quét. Lỗi chữ hoặc pinyin trong các bộ cộng đồng có thể còn, nên cần lấy mẫu và kiểm tra thủ công.
- **Nghĩa tiếng Việt:** chưa có nguồn mở xác minh được. Cần giáo viên dịch và duyệt, đồng thời quyết định nghĩa Việt viết độc lập hay phái sinh từ CEDICT (ảnh hưởng tới giấy phép).
- **Hán-Việt:** `kVietnamese` thiếu khoảng 30% chữ HSK và lẫn âm Nôm. Cần nguồn có giấy phép hoặc giáo viên nhập.
- **Audio:** phiên bản CC của audio-cmn chưa xác minh. Giọng HSK 2000 không phủ đủ từ mới.
- **CVDICT:** repo không còn truy cập được. Không dùng bản sao không rõ nguồn.

## 11. Danh sách nguồn

- MOE, thông báo GF 0025-2021: http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html
- PDF GF 0025-2021: http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/W020210329527301787356.pdf
- Bản chép chỉ tiêu định lượng (thứ cấp): https://www.tuttocina.it/HSK/NuovoHSK-lineamenti.pdf
- CTI syllabus: https://www.chinesetest.cn/syllabus
- 《HSK考试大纲》 2025-11: https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf
- CTI, thông báo khai thi HSK 3.0: https://admin.chinesetest.cn/gonewcontent.do?id=51336883
- Luật Bản quyền Trung Quốc 2020 (WIPO Lex): https://www.wipo.int/wipolex/zh/legislation/details/21065
- Đại học Genève, danh sách HSK 2.0: https://www.unige.ch/ic/hsk/vocabulaire
- Nguồn thứ cấp về lịch thi: https://studycli.org/zh-CN/hsk/hsk-levels-guide/
- ivankra/hsk30: https://github.com/ivankra/hsk30
- elkmovie/hsk30: https://github.com/elkmovie/hsk30
- krmanik/HSK-3.0: https://github.com/krmanik/HSK-3.0
- drkameleon/complete-hsk-vocabulary: https://github.com/drkameleon/complete-hsk-vocabulary
- clem109/hsk-vocabulary: https://github.com/clem109/hsk-vocabulary
- glxxyz/hskhsk.com: https://github.com/glxxyz/hskhsk.com
- shawkynasr/HSK-official-Query-System: https://github.com/shawkynasr/HSK-official-Query-System
- CC-CEDICT (MDBG): https://www.mdbg.net/chinese/dictionary?page=cc-cedict
- CC BY-SA 4.0 legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
- Wiktionary copyrights: https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- phucbm/xue-hanzi (dẫn CVDICT): https://github.com/phucbm/xue-hanzi
- Unicode License v3: https://www.unicode.org/license.txt
- UAX #38 Unihan: https://www.unicode.org/reports/tr38/
- Make Me a Hanzi: https://github.com/skishore/makemeahanzi
- hanzi-writer-data: https://github.com/chanind/hanzi-writer-data
- CJKVI IDS: https://github.com/cjkvi/cjkvi-ids
- audio-cmn: https://github.com/hugolpz/audio-cmn
- Lingua Libre: https://en.wikipedia.org/wiki/Lingua_Libre
- Tatoeba downloads: https://tatoeba.org/en/downloads

## 12. Đã triển khai: danh mục từ HSK 3.0 (đề cương 2025)

Đây là hạng mục 1 của §8. Chỉ gồm từ, cấp, pinyin và từ loại; không có nghĩa, không đưa PDF hay danh mục vào repo hoặc `dist/`.

| Thành phần | Tệp |
| --- | --- |
| Trích bảng 词汇大纲 theo tọa độ cột (PyMuPDF) | `scripts/extract-hsk3-vocabulary.py` |
| Chuẩn hóa, kiểm tra 序号 liên tục và số mục từng cấp | `scripts/hsk3-vocabulary.mjs`, `tests/vocabulary.test.mjs` |
| Tải PDF, so SHA-256, trích, ghi `.sources/hsk3-2025-vocabulary.json` | `scripts/import-hsk3.mjs` (`npm run data:import-hsk3`) |
| Bảng `data_sources`, `vocab_entries`, RPC `review_vocab_entries` | `supabase/migrations/202610290004_reference_vocabulary.sql` |
| Nạp vào database, không ghi đè mục đã duyệt | `scripts/seed-vocabulary.mjs` (`npm run db:seed-vocabulary`), `tests/vocabulary-database.mjs` |

**Kết quả kiểm chứng ngày 2026-10-29:** 11.000 mục, 序号 1–11.000 liên tục, đúng 300/200/500/1.000/1.600/1.800/5.600. Có 102 mục mang cấp phụ (ví dụ `好 1（2）（4）`: cấp 1, nghĩa trong ngoặc ở cấp 2 và 4). 495 mục không ghi từ loại (cụm như 不客气). Đã nạp đủ vào PostgreSQL 16 tạm thời; nạp lại lần hai không thay đổi gì.

**Lưu ý khi trích:** `pdftotext` ghép sai pinyin sang dòng khác vì đường chân chữ pinyin cao hơn khoảng 3pt. Watermark "汉考国际" (48pt, xoay) bị loại theo cỡ chữ và hướng, vì "国际" cũng là một từ trong danh mục. Một ô 等级 dài (序号 895 像 `3（4）（7-9）`) tràn dấu `）` sang ô 词语 và đã được sửa tự động.

**Đối chiếu với `krmanik/HSK-3.0`** (commit `d30e970`): sau khi tính đến hai khác biệt quy ước của bộ đó, chỉ còn 6 khác biệt:
- Bộ đó giữ số đánh dấu đồng hình trong từ (`本1`).
- Bộ đó liệt kê lại từ ở cả cấp phụ, nên có 204 mục ở cấp 2.

Cả 6 khác biệt đều là dạng có phần tùy chọn trong ngoặc: `没（有）`, `有（一）点儿`, `有时（候）`, `差（一）点儿`, `要不（然）`, `凡（是）`. Ảnh render từ PDF 2025 cho thấy bản chính thức ghi `没有`, `有点儿`, `凡是` không có ngoặc. Bản trích của dự án khớp PDF; các dạng có ngoặc nhiều khả năng lấy từ chuẩn 2021.

**Quy trình:**

1. Cài Python 3 và `pip install pymupdf` (chỉ cần cho bước trích; CI không chạy bước này). Có thể đặt biến `PYTHON` để chọn trình thông dịch.
2. `npm run data:import-hsk3`: dừng nếu PDF đổi hash, còn chữ không gán được vào ô, hoặc số mục lệch đề cương.
3. Áp dụng migration `202610290004_reference_vocabulary.sql` qua Supabase migration integration/MCP/CLI. `vercel-build` không chạy DDL. `npm run db:migrate` dành cho cài đặt mới có ledger Hanzi riêng.
4. `npm run db:seed-vocabulary` cần `POSTGRES_URL` của đúng project (cùng kiểm tra với `db:migrate`). Mọi mục vào ở trạng thái `draft`.
5. Học viên chỉ đọc được mục `published`. Giáo viên và admin đọc được tất cả; khách không đọc được. Chỉ admin được duyệt, qua `select public.review_vocab_entries('HSK 3.0 (CLEC 2025)', array[1,2,3], 'published')`. Chưa có giao diện duyệt hay màn học dùng bảng này.

Khi nạp lại, mục `draft` được cập nhật. Mục đã duyệt giữ nguyên, còn 序号 có khác biệt được in ra để biên tập xem lại. Nội dung nguồn đổi SHA-256 cần ID nguồn mới; không thay nguồn gốc của mục đã duyệt. Bản phát hành chỉ đưa công cụ và fixture kiểm thử vào Git, chưa xác nhận đã nạp danh mục 11.000 mục vào project production; chưa có giao diện học dùng bảng này.
