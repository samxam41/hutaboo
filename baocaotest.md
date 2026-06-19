# Báo cáo kiểm thử ứng dụng HuTaBoo

Báo cáo này đánh giá khả năng kiểm thử của dự án HuTaBoo theo yêu cầu kiểm thử học phần AC3030, tập trung **CHỈ** vào 2 chức năng chính: **Tìm kiếm sách** và **Đăng review**.

---

## 9.1. Mục tiêu kiểm thử

Hoạt động kiểm thử trong dự án HuTaBoo nhằm xác nhận tính đúng đắn và tin cậy của hai chức năng nghiệp vụ cốt lõi:
- **Chức năng Tìm kiếm sách**: Đảm bảo các logic lọc, tìm kiếm theo tên tác phẩm, tác giả, thể loại, từ khóa gần đúng, không phân biệt hoa thường và các trường hợp biên trả về dữ liệu chính xác trên giao diện và tầng cơ sở dữ liệu.
- **Chức năng Đăng Review**: Xác minh các điều kiện validate dữ liệu đầu vào của bài viết (tiêu đề, tác giả, rating sao, nội dung dài ngắn), việc ghi dữ liệu vào cơ sở dữ liệu và hiển thị cập nhật trực quan trên giao diện người dùng.

### Các layer kiểm thử tập trung:
1. **Domain/Model Layer**: Kiểm tra các logic khởi tạo thực thể sách, bài review và các hàm validate dữ liệu đầu vào nghiệp vụ của lớp `Review`.
2. **Repository Layer**: Đảm bảo các hàm thực thi truy vấn SQL (MySQL & SQLite) của lớp `BookRepository` và `ReviewRepository` lấy ra danh sách sách tìm kiếm hoặc chèn/xóa dữ liệu review chính xác.
3. **UI/E2E Browser Layer**: Kiểm thử giao diện tự động bằng Playwright giả lập hành vi gõ từ khóa tìm kiếm và click điền form đăng bài review thực tế của người dùng trên trình duyệt Chromium.

### Vì sao phần lớn test nên nằm ở Domain/Service/Repository layer?
- **Độ tin cậy và tốc độ**: Các bài test ở tầng logic nghiệp vụ không bị phụ thuộc vào giao diện (UI) hoặc sự thay đổi cấu trúc DOM, giúp chạy nhanh (chỉ mất vài phần trăm giây mỗi test) và cực kỳ ổn định.
- **Cô lập lỗi chính xác**: Khi có lỗi xảy ra (ví dụ: tính sai điểm đánh giá trung bình), unit test ở tầng Repository hoặc Model sẽ chỉ ngay ra hàm nào bị lỗi mà không bị che khuất bởi lỗi hiển thị hoặc lỗi mạng.
- **Khả năng kiểm thử biên (Edge Cases)**: Dễ dàng giả lập các trường hợp biên đặc biệt (như dữ liệu trống, chuỗi ký tự lạ, lỗi kết nối DB) thông qua cơ chế Mocking.

### Những phần chưa kiểm thử được và lý do:
- **Kiểm thử E2E trực tiếp trên cửa sổ Electron App (Desktop shell)**: Chưa thể kiểm thử tự động trực tiếp trên Electron BrowserWindow do giới hạn của môi trường chạy test CLI tiêu chuẩn. Tuy nhiên, việc kiểm thử E2E bằng Playwright trên trình duyệt web chuẩn (`http://127.0.0.1:3000`) mang lại hiệu quả tương đương 100% đối với hai chức năng tìm kiếm sách và đăng review.

---

## 9.2. Công cụ kiểm thử

Dưới đây là các công cụ kiểm thử thực tế được áp dụng trong dự án:

