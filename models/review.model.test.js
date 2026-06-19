const { Book, Review } = require('./review.model');

describe('Models Unit Tests (Domain Layer)', () => {
  describe('Book Model (TC-SEARCH-10)', () => {
    test('TC-SEARCH-10: Kiểm tra dữ liệu Book khởi tạo đúng định dạng', () => {
      const book = new Book(
        1,
        'Clean Code',
        'Robert C. Martin',
        'Programming',
        4.5,
        10,
        'A handbook of agile software craftsmanship',
        'images/cleancode.png'
      );
      expect(book.id).toBe(1);
      expect(book.title).toBe('Clean Code');
      expect(book.author).toBe('Robert C. Martin');
      expect(book.tags).toBe('Programming');
      expect(book.averageRating).toBe(4.5);
      expect(book.reviewCount).toBe(10);
      expect(book.description).toBe('A handbook of agile software craftsmanship');
      expect(book.image).toBe('images/cleancode.png');
    });
  });

  describe('Review Model Validations (TC-REVIEW-01 to TC-REVIEW-07)', () => {
    test('TC-REVIEW-01: Tạo review hợp lệ', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBeNull();
    });

    test('TC-REVIEW-02: Validate tiêu đề review không được trống', () => {
      const data = {
        bookTitle: '',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBe('Tên tác phẩm không được để trống');
    });

    test('TC-REVIEW-03: Validate nội dung review', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'Cool'
      };
      expect(Review.validate(data)).toBe('Nội dung review phải tối thiểu 5 ký tự');
    });

    test('TC-REVIEW-04: Validate đánh giá sao từ 1 đến 5', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 6,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBe('Đánh giá phải từ 1 đến 5 sao');

      const data2 = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 0,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data2)).toBe('Đánh giá phải từ 1 đến 5 sao');
    });

    test('TC-REVIEW-05: Review thiếu dữ liệu bắt buộc (tác giả)', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: ' ',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBe('Tên tác giả không được để trống');
    });

    test('TC-REVIEW-06: Review có nội dung quá ngắn', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'Hay'
      };
      expect(Review.validate(data)).toBe('Nội dung review phải tối thiểu 5 ký tự');
    });

    test('TC-REVIEW-07: Review có nội dung hợp lệ', () => {
      const review = new Review(
        1, 2, 3, 5,
        'Great book!',
        '2026-06-16T00:00:00Z',
        'reviewer_user',
        'Book Title',
        'Author Name',
        'Topic'
      );
      expect(review.id).toBe(1);
      expect(review.userId).toBe(2);
      expect(review.bookId).toBe(3);
      expect(review.rating).toBe(5);
      expect(review.content).toBe('Great book!');
      expect(review.createdAt).toBe('2026-06-16T00:00:00Z');
      expect(review.username).toBe('reviewer_user');
      expect(review.bookTitle).toBe('Book Title');
      expect(review.bookAuthor).toBe('Author Name');
      expect(review.bookTopic).toBe('Topic');
    });
  });
});
