const db = require('../db/database');
const { Review, Book, Comment, User } = require('../models/review.model');

/**
 * UserRepository: Quản lý các câu lệnh SQL liên quan đến người dùng (users)
 */
class UserRepository {
  async findByUsername(username) {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new User(r.id, r.username, r.password);
  }

  async findById(id) {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new User(r.id, r.username, r.password);
  }

  async create(username, hashedPassword) {
    const pool = db.getPool();
    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    return result.insertId;
  }
}

/**
 * BookRepository: Quản lý các câu lệnh SQL liên quan đến sách (books)
 */
class BookRepository {
  async getAll() {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM books ORDER BY title ASC');
    return rows.map(r => new Book(r.id, r.title, r.author, r.topic));
  }

  async getById(id) {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new Book(r.id, r.title, r.author, r.topic);
  }

  async getOrCreate(title, author) {
    const pool = db.getPool();
    // Tìm kiếm xem sách đã tồn tại chưa (không phân biệt hoa thường)
    const [rows] = await pool.query(
      'SELECT id FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(author)) = LOWER(TRIM(?))',
      [title, author]
    );
    
    if (rows.length > 0) {
      return rows[0].id;
    }

    // Nếu chưa tồn tại, tự động tạo mới sách
    const [result] = await pool.query(
      'INSERT INTO books (title, author, topic) VALUES (?, ?, ?)',
      [title.trim(), author.trim(), 'Khác']
    );
    return result.insertId;
  }

  async getByTopic(topic) {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM books WHERE topic = ? ORDER BY title ASC', [topic]);
    return rows.map(r => new Book(r.id, r.title, r.author, r.topic));
  }
}

/**
 * ReviewRepository: Quản lý các câu lệnh SQL liên quan đến bài review sách (reviews)
 */
class ReviewRepository {
  async getAll() {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query);
    return rows.map(r => new Review(
      r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
      r.username, r.bookTitle, r.bookAuthor
    ));
  }

  async getById(id) {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new Review(
      r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
      r.username, r.bookTitle, r.bookAuthor
    );
  }

  async getByBookId(bookId) {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.book_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query, [bookId]);
    return rows.map(r => new Review(
      r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
      r.username, r.bookTitle, r.bookAuthor
    ));
  }

  async create(userId, bookId, rating, content) {
    const pool = db.getPool();
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, book_id, rating, content) VALUES (?, ?, ?, ?)',
      [userId, bookId, rating, content]
    );
    return result.insertId;
  }

  async update(id, rating, content) {
    const pool = db.getPool();
    await pool.query(
      'UPDATE reviews SET rating = ?, content = ? WHERE id = ?',
      [rating, content, id]
    );
    return true;
  }

  async delete(id) {
    const pool = db.getPool();
    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return true;
  }
}

/**
 * CommentRepository: Quản lý các câu lệnh SQL liên quan đến bình luận (comments)
 */
class CommentRepository {
  async getByReviewId(reviewId) {
    const pool = db.getPool();
    const query = `
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.review_id = ?
      ORDER BY c.created_at ASC
    `;
    const [rows] = await pool.query(query, [reviewId]);
    return rows.map(r => new Comment(
      r.id, r.review_id, r.user_id, r.content, r.created_at, r.username
    ));
  }

  async getById(id) {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new Comment(r.id, r.review_id, r.user_id, r.content, r.created_at);
  }

  async create(reviewId, userId, content) {
    const pool = db.getPool();
    const [result] = await pool.query(
      'INSERT INTO comments (review_id, user_id, content) VALUES (?, ?, ?)',
      [reviewId, userId, content]
    );
    return result.insertId;
  }

  async delete(id) {
    const pool = db.getPool();
    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
    return true;
  }
}

// Export các instance đơn lẻ đại diện cho các Repository (Repository Pattern)
module.exports = {
  UserRepository: new UserRepository(),
  BookRepository: new BookRepository(),
  ReviewRepository: new ReviewRepository(),
  CommentRepository: new CommentRepository()
};
