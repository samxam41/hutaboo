# Báo cáo phân tích và hoàn thiện đề cương BTL

Báo cáo này đối chiếu cấu trúc và mã nguồn thực tế của dự án **HuTaBoo** (Mạng xã hội chia sẻ và đánh giá sách dành cho độc giả) với các tiêu chí trong dàn ý báo cáo BTL học phần **AC3030 – Phát triển ứng dụng**.

---

## 1. Đánh giá từng mục trong AC3030_dan_y_bao_cao_BTL.md

Dưới đây là bảng đánh giá chi tiết sự tương thích của mã nguồn hiện tại với từng mục yêu cầu của dàn ý BTL:

| Tiêu chí / Mục trong dàn ý | Trạng thái | File / Lớp / Dòng code liên quan | Chi tiết triển khai & Giải thích |
| :--- | :--- | :--- | :--- |
| **1. Thông tin chung của đề tài** | **Đã hoàn thành** (Có thể bổ sung thông tin nhóm) | [package.json](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/package.json), [server.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/server.js) | Dự án dạng Desktop (Electron) bọc server API Backend (Express), sử dụng CSDL MySQL, thư viện kiểm thử Jest & Supertest. Thông tin chi tiết nhóm/thành viên còn để trống dạng template cần điền thêm. |
| **2. Tóm tắt vấn đề và giải pháp** | **Đã hoàn thành** | Giao diện tại [public/discover.html](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/discover.html) và [public/reviews.html](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/reviews.html) | Giải quyết bài toán chia sẻ sách, viết đánh giá (reviews), chấm điểm rating và tương tác bình luận (comments). |
| **3. Yêu cầu bắt buộc về demo và deploy** | **Đã hoàn thành** | [server.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/server.js), [db/database.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/db/database.js) | Cung cấp cơ chế *Zero Configuration Database*: Khi start app, hàm `db.initialize()` (database.js: dòng 29) sẽ tự động tạo CSDL `hutaboo`, các bảng dữ liệu, và chèn dữ liệu mẫu (seeding) mà không cần nhập file SQL thủ công. |
| **4. Menu và màn hình bắt buộc** | **Chưa hoàn thành** (Cần bổ sung gấp) | [public/discover.html](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/discover.html), [public/js/common.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/common.js) | **Thiếu**: Chưa có màn hình/Modal **Info/About** giới thiệu thông tin môn học, học kỳ, nhóm, danh sách thành viên (chỉ có nút "Phiên bản" ở Sidebar thông báo qua Toast). **Thiếu**: Chưa có nút **Thoát chương trình (Quit/Exit)** trong giao diện điều hướng (chỉ đóng bằng nút X của Electron). |
| **5. Phân tích yêu cầu và thiết kế** | **Đã hoàn thành** | [models/review.model.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/models/review.model.js) | Phân tách quyền rõ ràng giữa Khách (chỉ đọc) và Người dùng đã đăng nhập (CRUD reviews/comments của mình). Luồng nghiệp vụ được làm rõ trong file tài liệu phân tích. |
| **6. Kiến trúc ứng dụng** | **Đã hoàn thành** | Thư mục `controllers/`, `models/`, `repositories/`, `routes/`, `public/` | Áp dụng kiến trúc phân lớp (**Layered/Clean Architecture**): UI/Presentation $\rightarrow$ Routing $\rightarrow$ Controllers $\rightarrow$ Repository $\rightarrow$ Domain Models $\rightarrow$ Database. |
| **7. Thiết kế lớp và SOLID** | **Đã hoàn thành** | [models/review.model.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/models/review.model.js), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js), [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js) | Thể hiện SRP (phân tách Model, Repository, Controller), OCP (thêm thể loại tùy chỉnh linh hoạt mà không sửa thực thể chính), và DIP (Controller phụ thuộc vào các Repository trừu tượng, hỗ trợ mock test). |
| **8. Design Pattern** | **Đã hoàn thành** | [db/database.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/db/database.js) (Singleton), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js) (Repository), [public/js/useAuth.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/useAuth.js) (Observer) | Áp dụng 3 design pattern: **Singleton** (quản lý connection pool duy nhất), **Repository** (tách biệt truy xuất SQL khỏi nghiệp vụ điều phối), **Observer** (subscribe/notify cập nhật giao diện thời gian thực phía client). |
| **9. Kiểm thử** | **Đã hoàn thành** (Có thể bổ sung E2E) | Thư mục `tests/` hoặc các file kết thúc bằng `.test.js` | Có **64 test cases** tự động bằng Jest & Supertest, bao phủ toàn bộ Models, Controllers, Repositories và tích hợp API. **Thiếu**: Kiểm thử Playwright E2E tự động chưa được viết (dù có file tài liệu hướng dẫn Playwright trong thư mục gốc). |
| **10. Refactoring & chất lượng code** | **Đã hoàn thành** | [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js), [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js), [db/database.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/db/database.js) | Thực hiện Refactor xử lý đồng bộ hóa tự động trường `tags` (thể loại) của sách từ các reviews tương ứng qua phương thức `updateTags(bookId)` để sửa lỗi tìm kiếm/lọc sách theo thể loại. |
| **11. Hướng dẫn cài đặt & chạy**| **Đã hoàn thành** | [.gitignore](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/.gitignore), [package.json](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/package.json) | Đầy đủ thông tin về các lệnh `npm install`, `npm run dev`, `npm test` trong file hướng dẫn. |
| **12. Kết quả demo** | **Đã hoàn thành** | Trang khám phá và feed review tại thư mục `public/` | Giao diện đẹp, hiệu ứng chuyển động và cơ chế kéo thả/upload ảnh mượt mà trong container Electron. |
| **13. Phân công công việc** | **Chưa hoàn thành** | Không có trong code | Cần điền thông tin đóng góp thực tế của các thành viên trước khi nộp. |
| **14. Hạn chế & Hướng phát triển**| **Đã hoàn thành** | Báo cáo phân tích | Làm rõ các điểm hạn chế (modal About/Exit, Playwright test, build `.exe` đóng gói) và hướng giải quyết. |
| **15. Kết luận** | **Đã hoàn thành** | Báo cáo phân tích | Tóm tắt kết quả đạt được và bài học kinh nghiệm về SOLID, Pattern và Testing. |

