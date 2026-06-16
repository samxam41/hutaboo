// Set the database name to hutaboo_test before loading any DB connection
process.env.DB_NAME = 'hutaboo_test';

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const routes = require('./review.routes');

// Create a standalone express app to run API integration tests
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', routes);

describe('API Integration Tests (hutaboo_test)', () => {
  let authToken = '';
  let testUserId = null;
  let testBookId = null;
  let testReviewId = null;
  let testCommentId = null;
  const createdPhysicalFiles = [];

  beforeAll(async () => {
    // Initialize test database: creates hutaboo_test, sets up tables, seeds initial books and categories
    console.log('[Test Setup] Initializing test database...');
    await db.initialize();
  });

  afterAll(async () => {
    console.log('[Test Teardown] Cleaning up integration tests...');
    
    // 1. Delete physical files created during tests
    for (const fileRelativePath of createdPhysicalFiles) {
      const fullPath = path.join(__dirname, '../public', fileRelativePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`[Test Teardown] Deleted physical test upload: ${fileRelativePath}`);
        } catch (err) {
          console.error(`[Test Teardown] Error deleting file ${fileRelativePath}:`, err.message);
        }
      }
    }

    // 2. Drop the test database and close connection
    try {
      const pool = db.getPool();
      await pool.query('DROP DATABASE IF EXISTS `hutaboo_test`');
      console.log('[Test Teardown] Dropped test database hutaboo_test successfully.');
      await pool.end();
    } catch (error) {
      console.error('[Test Teardown] Error dropping test database:', error.message);
    }
  });

  describe('Authentication API', () => {
    const testUser = {
      username: 'integration_tester',
      password: 'password123'
    };

    test('POST /api/auth/register - should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body.message).toBe('Đăng ký tài khoản thành công.');
      testUserId = res.body.userId;
    });

    test('POST /api/auth/register - should fail registering duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Tên đăng nhập đã tồn tại.');
    });

    test('POST /api/auth/login - should authenticate user and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(testUser);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id', testUserId);
      authToken = res.body.token;
    });

    test('POST /api/auth/login - should fail with wrong credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Tên đăng nhập hoặc mật khẩu không chính xác.');
    });

    test('GET /api/auth/me - should return logged-in user profile with correct token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.id).toBe(testUserId);
    });

    test('GET /api/auth/me - should return 401 without authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('Books API', () => {
    test('GET /api/books - should return initial list of seeded books (length >= 5)', async () => {
      const res = await request(app)
        .get('/api/books');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(5);

      // Check if seeded book Doraemon exists
      const doraemon = res.body.find(b => b.title === 'Doraemon');
      expect(doraemon).toBeDefined();
      testBookId = doraemon.id;
    });

    test('GET /api/books/:id - should return details of specific book', async () => {
      const res = await request(app)
        .get(`/api/books/${testBookId}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Doraemon');
      expect(res.body.author).toBe('Fujiko F. Fujio');
    });

    test('GET /api/books/topic/:topic - should search books by category/tag', async () => {
      const res = await request(app)
        .get('/api/books/topic/Manga');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Categories API', () => {
    test('GET /api/categories - should return default categories list', async () => {
      const res = await request(app)
        .get('/api/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(10);
      
      const novel = res.body.find(c => c.name === 'Tiểu thuyết');
      expect(novel).toBeDefined();
    });
  });

  describe('Upload API', () => {
    test('POST /api/reviews/upload - should upload Base64 images successfully', async () => {
      // 1x1 transparent PNG image base64
      const validBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const res = await request(app)
        .post('/api/reviews/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          images: [validBase64]
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Upload ảnh thành công.');
      expect(Array.isArray(res.body.imagePaths)).toBe(true);
      expect(res.body.imagePaths.length).toBe(1);
      
      // Track file path for cleanup
      createdPhysicalFiles.push(res.body.imagePaths[0]);
    });

    test('POST /api/reviews/upload - should fail with invalid image extension', async () => {
      const invalidBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // GIF not supported
      
      const res = await request(app)
        .post('/api/reviews/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          images: [invalidBase64]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Định dạng ảnh không được hỗ trợ');
    });
  });

  describe('Reviews and Comments API Flow', () => {
    test('POST /api/reviews - should write review and auto create new book if not exists', async () => {
      const payload = {
        bookTitle: 'Số Đỏ',
        bookAuthor: 'Vũ Trọng Phụng',
        rating: 5,
        content: 'Một kiệt tác trào phúng xuất sắc của văn học Việt Nam hiện đại.',
        categoryIds: [1],
        customCategories: ['Trào phúng', 'Việt Nam'],
        imagePaths: createdPhysicalFiles // Link the uploaded test image
      };

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Đăng bài review thành công.');
      expect(res.body.review).toBeDefined();
      expect(res.body.review.bookTitle).toBe('Số Đỏ');
      expect(res.body.review.rating).toBe(5);
      
      testReviewId = res.body.review.id;
      
      // Verify book cover was updated dynamically
      const bookRes = await request(app).get(`/api/books/${res.body.review.bookId}`);
      expect(bookRes.body.image).toContain('uploads/covers/cover-');
    });

    test('GET /api/reviews - should return list of reviews', async () => {
      const res = await request(app)
        .get('/api/reviews');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const createdReview = res.body.find(r => r.id === testReviewId);
      expect(createdReview).toBeDefined();
      expect(createdReview.username).toBe('integration_tester');
    });

    test('POST /api/reviews/:reviewId/comments - should write comment successfully', async () => {
      const commentPayload = {
        content: 'Bình luận thử nghiệm tích hợp: Sách rất hay!'
      };

      const res = await request(app)
        .post(`/api/reviews/${testReviewId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Gửi bình luận thành công.');
      expect(res.body.comment.content).toBe(commentPayload.content);
      
      testCommentId = res.body.comment.id;
    });

    test('GET /api/reviews/:reviewId/comments - should fetch list of comments of a review', async () => {
      const res = await request(app)
        .get(`/api/reviews/${testReviewId}/comments`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(testCommentId);
    });

    test('DELETE /api/comments/:id - should delete comment successfully', async () => {
      const res = await request(app)
        .delete(`/api/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Xóa bình luận thành công.');

      // Verify comment is deleted
      const checkRes = await request(app).get(`/api/reviews/${testReviewId}/comments`);
      expect(checkRes.body.length).toBe(0);
    });

    test('DELETE /api/reviews/:id - should delete review successfully', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Xóa bài review thành công.');

      // Verify review is deleted
      const checkRes = await request(app).get(`/api/reviews/${testReviewId}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