| Loại kiểm thử    | Công cụ                      | Lệnh chạy | Ghi chú |
| ---------------- | ---------------------------- | --------- | ------- |
| **Unit test**        | Jest                         | `npm test` hoặc `npx jest` | Sử dụng Mock database pool cho phần repository. |
| **Integration test** | Jest & Supertest             | `npm test` hoặc `npx jest` | Sử dụng database test thực tế để kiểm tra dữ liệu. |
| **Coverage**         | Jest built-in Coverage       | `npx jest --coverage` | Xuất báo cáo độ bao phủ mã nguồn dạng văn bản. |
| **UI/E2E test**      | Playwright                   | `npx playwright test` | Khởi chạy headless browser để kiểm tra giao diện và luồng người dùng. |

---

## 9.3. Danh sách test case

Dự án thiết lập đúng **20 test cases** chuẩn hóa tập trung hoàn toàn vào chức năng Tìm kiếm và Đăng review:

| TC ID | Tên test case | Layer | Hàm/lớp được test | Dữ liệu vào | Kết quả mong đợi | Người phụ trách | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **TC-SEARCH-01** | Tìm kiếm theo tên tác phẩm | Repository | `BookRepository.searchBooks` | `keyword = "Doraemon"` | Trả về thông tin sách có tên "Doraemon" | Ngô Phương Thanh | PASS |
| **TC-SEARCH-02** | Tìm kiếm theo tên tác giả | Repository | `BookRepository.searchBooks` | `keyword = "Fujiko"` | Trả về sách của tác giả "Fujiko F. Fujio" | Ngô Phương Thanh | PASS |
| **TC-SEARCH-03** | Tìm kiếm theo thể loại | Repository | `BookRepository.searchBooks` | `keyword = "Manga"` | Trả về danh sách sách có tag chứa "Manga" | Ngô Phương Thanh | PASS |
| **TC-SEARCH-04** | Tìm kiếm kết hợp nhiều điều kiện | Repository | `BookRepository.searchBooks` | `keyword = "Doraemon"` (khớp cả tên và tag) | Trả về đúng cuốn sách có tên "Doraemon" và tag "Manga" | Ngô Phương Thanh | PASS |
| **TC-SEARCH-05** | Tìm kiếm không có kết quả | Repository | `BookRepository.searchBooks` | `keyword = "NonexistentBookXYZ"` | Trả về danh sách rỗng (mảng length = 0) | Ngô Phương Thanh | PASS |
| **TC-SEARCH-06** | Tìm kiếm từ khóa gần đúng | Repository | `BookRepository.searchBooks` | `keyword = "Dora"` | Trả về đúng sách "Doraemon" (khớp một phần) | Ngô Phương Thanh | PASS |
| **TC-SEARCH-07** | Tìm kiếm không phân biệt chữ hoa/chữ thường | Repository | `BookRepository.searchBooks` | `keyword = "dOrAeMoN"` | Trả về sách "Doraemon" bình thường | Ngô Phương Thanh | PASS |
| **TC-SEARCH-08** | Tìm kiếm khi bỏ trống từ khóa | Repository | `BookRepository.searchBooks` | `keyword = ""` (hoặc khoảng trắng) | Trả về toàn bộ danh sách sách hiện có | Ngô Phương Thanh | PASS |
| **TC-SEARCH-09** | Lọc kết quả sau khi tìm kiếm trên UI | UI/E2E | Playwright | Điền "Doraemon" vào `#book-search-input` | Danh sách trên UI tự động cập nhật chỉ hiển thị card "Doraemon" | Ngô Phương Thanh | PASS |
| **TC-SEARCH-10** | Kiểm tra dữ liệu Book trả về đúng định dạng | Domain/Model | Lớp `Book` | Khởi tạo đối tượng Book với các thuộc tính cụ thể | Các trường id, title, author, tags, rating được gán chính xác | Ngô Phương Thanh | PASS |
| **TC-REVIEW-01** | Tạo review hợp lệ | Domain/Model | Hàm `Review.validate` | Review đầy đủ title, author, rating 5 sao, content dài | Trả về `null` (không có lỗi dữ liệu) | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-02** | Validate tiêu đề review không được trống | Domain/Model | Hàm `Review.validate` | `bookTitle = ""` | Trả về lỗi: `"Tên tác phẩm không được để trống"` | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-03** | Validate nội dung review phải tối thiểu 5 ký tự | Domain/Model | Hàm `Review.validate` | `content = "Cool"` | Trả về lỗi: `"Nội dung review phải tối thiểu 5 ký tự"` | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-04** | Validate đánh giá sao từ 1 đến 5 sao | Domain/Model | Hàm `Review.validate` | `rating = 6` hoặc `rating = 0` | Trả về lỗi: `"Đánh giá phải từ 1 đến 5 sao"` | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-05** | Review thiếu dữ liệu bắt buộc (tên tác giả) | Domain/Model | Hàm `Review.validate` | `bookAuthor = " "` | Trả về lỗi: `"Tên tác giả không được để trống"` | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-06** | Review có nội dung quá ngắn | Domain/Model | Hàm `Review.validate` | `content = "Hay"` | Trả về lỗi: `"Nội dung review phải tối thiểu 5 ký tự"` | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-07** | Review có nội dung hợp lệ | Domain/Model | Lớp `Review` | Khởi tạo đối tượng Review đầy đủ thuộc tính | Các thuộc tính reviewId, content, rating được ánh xạ đúng | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-08** | Lưu review vào database | Repository | `ReviewRepository.create` | ID user, ID sách, rating, content, categories list | Chèn dữ liệu thành công vào DB và trả về insertId | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-09** | Cập nhật danh sách review sau khi đăng trên UI | UI/E2E | Playwright | Điền form modal viết review sách mới và bấm submit | Modal đóng lại và card review mới xuất hiện trên trang Reviews | Nguyễn Thu Hường | PASS |
| **TC-REVIEW-10** | Xóa review hoặc xử lý lỗi khi thao tác review | Repository | `ReviewRepository.delete` | ID review: `50` | Xóa dữ liệu review trong DB và xóa tệp ảnh liên quan trên ổ đĩa | Nguyễn Thu Hường | PASS |

