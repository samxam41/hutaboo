const mockUserRepository = {
  findByUsername: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
};

const mockBookRepository = {
  getAll: jest.fn(),
  getById: jest.fn(),
  getOrCreate: jest.fn(),
  getByTopic: jest.fn(),
  searchBooks: jest.fn(),
  updateRating: jest.fn(),
  updateCoverFromReview: jest.fn(),
  updateTags: jest.fn()
};

const mockReviewRepository = {
  getAll: jest.fn(),
  getById: jest.fn(),
  getByBookId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

const mockCommentRepository = {
  getByReviewId: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn()
};

const mockCategoryRepository = {
  getAll: jest.fn()
};

// Mock repositories
jest.mock('../repositories/review.repository', () => {
  return {
    UserRepository: mockUserRepository,
    BookRepository: mockBookRepository,
    ReviewRepository: mockReviewRepository,
    CommentRepository: mockCommentRepository,
    CategoryRepository: mockCategoryRepository
  };
});

// Mock fs to avoid physical file writes during controller image upload test
jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn()
  };
});

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  AuthController,
  BookController,
  ReviewController,
  CommentController,
  CategoryController,
  authenticateToken
} = require('./review.controller');

const JWT_SECRET = 'secret-key-for-book-reviews';

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Controllers Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken Middleware', () => {
    test('should return 401 if no authorization header', () => {
      const req = { headers: {} };
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn cần đăng nhập để thực hiện hành động này.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if invalid token', () => {
      const req = { headers: { authorization: 'Bearer invalidtoken' } };
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next and set req.user if token is valid', () => {
      const userPayload = { id: 1, username: 'testuser' };
      const token = jwt.sign(userPayload, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      const next = jest.fn();

      authenticateToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject(userPayload);
    });
  });

  describe('AuthController', () => {
    test('register should create user and return 201', async () => {
      const req = {
        body: { username: 'newuser', password: 'password123' }
      };
      const res = mockResponse();
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(10);

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Đăng ký tài khoản thành công.',
        userId: 10
      }));
    });

    test('register should return 400 if username already exists', async () => {
      const req = {
        body: { username: 'existinguser', password: 'password123' }
      };
      const res = mockResponse();
      mockUserRepository.findByUsername.mockResolvedValue({ id: 1, username: 'existinguser' });

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tên đăng nhập đã tồn tại.' });
    });

    test('login should return token when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const req = {
        body: { username: 'testuser', password: 'password123' }
      };
      const res = mockResponse();
      mockUserRepository.findByUsername.mockResolvedValue({
        id: 5,
        username: 'testuser',
        password: hashedPassword
      });

      await AuthController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Đăng nhập thành công.',
        token: expect.any(String),
        user: { id: 5, username: 'testuser' }
      }));
    });

    test('login should return 400 if user not found', async () => {
      const req = {
        body: { username: 'nonexistent', password: 'password123' }
      };
      const res = mockResponse();
      mockUserRepository.findByUsername.mockResolvedValue(null);

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    });
  });

  describe('BookController', () => {
    test('getAll should search books if search query is provided', async () => {
      const req = { query: { search: 'Conan' } };
      const res = mockResponse();
      mockBookRepository.searchBooks.mockResolvedValue([{ id: 1, title: 'Thám tử lừng danh Conan' }]);

      await BookController.getAll(req, res);

      expect(mockBookRepository.searchBooks).toHaveBeenCalledWith('Conan');
      expect(res.json).toHaveBeenCalledWith([{ id: 1, title: 'Thám tử lừng danh Conan' }]);
    });

    test('getAll should return all books if no search query', async () => {
      const req = { query: {} };
      const res = mockResponse();
      mockBookRepository.getAll.mockResolvedValue([{ id: 1, title: 'Book 1' }]);

      await BookController.getAll(req, res);

      expect(mockBookRepository.getAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 1, title: 'Book 1' }]);
    });
  });

  describe('ReviewController', () => {
    test('create should return 201 with created review', async () => {
      const req = {
        user: { id: 5 },
        body: {
          bookTitle: 'Clean Code',
          bookAuthor: 'Robert C. Martin',
          rating: 5,
          content: 'Excellent coding book'
        }
      };
      const res = mockResponse();
      mockBookRepository.getOrCreate.mockResolvedValue(20);
      mockReviewRepository.create.mockResolvedValue(30);
      mockReviewRepository.getById.mockResolvedValue({ id: 30, content: 'Excellent coding book' });

      await ReviewController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Đăng bài review thành công.',
        review: { id: 30, content: 'Excellent coding book' }
      }));
    });

    test('create should return 400 if validation fails', async () => {
      const req = {
        user: { id: 5 },
        body: {
          bookTitle: '',
          bookAuthor: 'Robert C. Martin',
          rating: 5,
          content: 'Too short'
        }
      };
      const res = mockResponse();

      await ReviewController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('update should return 200 and updated review', async () => {
      const req = {
        user: { id: 5 },
        params: { id: 30 },
        body: {
          rating: 4,
          content: 'Updated coding review content'
        }
      };
      const res = mockResponse();

      // Return review with same author (userId = 5)
      mockReviewRepository.getById
        .mockResolvedValueOnce({ id: 30, userId: 5, bookId: 20, bookTitle: 'Clean Code', bookAuthor: 'Martin' })
        .mockResolvedValueOnce({ id: 30, rating: 4, content: 'Updated coding review content' });

      await ReviewController.update(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Cập nhật review thành công.',
        review: { id: 30, rating: 4, content: 'Updated coding review content' }
      }));
    });

    test('update should return 403 if user is not the author', async () => {
      const req = {
        user: { id: 6 }, // Different user
        params: { id: 30 },
        body: { rating: 4, content: 'Updated content' }
      };
      const res = mockResponse();
      mockReviewRepository.getById.mockResolvedValue({ id: 30, userId: 5 }); // Author is 5

      await ReviewController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không có quyền chỉnh sửa bài review của người khác.' });
    });
  });

  describe('CommentController', () => {
    test('create should return 201 with the comment', async () => {
      const req = {
        user: { id: 5 },
        params: { reviewId: 30 },
        body: { content: 'My new comment' }
      };
      const res = mockResponse();
      mockReviewRepository.getById.mockResolvedValue({ id: 30 });
      mockCommentRepository.create.mockResolvedValue(100);
      mockCommentRepository.getByReviewId.mockResolvedValue([{ id: 100, content: 'My new comment' }]);

      await CommentController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Gửi bình luận thành công.',
        comment: { id: 100, content: 'My new comment' }
      }));
    });
  });
});
