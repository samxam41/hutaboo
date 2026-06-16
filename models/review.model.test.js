const { User, Book, Review, Comment } = require('./review.model');

describe('Models Unit Tests', () => {
  describe('User Model', () => {
    test('should instantiate User correctly', () => {
      const user = new User(1, 'testuser', 'hashedpassword');
      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(user.password).toBe('hashedpassword');
    });
  });

  describe('Book Model', () => {
    test('should instantiate Book correctly', () => {
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

  describe('Review Model', () => {
    test('should instantiate Review correctly', () => {
      const review = new Review(
        1,
        2,
        3,
        5,
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

    test('should validate valid review data', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBeNull();
    });

    test('should invalidate review with empty book title', () => {
      const data = {
        bookTitle: '',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBe('Tên tác phẩm không được để trống');
    });

    test('should invalidate review with empty book author', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: ' ',
        rating: 5,
        content: 'This is a great book, highly recommend!'
      };
      expect(Review.validate(data)).toBe('Tên tác giả không được để trống');
    });

    test('should invalidate review with rating out of range', () => {
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

    test('should invalidate review with too short content', () => {
      const data = {
        bookTitle: 'Clean Code',
        bookAuthor: 'Robert C. Martin',
        rating: 5,
        content: 'Cool'
      };
      expect(Review.validate(data)).toBe('Nội dung review phải tối thiểu 5 ký tự');
    });
  });

  describe('Comment Model', () => {
    test('should instantiate Comment correctly', () => {
      const comment = new Comment(1, 2, 3, 'Nice comment!', '2026-06-16T00:00:00Z', 'commenter_user');
      expect(comment.id).toBe(1);
      expect(comment.reviewId).toBe(2);
      expect(comment.userId).toBe(3);
      expect(comment.content).toBe('Nice comment!');
      expect(comment.createdAt).toBe('2026-06-16T00:00:00Z');
      expect(comment.username).toBe('commenter_user');
    });

    test('should validate valid comment data', () => {
      const data = { content: 'This is a comment.' };
      expect(Comment.validate(data)).toBeNull();
    });

    test('should invalidate empty comment content', () => {
      const data = { content: '   ' };
      expect(Comment.validate(data)).toBe('Bình luận không được để trống');
    });
  });
});