---

## Nhóm Search Test

### TC-SEARCH-01 đến TC-SEARCH-10
Nhóm test này tập trung kiểm thử toàn diện chức năng tìm kiếm sách:
- **Từ TC-SEARCH-01 đến TC-SEARCH-08**: Các unit test trong repository kiểm tra câu lệnh truy vấn SQL hoạt động chính xác với các điều kiện đầu vào của keyword (tên, tác giả, tag thể loại, chữ hoa chữ thường, tìm kiếm gần đúng và từ khóa rỗng).
- **TC-SEARCH-09**: Kiểm thử E2E giao diện người dùng, đảm bảo thanh tìm kiếm tự động lọc và cập nhật danh sách sách trực quan trên màn hình trong thời gian thực.
- **TC-SEARCH-10**: Kiểm thử tầng Domain (Model) đảm bảo cấu trúc thực thể sách (`Book`) luôn ánh xạ đúng các kiểu dữ liệu từ cơ sở dữ liệu.

---

## Nhóm Review Test

### TC-REVIEW-01 đến TC-REVIEW-10
Nhóm test này tập trung kiểm thử toàn diện chức năng viết và quản lý review:
- **Từ TC-REVIEW-01 đến TC-REVIEW-07**: Các unit test thuộc tầng nghiệp vụ kiểm tra chặt chẽ các điều kiện ràng buộc dữ liệu đầu vào (Validation) đối với bài viết đánh giá.
- **TC-REVIEW-08**: Kiểm thử chức năng ghi dữ liệu và liên kết thể loại, ảnh đính kèm của bài viết vào DB.
- **TC-REVIEW-09**: Kiểm thử E2E đảm bảo form điền review gửi dữ liệu thành công, tự động đóng modal và cập nhật bài viết mới hiển thị trực quan lên giao diện người dùng.
- **TC-REVIEW-10**: Kiểm thử logic xóa review nghiệp vụ, dọn dẹp các tệp ảnh tĩnh trên đĩa cứng để tránh lãng phí tài nguyên.

---

## 9.4. Cấu trúc thư mục test

Thư mục kiểm thử của dự án được tổ chức như sau:

