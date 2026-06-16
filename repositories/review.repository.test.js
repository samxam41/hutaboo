const mockPool = {
  query: jest.fn()
};

// Mock the database dependency
jest.mock('../db/database', () => {
  return {
    getPool: () => mockPool
  };
});

// Mock fs module to avoid actual file operations during unit test
jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    copyFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([])
  };
});

const fs = require('fs');
const {
  UserRepository,
  BookRepository,
  ReviewRepository,
  CommentRepository,
  CategoryRepository
} = require('./review.repository');

describe('Repositories Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRepository', () => {
    test('findByUsername should return User when found', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, username: 'testuser', password: 'hashedpassword' }]
      ]);

      const user = await UserRepository.findByUsername('testuser');
      expect(user).not.toBeNull();
      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', ['testuser']);
    });

    test('findByUsername should return null when not found', async () => {
      mockPool.query.mockResolvedValue([[]]);

      const user = await UserRepository.findByUsername('nonexistent');
      expect(user).toBeNull();
    });

    test('findById should return User when found', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, username: 'testuser', password: 'hashedpassword' }]
      ]);

      const user = await UserRepository.findById(1);
      expect(user).not.toBeNull();
      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
    });

    test('create should return insertId', async () => {
      mockPool.query.mockResolvedValue([{ insertId: 42 }]);

      const insertId = await UserRepository.create('newuser', 'hashedpass');
      expect(insertId).toBe(42);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        ['newuser', 'hashedpass']
      );
    });
  });

  describe('BookRepository', () => {
    test('getAll should return array of Books', async () => {
      mockPool.query.mockResolvedValue([
        [
          {
            id: 1,
            title: 'Book 1',
            author: 'Author 1',
            tags: 'Manga',
            averageRating: '4.50',
            reviewCount: 5,
            description: 'Desc',
            image: 'img.png'
          }
        ]
      ]);

      const books = await BookRepository.getAll();
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Book 1');
      expect(books[0].averageRating).toBe(4.5);
    });

    test('getById should return Book when found', async () => {
      mockPool.query.mockResolvedValue([
        [
          {
            id: 1,
            title: 'Book 1',
            author: 'Author 1',
            tags: 'Manga',
            averageRating: '4.50',
            reviewCount: 5,
            description: 'Desc',
            image: 'img.png'
          }
        ]
      ]);

      const book = await BookRepository.getById(1);
      expect(book).not.toBeNull();
      expect(book.title).toBe('Book 1');
    });

    test('getOrCreate should return existing book id', async () => {
      mockPool.query.mockResolvedValueOnce([[{ id: 10 }]]); // Select query

      const bookId = await BookRepository.getOrCreate('Book 1', 'Author 1');
      expect(bookId).toBe(10);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('getOrCreate should create and return new book id if not exists', async () => {
      mockPool.query
        .mockResolvedValueOnce([[]]) // Select query: not found
        .mockResolvedValueOnce([{ insertId: 11 }]); // Insert query

      const bookId = await BookRepository.getOrCreate('Book New', 'Author New');
      expect(bookId).toBe(11);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('updateCoverFromReview should update cover when is_user_added is true and reviews have images', async () => {
      // 1. Get book: is_user_added = true
      // 2. Select review images: found review with image
      // 3. Update cover query
      mockPool.query
        .mockResolvedValueOnce([[{ image: 'default.svg', is_user_added: 1 }]]) // select book
        .mockResolvedValueOnce([[{ image_path: 'uploads/reviews/review-image.png' }]]) // select review images
        .mockResolvedValueOnce([{}]); // update book cover

      fs.existsSync.mockReturnValue(true);

      await BookRepository.updateCoverFromReview(5);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    test('updateCoverFromReview should reset to default cover when no reviews have images', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ image: 'cover-5.png', is_user_added: 1 }]]) // select book
        .mockResolvedValueOnce([[]]) // select review images (none found)
        .mockResolvedValueOnce([{}]); // update book cover to default

      await BookRepository.updateCoverFromReview(5);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenLastCalledWith(
        'UPDATE books SET image = ? WHERE id = ?',
        ['uploads/covers/default_cover.svg', 5]
      );
    });

    test('updateCoverFromReview should do nothing if is_user_added is false', async () => {
      mockPool.query.mockResolvedValueOnce([[{ image: 'cover-fixed.png', is_user_added: 0 }]]); // select book

      await BookRepository.updateCoverFromReview(5);
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Only checked the book, did not query reviews or update
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });

  describe('ReviewRepository', () => {
    test('getById should query review details, categories and images', async () => {
      mockPool.query
        .mockResolvedValueOnce([
          [
            {
              id: 1,
              user_id: 2,
              book_id: 3,
              rating: 5,
              content: 'Good',
              created_at: '2026-06-16',
              username: 'user1',
              bookTitle: 'Title',
              bookAuthor: 'Author',
              bookTopic: 'Topic'
            }
          ]
        ]) // select review
        .mockResolvedValueOnce([[{ id: 101, name: 'Manga' }]]) // select categories
        .mockResolvedValueOnce([[{ image_path: 'uploads/reviews/img.png' }]]); // select images

      const review = await ReviewRepository.getById(1);
      expect(review).not.toBeNull();
      expect(review.categories).toContain('Manga');
      expect(review.images).toContain('uploads/reviews/img.png');
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('create should insert review, categories, custom categories, and images', async () => {
      mockPool.query
        .mockResolvedValueOnce([{ insertId: 50 }]) // insert review
        .mockResolvedValueOnce([{}]) // insert review_categories
        .mockResolvedValueOnce([[]]) // select custom category (not found)
        .mockResolvedValueOnce([{ insertId: 200 }]) // insert new custom category
        .mockResolvedValueOnce([{}]) // insert custom category mapping
        .mockResolvedValueOnce([{}]); // insert review_images

      const reviewId = await ReviewRepository.create(
        2, // userId
        3, // bookId
        5, // rating
        'Superb', // content
        [101], // categoryIds
        ['New Category'], // customCategories
        ['uploads/reviews/img.png'] // imagePaths
      );

      expect(reviewId).toBe(50);
      expect(mockPool.query).toHaveBeenCalledTimes(6);
    });

    test('delete should delete reviews and associated images from disk and database', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ image_path: 'uploads/reviews/img.png' }]]) // select review images
        .mockResolvedValueOnce([{}]); // delete review

      fs.existsSync.mockReturnValue(true);

      const result = await ReviewRepository.delete(50);
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('CommentRepository', () => {
    test('getByReviewId should return list of Comments', async () => {
      mockPool.query.mockResolvedValue([
        [
          {
            id: 1,
            review_id: 2,
            user_id: 3,
            content: 'Nice!',
            created_at: '2026-06-16',
            username: 'user3'
          }
        ]
      ]);

      const comments = await CommentRepository.getByReviewId(2);
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Nice!');
    });

    test('create should insert comment and return insertId', async () => {
      mockPool.query.mockResolvedValue([{ insertId: 99 }]);

      const commentId = await CommentRepository.create(2, 3, 'My comment');
      expect(commentId).toBe(99);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO comments (review_id, user_id, content) VALUES (?, ?, ?)',
        [2, 3, 'My comment']
      );
    });
  });

  describe('CategoryRepository', () => {
    test('getAll should return categories', async () => {
      mockPool.query.mockResolvedValue([
        [{ id: 1, name: 'Tiểu thuyết', is_default: 1 }]
      ]);

      const categories = await CategoryRepository.getAll();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Tiểu thuyết');
    });
  });
});