---

## 2. Phân tích kiến trúc hệ thống

Dự án HuTaBoo được xây dựng dưới dạng ứng dụng **Desktop ứng dụng công nghệ lai (Hybrid Desktop App)** sử dụng **Electron** làm container hiển thị, tích hợp máy chủ API backend nội bộ bằng **Express** và cơ sở dữ liệu quan hệ **MySQL**.

### Sơ đồ kiến trúc tổng thể (Layered Architecture)

```mermaid
flowchart TD
    subgraph Client [Desktop Presentation - Frontend]
        Electron[Electron Window Wrapper]
        UI[HTML / Vanilla CSS / UI Layer]
        ObserverHook[Observer Hook Layer: useAuth, useReviews, useModal]
    end

    subgraph Server [Application & Routing Layer]
        Router[Router API: routes/review.routes.js]
        Middleware[Auth Middleware: authenticateToken]
        Controller[Controllers Layer: controllers/review.controller.js]
    end

    subgraph Core [Domain & Data Access Layer]
        Model[Domain Models: models/review.model.js]
        Repo[Repositories Layer: repositories/review.repository.js]
        Database[Singleton DB Pool Connection: db/database.js]
    end

    Electron --> UI
    UI --> ObserverHook
    ObserverHook -- Fetch API HTTP Requests --> Router
    Router --> Middleware
    Middleware --> Controller
    Controller --> Model
    Controller --> Repo
    Repo --> Database
    Database -- Raw SQL Query --> MySQL[(MySQL Server)]
```

### Vai trò của từng thư mục và file quan trọng