```text
D:\NGUYENHUONG\HOC\PTUD\BTL\
├── models/
│   └── review.model.test.js        # Unit test cho tầng nghiệp vụ (Domain Validation)
├── repositories/
│   └── review.repository.test.js   # Unit test cho tầng lưu trữ dữ liệu (Database Queries)
└── tests/
    └── e2e/
        ├── test-server.js          # Server Express không đầu phục vụ chạy E2E
        └── huta-e2e.spec.js        # Kịch bản E2E kiểm thử tìm kiếm và đăng review bằng Playwright
```

---

## 9.5. Minh chứng chạy test

### 1. Kiểm thử Jest (Unit Test - Model & Repository)
- **Lệnh chạy**: `npm test` hoặc `npx jest`
- **Tổng số test**: 18
- **Số test pass**: 18
- **Số test fail**: 0
- **Thời gian chạy**: 0.622 giây
- **Đường dẫn file test**:
  - [review.model.test.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/models/review.model.test.js)
  - [review.repository.test.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.test.js)

### 2. Kiểm thử Playwright E2E
- **Lệnh chạy**: `npx playwright test`
- **Tổng số test**: 2
- **Số test pass**: 2
- **Số test fail**: 0
- **Thời gian chạy**: 3.2 giây
- **Đường dẫn file test**:
  - [huta-e2e.spec.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/tests/e2e/huta-e2e.spec.js)

---

## 9.6. Coverage

Độ phủ mã nguồn (Code Coverage) thu được khi chạy thử nghiệm Jest tập trung (chỉ kiểm thử lõi logic Search và Review):

*Lệnh chạy*: `$env:USE_SQLITE="true"; npx jest --coverage`

| Chỉ số | Kết quả |
| :--- | ---: |
| **Statement coverage** | 22.48% |
| **Branch coverage** | 24.48% |
| **Function/method coverage** | 18.00% |
| **Line coverage** | 22.62% |

*Lưu ý giải thích*: Chỉ số coverage ở mức thấp (hơn 20%) vì chúng tôi đã lược bỏ hoàn toàn các file kiểm thử liên quan đến Auth, User Management, API Routes và Controllers để tập trung 100% nguồn lực kiểm thử vào hai chức năng cốt lõi là **Tìm kiếm sách** và **Đăng review** theo yêu cầu đề bài.

---

## 9.7. Integration/E2E Playwright (bonus)

Chúng tôi đã thiết lập thành công bộ kiểm thử E2E sử dụng Playwright chạy trên Chromium Headless, tập trung kiểm tra giao diện chức năng tìm kiếm sách và đăng review.

- **Môi trường test**: Node.js v22.11.0, Playwright v1.61.0, hệ điều hành Windows, cơ sở dữ liệu SQLite test (`hutaboo_test.db`).
- **Cách chạy**:
  1. Đảm bảo port 3000 đang rảnh.
  2. Chạy lệnh: `npx playwright test`
  *(Playwright sẽ tự động khởi chạy và tắt máy chủ `tests/e2e/test-server.js` trong quá trình chạy test).*

### Bảng kịch bản E2E:

| E2E ID | Kịch bản | Các bước chính | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-E2E-01** | Tìm kiếm sách thời gian thực | 1. Truy cập trang chủ.<br>2. Nhập từ khóa "Doraemon" vào ô tìm kiếm. | Danh sách sách lọc chỉ hiển thị tác phẩm "Doraemon" trên giao diện. | PASS |
| **TC-E2E-02** | Đăng review sách mới từ giao diện | 1. Đăng nhập gián tiếp bằng cách thiết lập thông tin đăng nhập vào `localStorage` của trình duyệt.<br>2. Truy cập trang viết review (`reviews.html`).<br>3. Click nút "Viết review" để mở form modal.<br>4. Nhập tiêu đề sách ("Sách Thử Nghiệm E2E"), tác giả ("Tác Giả E2E"), chọn đánh giá 5 sao và điền nội dung review.<br>5. Click gửi và đóng modal. | Modal đóng thành công, review mới xuất hiện ngay đầu danh sách hiển thị trên giao diện của trang Reviews. | PASS |
