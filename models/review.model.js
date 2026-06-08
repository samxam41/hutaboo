/**
 * Lớp đại diện cho người dùng (User Model)
 */
class User {
  constructor(id, username, password) {
    this.id = id;
    this.username = username;
    this.password = password;
  }
}

/**
 * Lớp đại diện cho sách (Book Model)
 */
class Book {
  constructor(id, title, author, tags = null, averageRating = 0, reviewCount = 0, description = null, image = null) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.tags = tags;
    this.averageRating = averageRating;
    this.reviewCount = reviewCount;
    this.description = description;
    this.image = image;
  }
}

/**
 * Lớp đại diện cho bài đánh giá sách (Review Model)
 */
class Review {
  constructor(id, userId, bookId, rating, content, createdAt, username = null, bookTitle = null, bookAuthor = null, bookTopic = null) {
    this.id = id;
    this.userId = userId;
    this.bookId = bookId;
    this.rating = rating;
    this.content = content;
    this.createdAt = createdAt;

    // Các trường bổ sung từ kết nối bảng (JOIN query) để hiển thị lên giao diện
    this.username = username;
    this.bookTitle = bookTitle;
    this.bookAuthor = bookAuthor;
    this.bookTopic = bookTopic;
  }

  /**
   * Kiểm tra tính hợp lệ của dữ liệu Review
   * @param {Object} data - Dữ liệu đầu vào từ client
   * @returns {string|null} - Thông báo lỗi nếu có, ngược lại trả về null
   */
  static validate(data) {
    if (!data.bookTitle || data.bookTitle.trim() === '') return 'Tên tác phẩm không được để trống';
    if (!data.bookAuthor || data.bookAuthor.trim() === '') return 'Tên tác giả không được để trống';
    if (!data.rating || data.rating < 1 || data.rating > 5) return 'Đánh giá phải từ 1 đến 5 sao';
    if (!data.content || data.content.trim().length < 5) return 'Nội dung review phải tối thiểu 5 ký tự';
    return null;
  }
}

/**
 * Lớp đại diện cho bình luận (Comment Model)
 */
class Comment {
  constructor(id, reviewId, userId, content, createdAt, username = null) {
    this.id = id;
    this.reviewId = reviewId;
    this.userId = userId;
    this.content = content;
    this.createdAt = createdAt;

    // Trường bổ sung từ bảng users để hiển thị tên người bình luận
    this.username = username;
  }

  /**
   * Kiểm tra tính hợp lệ của dữ liệu Comment
   * @param {Object} data 
   * @returns {string|null}
   */
  static validate(data) {
    if (!data.content || data.content.trim().length === 0) return 'Bình luận không được để trống';
    return null;
  }
}

module.exports = {
  User,
  Book,
  Review,
  Comment
};