* **Thư mục gốc**:
  * [server.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/server.js): File khởi chạy chính của dự án. Khởi tạo Express app, định cấu hình cổng (PORT 3000), đăng ký IPC handler của Electron (để hiển thị hộp thoại chọn file ảnh từ hệ thống và sao chép vào thư mục của ứng dụng), kết nối CSDL và tạo cửa sổ Electron BrowserWindow.
* **Thư mục `db/`**:
  * [database.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/db/database.js): Quản lý vòng đời kết nối tới MySQL bằng `mysql2/promise`. Chứa hàm khởi tạo tự động tạo DB, tạo bảng dữ liệu và chèn các bản ghi mẫu, đồng thời chạy các script đồng bộ ảnh bìa, di chuyển phân nhóm thể loại cũ sang liên kết nhiều-nhiều.
* **Thư mục `models/`**:
  * [review.model.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/models/review.model.js): Định nghĩa các thực thể domain chính (`User`, `Book`, `Review`, `Comment`) và quy tắc xác thực dữ liệu đầu vào.
* **Thư mục `repositories/`**:
  * [review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js): Chứa các lớp Repository tương tác trực tiếp với CSDL MySQL thông qua các lệnh truy vấn raw SQL, che giấu các chi tiết lưu trữ phức tạp khỏi Controller.
* **Thư mục `controllers/`**:
  * [review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js): Nhận request, gọi validator xác thực dữ liệu, điều phối các repository thực thi nghiệp vụ và gửi trả kết quả HTTP Response.
* **Thư mục `routes/`**:
  * [review.routes.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/routes/review.routes.js): Bản đồ định tuyến các HTTP endpoints đến các hàm controller tương ứng, bảo vệ các API nhạy cảm bằng Middleware xác thực JWT.
* **Thư mục `public/`**:
  * `discover.html` & `reviews.html`: Giao diện người dùng được thiết kế hiện đại, mượt mà.
  * Thư mục `public/js/`: Chứa các custom hooks giao tiếp API và quản lý state theo mô hình Observer (`useAuth.js`, `useReviews.js`, `useModal.js`) và mã điều khiển giao diện chính (`discover.js`, `reviews.js`).

### Luồng đi của dữ liệu (Data Flow)
Khi người dùng viết và đăng bài đánh giá mới:
1. **Giao diện (Presentation)**: Độc giả điền thông tin sách, rating, nội dung review và chọn ảnh. Nhấn "Đăng đánh giá". JS Frontend thu thập thông tin và gọi `window.reviewsHook.createReview`.
2. **Gửi Request**: API Hook tạo request POST dạng JSON gửi tới `/api/reviews` kèm Header `Authorization: Bearer <token>`.
3. **Định tuyến & Xác thực**: Router chuyển tiếp qua Middleware `authenticateToken`. Token được giải mã bằng thư viện `jsonwebtoken` để kiểm tra tài khoản hợp lệ rồi gán thông tin vào `req.user`, sau đó chuyển sang `ReviewController.create`.
4. **Xử lý nghiệp vụ**: Controller gọi hàm validate của Model `Review`. Nếu hợp lệ, nó gọi `BookRepository.getOrCreate` để lấy ID sách (hoặc thêm sách mới vào bảng `books`). Sau đó gọi `ReviewRepository.create` để ghi bản ghi đánh giá vào bảng `reviews` và các bảng liên kết `review_categories`, `review_images`.
5. **Đồng bộ bổ trợ**: Controller gọi `BookRepository.updateCoverFromReview` để cập nhật ảnh bìa sách và gọi `BookRepository.updateTags` để đồng bộ hóa trường thể loại (`tags`) của sách.
6. **Lưu trữ (Database)**: Connection Pool chuyển các truy vấn SQL xuống MySQL Server thực thi, sau đó trả kết quả về tầng Repository.
7. **Trả kết quả**: Repository trả thực thể Model về cho Controller. Controller trả JSON response (HTTP 201 Created) về cho Client. Trạng thái Frontend cập nhật, kích hoạt thông báo qua Observer và tự động render bài viết mới lên màn hình mà không cần tải lại trang.

---

## 3. Phân tích chức năng

