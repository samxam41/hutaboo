const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { UserRepository, BookRepository, ReviewRepository, CommentRepository } = require('../repositories/review.repository');
const { Review, Comment } = require('../models/review.model');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-for-book-reviews';

/**
 * Middleware xác thực JSON Web Token (JWT)
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Định dạng: Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập để thực hiện hành động này.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
    }
    req.user = user; // Lưu thông tin đăng nhập vào req.user (id, username)
    next();
  });
};

/**
 * AuthController: Điều phối đăng ký, đăng nhập và lấy thông tin phiên hiện tại
 */
const AuthController = {
  async register(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password || username.trim() === '' || password.trim() === '') {
        return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu không được trống.' });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      }

      // Kiểm tra username đã tồn tại chưa
      const existingUser = await UserRepository.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
      }

      // Mã hóa mật khẩu bảo mật trước khi lưu
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await UserRepository.create(username, hashedPassword);

      return res.status(201).json({ message: 'Đăng ký tài khoản thành công.', userId });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await UserRepository.findByUsername(username);
      if (!user) {
        return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
      }

      // Ký JWT Token trả về client (hiệu lực 7 ngày)
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Đăng nhập thành công.',
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async getMe(req, res) {
    try {
      const user = await UserRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
      }
      return res.json({ id: user.id, username: user.username });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  }
};

/**
 * BookController: Lấy danh sách sách và lọc theo chủ đề
 */
const BookController = {
  async getAll(req, res) {
    try {
      const books = await BookRepository.getAll();
      return res.json(books);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async getById(req, res) {
    try {
      const book = await BookRepository.getById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Không tìm thấy sách.' });
      }
      return res.json(book);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async getByTopic(req, res) {
    try {
      const books = await BookRepository.getByTopic(req.params.topic);
      return res.json(books);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  }
};

/**
 * ReviewController: CRUD các bài review sách
 */
const ReviewController = {
  async getAll(req, res) {
    try {
      const reviews = await ReviewRepository.getAll();
      return res.json(reviews);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async getById(req, res) {
    try {
      const review = await ReviewRepository.getById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy bài review.' });
      }
      return res.json(review);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async getByBookId(req, res) {
    try {
      const reviews = await ReviewRepository.getByBookId(req.params.bookId);
      return res.json(reviews);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async create(req, res) {
    try {
      const { bookTitle, bookAuthor, rating, content } = req.body;
      const errorMsg = Review.validate({ bookTitle, bookAuthor, rating, content });
      if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
      }

      // Tự động tìm kiếm sách đã có hoặc tạo mới
      const bookId = await BookRepository.getOrCreate(bookTitle, bookAuthor);

      const reviewId = await ReviewRepository.create(req.user.id, bookId, rating, content);
      const newReview = await ReviewRepository.getById(reviewId);

      return res.status(201).json({ message: 'Đăng bài review thành công.', review: newReview });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async update(req, res) {
    try {
      const { rating, content } = req.body;
      const reviewId = req.params.id;

      const review = await ReviewRepository.getById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy bài review.' });
      }

      // Phân quyền: Chỉ tác giả mới được sửa bài của mình
      if (review.userId !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa bài review của người khác.' });
      }

      const errorMsg = Review.validate({ bookTitle: review.bookTitle, bookAuthor: review.bookAuthor, rating, content });
      if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
      }

      await ReviewRepository.update(reviewId, rating, content);
      const updatedReview = await ReviewRepository.getById(reviewId);

      return res.json({ message: 'Cập nhật review thành công.', review: updatedReview });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async delete(req, res) {
    try {
      const reviewId = req.params.id;
      const review = await ReviewRepository.getById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy bài review.' });
      }

      // Phân quyền: Chỉ tác giả mới được xóa bài của mình
      if (review.userId !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bài review của người khác.' });
      }

      await ReviewRepository.delete(reviewId);
      return res.json({ message: 'Xóa bài review thành công.' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  }
};

/**
 * CommentController: Quản lý đăng và xóa bình luận trong review
 */
const CommentController = {
  async getByReviewId(req, res) {
    try {
      const comments = await CommentRepository.getByReviewId(req.params.reviewId);
      return res.json(comments);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async create(req, res) {
    try {
      const { content } = req.body;
      const reviewId = req.params.reviewId;

      const errorMsg = Comment.validate({ content });
      if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
      }

      const review = await ReviewRepository.getById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Không tìm thấy bài review.' });
      }

      const commentId = await CommentRepository.create(reviewId, req.user.id, content);
      const comments = await CommentRepository.getByReviewId(reviewId);
      const newComment = comments.find(c => c.id === commentId);

      return res.status(201).json({ message: 'Gửi bình luận thành công.', comment: newComment });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  },

  async delete(req, res) {
    try {
      const commentId = req.params.id;
      const comment = await CommentRepository.getById(commentId);
      if (!comment) {
        return res.status(404).json({ message: 'Không tìm thấy bình luận.' });
      }

      // Phân quyền: Chỉ tác giả của bình luận mới được xóa bình luận đó
      if (comment.userId !== req.user.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
      }

      await CommentRepository.delete(commentId);
      return res.json({ message: 'Xóa bình luận thành công.' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
    }
  }
};

module.exports = {
  authenticateToken,
  AuthController,
  BookController,
  ReviewController,
  CommentController
};
