const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  AuthController,
  BookController,
  ReviewController,
  CommentController
} = require('../controllers/review.controller');

// ==========================================
// 1. ĐƯỜNG DẪN XÁC THỰC (AUTHENTICATION)
// ==========================================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.getMe);

// ==========================================
// 2. ĐƯỜNG DẪN SÁCH (BOOKS API) - Thiết kế mở rộng tích hợp
// ==========================================
router.get('/books', BookController.getAll);
router.get('/books/:id', BookController.getById);
router.get('/books/topic/:topic', BookController.getByTopic);

// ==========================================
// 3. ĐƯỜNG DẪN BÀI REVIEW (REVIEWS API)
// ==========================================
router.get('/reviews', ReviewController.getAll);
router.get('/reviews/:id', ReviewController.getById);
router.get('/reviews/book/:bookId', ReviewController.getByBookId);
router.post('/reviews', authenticateToken, ReviewController.create);
router.put('/reviews/:id', authenticateToken, ReviewController.update);
router.delete('/reviews/:id', authenticateToken, ReviewController.delete);

// ==========================================
// 4. ĐƯỜNG DẪN BÌNH LUẬN (COMMENTS API)
// ==========================================
router.get('/reviews/:reviewId/comments', CommentController.getByReviewId);
router.post('/reviews/:reviewId/comments', authenticateToken, CommentController.create);
router.delete('/comments/:id', authenticateToken, CommentController.delete);

module.exports = router;