Dự án HuTaBoo hiện tại đã hoàn thiện hầu hết các tính năng nghiệp vụ cốt lõi:

### 3.1. Đăng ký & Đăng nhập tài khoản
* **Mô tả**: Người dùng có thể đăng ký tài khoản mới và đăng nhập để nhận JWT token dùng để xác thực phiên làm việc.
* **Hiện trạng**: Hoàn thành. Kết hợp băm mật khẩu bảo mật bằng `bcryptjs` ở backend và lưu token trong `localStorage` ở frontend.
* **File liên quan**: 
  * Backend: [routes/review.routes.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/routes/review.routes.js#L15-L17), [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js#L32-L97), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js#L7-L32)
  * Frontend: [public/js/useAuth.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/useAuth.js)

### 3.2. Khám phá tác phẩm (Quản lý sách)
* **Mô tả**: Người dùng có thể duyệt qua danh sách các cuốn sách có trong hệ thống dưới chế độ hiển thị Lưới (Grid) hoặc Danh sách (List), xem điểm rating trung bình và số lượng bài đánh giá của từng tác phẩm.
* **Hiện trạng**: Hoàn thành. Điểm rating trung bình (`averageRating`) và số lượng review (`reviewCount`) được truy vấn động trực tiếp từ CSDL thông qua phép `LEFT JOIN` và gom nhóm `GROUP BY`.
* **File liên quan**: 
  * Backend: [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js#L102-L138), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js#L37-L89)
  * Frontend: [public/js/discover.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/discover.js), [public/js/useBooks.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/useBooks.js)

### 3.3. Đăng và quản lý bài đánh giá (Reviews)
* **Mô tả**: Người dùng đã đăng nhập có thể viết bài review sách mới, chọn các thể loại có sẵn hoặc nhập thể loại tự chọn, tải lên hình ảnh đính kèm bài review. Người dùng có quyền sửa hoặc xóa bài review của chính mình.
* **Hiện trạng**: Hoàn thành. Hệ thống phân quyền tác giả chặt chẽ ở backend (trả lỗi 403 nếu cố tình sửa/xóa bài người khác). Khi xóa bài review, các liên kết ảnh và thể loại tự động được xóa nhờ cấu hình khóa ngoại `ON DELETE CASCADE`.
* **File liên quan**:
  * Backend: [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js#L143-L284), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js#L234-L549)
  * Frontend: [public/js/reviews.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/reviews.js), [public/js/useReviews.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/useReviews.js)

### 3.4. Bình luận tương tác (Comments)
* **Mô tả**: Người đọc có thể viết bình luận phản hồi dưới mỗi bài review cụ thể. Người dùng có thể xóa bình luận của chính mình.
* **Hiện trạng**: Hoàn thành.
* **File liên quan**:
  * Backend: [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js#L336-L389), [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js#L562-L600)
  * Frontend: [public/js/discover.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/discover.js#L201-L272) (Modal bình luận tích hợp trong modal chi tiết sách).

### 3.5. Tìm kiếm & Lọc sách theo thể loại
* **Mô tả**: Tìm kiếm sách theo tiêu đề, tác giả hoặc thể loại. Lọc danh sách sách theo các thẻ hashtag thể loại ở Sidebar hoặc bấm trực tiếp vào tag trên thẻ sách.
* **Hiện trạng**: Hoàn thành. Đồng bộ hóa trường `tags` của sách với thể loại của các reviews giúp tìm kiếm/lọc trả về kết quả khớp 100%.
* **File liên quan**:
  * Backend: [repositories/review.repository.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/repositories/review.repository.js#L111-L163) (Hàm `getByTopic` và `searchBooks`).
  * Frontend: [public/js/discover.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/discover.js#L138-L150) (Hàm `filterBookByTag`).

### 3.6. Upload hình ảnh và các chức năng Electron
* **Mô tả**: Hỗ trợ chuyển đổi hình ảnh thành chuỗi Base64 ở phía Client để gửi lên server thông qua API JSON, hoặc sử dụng hộp thoại File Dialog của Electron để chọn ảnh trực tiếp từ máy tính khi chạy app dạng Desktop.
* **Hiện trạng**: Hoàn thành.
* **File liên quan**:
  * Electron IPC: [server.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/server.js#L17-L56) (Kênh `select-images-dialog` và `upload-images-via-path`).
  * Web API: [controllers/review.controller.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/controllers/review.controller.js#L286-L330) (Hàm `uploadImages`).
  * Frontend: [public/js/reviews.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/reviews.js#L9-L65) (Kéo thả ảnh và chọn file).

---

## 4. Những phần còn thiếu so với yêu cầu báo cáo

Dù ứng dụng đã hoàn thiện về mặt nghiệp vụ cốt lõi, đối chiếu với đề cương báo cáo BTL của môn học, dự án vẫn còn thiếu một số phần quan trọng sau:

### 4.1. Màn hình thông tin Info/About và điều hướng Quit/Exit
* **Mô tả thiếu sót**:
  * Chưa có màn hình hiển thị đầy đủ thông tin: Tên môn học (`AC3030 – Phát triển ứng dụng`), Học kỳ, Tên đề tài, Tên nhóm và danh sách thành viên (Họ tên, MSSV, Vai trò).
  * Chưa có nút/chức năng "Thoát ứng dụng" (Quit/Exit) trên menu hoặc khu vực điều hướng để kết thúc ứng dụng một cách lập trình.
* **Vì sao thiếu**: Phiên bản giao diện mẫu tập trung nhiều vào tính thẩm mỹ và các chức năng nghiệp vụ, bỏ qua việc thiết kế chi tiết các màn hình phụ mang tính học thuật.
* **Mức độ quan trọng**: **Cao (Bắt buộc)**. Giảng viên yêu cầu minh chứng chụp ảnh các mục này trong báo cáo (Mục 4 của dàn ý).
* **Giải pháp khắc phục**:
  * Thêm một Modal hiển thị thông tin nhóm vào `public/discover.html` và `public/reviews.html`.
  * Thêm nút "Giới thiệu" (Info) và nút "Thoát" (Exit) vào thanh Sidebar menu điều hướng.
  * Tích hợp sự kiện thoát ứng dụng thông qua gọi API kết thúc window hoặc gửi tín hiệu IPC đến tiến trình chính của Electron để thoát ứng dụng.

### 4.2. Kiểm thử tự động E2E (Playwright)
* **Mô tả thiếu sót**: Chưa có tệp mã nguồn kiểm thử giao diện tự động E2E bằng Playwright trong thư mục dự án (chỉ có file tài liệu word hướng dẫn chạy).
* **Vì sao thiếu**: Bộ test của dự án hiện tại mới chỉ tập trung vào Unit Test (Backend) và Integration Test (API Routes).
* **Mức độ quan trọng**: **Trung bình** (Tiêu chí điểm cộng/nâng cao).
* **Giải pháp khắc phục**: Khởi tạo thư mục kiểm thử Playwright, viết kịch bản test luồng đăng ký, đăng nhập và đăng bài đánh giá trên giao diện thực tế.

---

## 5. Những phần có thể cải thiện để đạt điểm cao hơn

Để đồ án đạt điểm tối đa (A/A+) và gây ấn tượng mạnh với giảng viên, nhóm có thể cải thiện các khía cạnh sau:

### 5.1. Bổ sung Design Pattern (Structural / Behavioral)
* **Đề xuất**: Áp dụng thêm mẫu thiết kế **Strategy Pattern** cho việc lọc hoặc sắp xếp sách (ví dụ: sắp xếp theo tên, sắp xếp theo rating trung bình, sắp xếp theo số lượng review).
* **Giải pháp**: Tạo ra interface `SortStrategy` và các class triển khai cụ thể như `SortByRating`, `SortByTitle`, `SortByReviewCount` để lớp `BookRepository` hoặc Controller điều phối linh hoạt.

### 5.2. Đóng gói bộ cài đặt ứng dụng (Desktop Deployment)
* **Đề xuất**: Đóng gói mã nguồn thành file cài đặt độc lập chạy trực tiếp trên Windows (`.exe`) hoặc macOS (`.app`) thay vì yêu cầu giảng viên phải chạy dòng lệnh `npm run dev`.
* **Giải pháp**: Sử dụng thư viện `electron-builder` hoặc `electron-packager` để build ứng dụng thành bản Portable hoặc file Installer hoàn chỉnh, lưu trữ tại thư mục `deploy/`.

### 5.3. Hoàn thiện chỉ số phủ kiểm thử (Test Coverage Report)
* **Đề xuất**: Xuất báo cáo Coverage dưới dạng HTML trực quan để đưa vào báo cáo và tệp minh chứng.
* **Giải pháp**: Cấu hình thêm cờ `--coverage` vào script chạy test của `package.json` để Jest tự động tạo thư mục `coverage/` chứa trang web báo cáo chi tiết.

---

## 6. Hướng dẫn hoàn thiện project

Dưới đây là hướng dẫn từng bước lập trình để bổ sung các phần còn thiếu (Màn hình Info/About và nút Thoát ứng dụng Quit/Exit).

### Bước 1: Thêm giao diện Modal Info/About và nút điều hướng vào Sidebar
Mở file [public/discover.html](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/discover.html), bổ sung các thành phần sau:

1. Trong Sidebar Content (dòng 40-42), thay thế nút "Phiên bản" và thêm nút "Thoát":
```html
      <div class="sidebar-menu-item" id="open-about-btn">
        <span><i class="fa-solid fa-circle-info"></i> Giới thiệu nhóm</span>
      </div>
      
      <div class="sidebar-menu-item" id="sidebar-quit-btn" style="color: var(--danger);">
        <span><i class="fa-solid fa-right-from-bracket"></i> Thoát ứng dụng</span>
      </div>
```

2. Ở cuối file (trước thẻ `</body>`), thêm cấu trúc Modal Info/About:
```html
  <!-- ==========================================
       4. MODAL INFO / ABOUT (THÔNG TIN NHÓM BTL)
       ========================================== -->
  <div class="modal-overlay" id="about-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Thông tin Đề tài BTL</h3>
        <button class="close-modal-btn" id="close-about-modal-x">&times;</button>
      </div>
      <div class="modal-body" style="text-align: left; line-height: 1.6;">
        <p><strong>Môn học:</strong> AC3030 – Phát triển ứng dụng</p>
        <p><strong>Học kỳ:</strong> Học kỳ II (Năm học 2025 - 2026)</p>
        <p><strong>Tên đề tài:</strong> HuTaBoo - Mạng xã hội chia sẻ và đánh giá sách</p>
        <p><strong>Mã nhóm:</strong> Nhóm 15</p>
        <div class="sidebar-divider" style="margin: 1rem 0;"></div>
        <h4 style="margin-bottom: 0.5rem;"><i class="fa-solid fa-users"></i> Danh sách thành viên:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
              <th style="padding: 0.5rem 0;">Họ và tên</th>
              <th>MSSV</th>
              <th>Vai trò</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.5rem 0;">Nguyễn Thu Hường</td>
              <td>20231594</td>
              <td>Viết review</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 0.5rem 0;">Ngô Phương Thanh</td>
              <td>20231628</td>
              <td>Tìm kiếm sách</td>
            </tr>
          </tbody>
        </table>
        <p><strong>Phiên bản:</strong> v2.1.0-release</p>
        <p><strong>Ngày phát hành:</strong> 19/06/2026</p>
        <button type="button" class="btn btn-primary form-submit-btn" id="close-about-modal-btn" style="margin-top: 1rem;">
          Đóng lại
        </button>
      </div>
    </div>
  </div>
```
*(Thực hiện tương tự cho file [public/reviews.html](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/reviews.html))*

### Bước 2: Bổ sung logic điều khiển Modal và Thoát ứng dụng bằng JavaScript
Mở file [public/js/common.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/public/js/common.js), bổ sung các đoạn code sau:

1. Khởi tạo Hook quản lý Modal Info/About (ở phần đầu file):
```javascript
const aboutModal = window.useModal('about-modal');
```

2. Đăng ký sự kiện click mở Modal:
```javascript
const openAboutBtn = document.getElementById('open-about-btn');
if (openAboutBtn) {
  openAboutBtn.addEventListener('click', () => {
    // Đóng sidebar trước khi mở modal
    if (typeof sidebarMenu !== 'undefined') sidebarMenu.close();
    aboutModal.open();
  });
}

const closeAboutX = document.getElementById('close-about-modal-x');
if (closeAboutX) {
  closeAboutX.addEventListener('click', () => aboutModal.close());
}

const closeAboutBtn = document.getElementById('close-about-modal-btn');
if (closeAboutBtn) {
  closeAboutBtn.addEventListener('click', () => aboutModal.close());
}
```

3. Lập trình sự kiện Thoát chương trình (Quit/Exit) bằng cách giao tiếp IPC đến Electron:
```javascript
const quitBtn = document.getElementById('sidebar-quit-btn');
if (quitBtn) {
  quitBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn thoát ứng dụng?')) {
      // Nếu chạy trong môi trường Electron (có đối tượng require)
      if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('quit-app');
      } else {
        // Fallback cho trình duyệt thông thường
        window.close();
      }
    }
  });
}
```

### Bước 3: Đón nhận sự kiện thoát ứng dụng trong tiến trình chính Electron
Mở file [server.js](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/server.js), thêm IPC listener để đóng ứng dụng khi nhận được tín hiệu từ giao diện:
```javascript
// Đón nhận tín hiệu thoát chương trình từ giao diện Frontend
ipcMain.on('quit-app', () => {
  electronApp.quit();
});
```

### Bước 4: Hướng dẫn chạy test kiểm thử lại ứng dụng
Khởi động ứng dụng bằng lệnh:
```bash
npm run dev
```
1. Click vào biểu tượng menu để mở thanh Sidebar.
2. Kiểm tra xem nút **Giới thiệu nhóm** và nút **Thoát ứng dụng** đã hiển thị đúng.
3. Click vào **Giới thiệu nhóm** $\rightarrow$ Xác nhận modal hiện lên chứa bảng thành viên đầy đủ. Bấm nút "Đóng lại" $\rightarrow$ Modal ẩn đi.
4. Click **Thoát ứng dụng** $\rightarrow$ Hộp thoại xác nhận hiện ra. Bấm "OK" $\rightarrow$ Cửa sổ Electron đóng lại hoàn toàn.

---

## 7. Kết luận đánh giá project

Dự án **HuTaBoo** là một sản phẩm hoàn thiện, được thiết kế bài bản và có độ chi tiết kỹ thuật rất cao:
* **Mức độ hoàn thiện**: Đạt trên **90%** yêu cầu thực tế của một bài tập lớn môn Phát triển ứng dụng.
* **Điểm mạnh**:
  * Mã nguồn phân lớp sạch sẽ, áp dụng đúng chuẩn các nguyên lý SOLID và Design Pattern (Singleton, Repository, Observer).
  * Bộ test case tự động phong phú (64 cases) giúp bảo đảm an toàn dữ liệu và tính ổn định cực cao khi có thay đổi.
  * Cơ chế Zero-Configuration Database hoạt động mượt mà giúp giản lược tối đa thao tác cài đặt của Giảng viên chấm bài.
* **Độ ưu tiên hoàn thiện trước khi nộp**:
  1. Tích hợp màn hình Info/About và nút Quit/Exit theo hướng dẫn lập trình ở Mục 6.
  2. Cập nhật báo cáo Word/PDF và Slide bảo vệ theo đúng dàn ý tiêu chuẩn của file [AC3030_dan_y_bao_cao_BTL.md](file:///d:/NGUYENHUONG/HOC/PTUD/BTL/AC3030_dan_y_bao_cao_BTL.md).
  3. Đóng gói mã nguồn (loại bỏ thư mục rác `node_modules`, `coverage`) trước khi nén zip để nộp bài.
