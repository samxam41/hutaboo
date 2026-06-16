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
    const query = `
      SELECT b.*, 
             COALESCE(r_stats.reviewCount, 0) as reviewCount, 
             COALESCE(r_stats.averageRating, 0) as averageRating
      FROM books b
      LEFT JOIN (
        SELECT book_id, 
               COUNT(id) as reviewCount, 
               AVG(rating) as averageRating
        FROM reviews
        GROUP BY book_id
      ) r_stats ON b.id = r_stats.book_id
      ORDER BY b.title ASC
    `;
    const [rows] = await pool.query(query);
    return rows.map(r => new Book(
      r.id, r.title, r.author, r.tags, 
      parseFloat(r.averageRating || 0), 
      parseInt(r.reviewCount || 0), 
      r.description, r.image
    ));
  }

  async getById(id) {
    const pool = db.getPool();
    const query = `
      SELECT b.*, 
             COALESCE(r_stats.reviewCount, 0) as reviewCount, 
             COALESCE(r_stats.averageRating, 0) as averageRating
      FROM books b
      LEFT JOIN (
        SELECT book_id, 
               COUNT(id) as reviewCount, 
               AVG(rating) as averageRating
        FROM reviews
        GROUP BY book_id
      ) r_stats ON b.id = r_stats.book_id
      WHERE b.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new Book(
      r.id, r.title, r.author, r.tags, 
      parseFloat(r.averageRating || 0), 
      parseInt(r.reviewCount || 0), 
      r.description, r.image
    );
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

    // Nếu chưa tồn tại, tự động tạo mới sách với các chỉ số rating/reviews mặc định là 0
    // Đánh dấu is_user_added = true để áp dụng logic ảnh bìa động từ review
    const [result] = await pool.query(
      'INSERT INTO books (title, author, tags, average_rating, review_count, description, image, is_user_added) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), author.trim(), 'Khác', 0.00, 0, 'Chưa có mô tả cho cuốn sách này.', 'uploads/covers/default_cover.svg', true]
    );
    return result.insertId;
  }

  async getByTopic(topic) {
    const pool = db.getPool();
    const cleanTopic = `%${topic.trim()}%`;
    const query = `
      SELECT b.*, 
             COALESCE(r_stats.reviewCount, 0) as reviewCount, 
             COALESCE(r_stats.averageRating, 0) as averageRating
      FROM books b
      LEFT JOIN (
        SELECT book_id, 
               COUNT(id) as reviewCount, 
               AVG(rating) as averageRating
        FROM reviews
        GROUP BY book_id
      ) r_stats ON b.id = r_stats.book_id
      WHERE b.tags LIKE ?
      ORDER BY b.title ASC
    `;
    const [rows] = await pool.query(query, [cleanTopic]);
    return rows.map(r => new Book(
      r.id, r.title, r.author, r.tags, 
      parseFloat(r.averageRating || 0), 
      parseInt(r.reviewCount || 0), 
      r.description, r.image
    ));
  }

  async searchBooks(keyword) {
    const pool = db.getPool();
    const cleanKey = `%${keyword.trim()}%`;
    const query = `
      SELECT b.*, 
             COALESCE(r_stats.reviewCount, 0) as reviewCount, 
             COALESCE(r_stats.averageRating, 0) as averageRating
      FROM books b
      LEFT JOIN (
        SELECT book_id, 
               COUNT(id) as reviewCount, 
               AVG(rating) as averageRating
        FROM reviews
        GROUP BY book_id
      ) r_stats ON b.id = r_stats.book_id
      WHERE b.title LIKE ? OR b.author LIKE ? OR b.tags LIKE ?
      ORDER BY b.title ASC
    `;
    const [rows] = await pool.query(query, [cleanKey, cleanKey, cleanKey]);
    return rows.map(r => new Book(
      r.id, r.title, r.author, r.tags, 
      parseFloat(r.averageRating || 0), 
      parseInt(r.reviewCount || 0), 
      r.description, r.image
    ));
  }

  // Phương thức tĩnh được tối ưu hóa để không làm gì do đã tính động
  async updateRating(bookId) {
    // No-op
  }

  // Tự động cập nhật ảnh bìa sách từ ảnh của bài review được đăng sớm nhất có ảnh (Chỉ áp dụng cho sách do người dùng thêm mới)
  async updateCoverFromReview(bookId) {
    const pool = db.getPool();
    const fs = require('fs');
    const path = require('path');
    
    try {
      // 1. Kiểm tra xem sách có phải là sách do người dùng tự thêm (is_user_added = true) hay không
      const [bookRows] = await pool.query('SELECT image, is_user_added FROM books WHERE id = ?', [bookId]);
      if (bookRows.length === 0) return;

      const isUserAdded = bookRows[0].is_user_added;
      const currentCover = bookRows[0].image || '';

      if (isUserAdded) {
        // Tìm ảnh của bài review đăng sớm nhất cho cuốn sách này
        const query = `
          SELECT ri.image_path 
          FROM reviews r
          JOIN review_images ri ON r.id = ri.review_id
          WHERE r.book_id = ?
          ORDER BY r.created_at ASC, r.id ASC, ri.id ASC
          LIMIT 1
        `;
        const [rows] = await pool.query(query, [bookId]);

        if (rows.length > 0) {
          const earliestImagePath = rows[0].image_path;
          const sourceFullPath = path.join(__dirname, '../public', earliestImagePath);
          
          if (fs.existsSync(sourceFullPath)) {
            const ext = path.extname(earliestImagePath);
            const coverRelativePath = `uploads/covers/cover-${bookId}${ext}`;
            const destFullPath = path.join(__dirname, '../public', coverRelativePath);
            
            const coversDir = path.dirname(destFullPath);
            if (!fs.existsSync(coversDir)) {
              fs.mkdirSync(coversDir, { recursive: true });
            }
            
            fs.copyFileSync(sourceFullPath, destFullPath);
            await pool.query('UPDATE books SET image = ? WHERE id = ?', [coverRelativePath, bookId]);
            console.log(`[BookRepository] Đã cập nhật ảnh bìa thành công cho sách ID ${bookId} thành ${coverRelativePath} (từ review đăng sớm nhất)`);
          } else {
            console.warn(`[BookRepository] File ảnh nguồn của review không tồn tại: ${sourceFullPath}`);
          }
        } else {
          // Nếu không còn bài review nào có ảnh, reset về default_cover.svg
          const defaultCover = 'uploads/covers/default_cover.svg';
          await pool.query('UPDATE books SET image = ? WHERE id = ?', [defaultCover, bookId]);
          console.log(`[BookRepository] Không còn bài review nào có ảnh cho sách ID ${bookId}, đã reset ảnh bìa về mặc định.`);
        }
      } else {
        console.log(`[BookRepository] Bỏ qua cập nhật ảnh bìa cho sách ID ${bookId} vì sách này đã có sẵn do admin/đại diện thêm cố định: ${currentCover}`);
      }
    } catch (err) {
      console.error('[BookRepository] Lỗi cập nhật ảnh bìa từ review sớm nhất:', err.message);
    }
  }
}

/**
 * ReviewRepository: Quản lý các câu lệnh SQL liên quan đến bài review sách (reviews)
 */
class ReviewRepository {
  async getAll() {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor, b.tags as bookTopic
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query);
    if (rows.length === 0) return [];

    const reviews = rows.map(r => {
      const review = new Review(
        r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
        r.username, r.bookTitle, r.bookAuthor, r.bookTopic
      );
      review.categories = [];
      review.categoryIds = [];
      review.images = [];
      return review;
    });

    const reviewIds = reviews.map(r => r.id);
    const [catRows] = await pool.query(`
      SELECT rc.review_id, c.id as category_id, c.name as category_name
      FROM review_categories rc
      JOIN categories c ON rc.category_id = c.id
      WHERE rc.review_id IN (?)
    `, [reviewIds]);

    const [imgRows] = await pool.query(`
      SELECT review_id, image_path
      FROM review_images
      WHERE review_id IN (?)
    `, [reviewIds]);

    for (const row of catRows) {
      const review = reviews.find(r => r.id === row.review_id);
      if (review) {
        review.categories.push(row.category_name);
        review.categoryIds.push(row.category_id);
      }
    }

    for (const row of imgRows) {
      const review = reviews.find(r => r.id === row.review_id);
      if (review) {
        review.images.push(row.image_path);
      }
    }

    console.log(`[ReviewRepository - getAll] Đã nạp thể loại cho ${reviews.length} reviews. Chi tiết ánh xạ:`, 
      reviews.map(r => ({ id: r.id, title: r.bookTitle, categories: r.categories }))
    );

    return reviews;
  }

  async getById(id) {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor, b.tags as bookTopic
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    const review = new Review(
      r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
      r.username, r.bookTitle, r.bookAuthor, r.bookTopic
    );
    review.categories = [];
    review.categoryIds = [];
    review.images = [];

    const [catRows] = await pool.query(`
      SELECT c.id, c.name
      FROM review_categories rc
      JOIN categories c ON rc.category_id = c.id
      WHERE rc.review_id = ?
    `, [id]);
    for (const row of catRows) {
      review.categories.push(row.name);
      review.categoryIds.push(row.id);
    }

    const [imgRows] = await pool.query(`
      SELECT image_path
      FROM review_images
      WHERE review_id = ?
    `, [id]);
    for (const row of imgRows) {
      review.images.push(row.image_path);
    }

    console.log(`[ReviewRepository - getById] Chi tiết review ID ${id} được truy vấn:`, {
      id: review.id,
      title: review.bookTitle,
      categories: review.categories,
      categoryIds: review.categoryIds
    });

    return review;
  }

  async getByBookId(bookId) {
    const pool = db.getPool();
    const query = `
      SELECT r.*, u.username, b.title as bookTitle, b.author as bookAuthor, b.tags as bookTopic
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN books b ON r.book_id = b.id
      WHERE r.book_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await pool.query(query, [bookId]);
    if (rows.length === 0) return [];

    const reviews = rows.map(r => {
      const review = new Review(
        r.id, r.user_id, r.book_id, r.rating, r.content, r.created_at,
        r.username, r.bookTitle, r.bookAuthor, r.bookTopic
      );
      review.categories = [];
      review.categoryIds = [];
      review.images = [];
      return review;
    });

    const reviewIds = reviews.map(r => r.id);
    const [catRows] = await pool.query(`
      SELECT rc.review_id, c.id as category_id, c.name as category_name
      FROM review_categories rc
      JOIN categories c ON rc.category_id = c.id
      WHERE rc.review_id IN (?)
    `, [reviewIds]);

    const [imgRows] = await pool.query(`
      SELECT review_id, image_path
      FROM review_images
      WHERE review_id IN (?)
    `, [reviewIds]);

    for (const row of catRows) {
      const review = reviews.find(r => r.id === row.review_id);
      if (review) {
        review.categories.push(row.category_name);
        review.categoryIds.push(row.category_id);
      }
    }

    for (const row of imgRows) {
      const review = reviews.find(r => r.id === row.review_id);
      if (review) {
        review.images.push(row.image_path);
      }
    }

    console.log(`[ReviewRepository - getByBookId] Đã nạp thể loại cho ${reviews.length} reviews của book ID ${bookId}. Chi tiết ánh xạ:`, 
      reviews.map(r => ({ id: r.id, title: r.bookTitle, categories: r.categories }))
    );

    return reviews;
  }

  async create(userId, bookId, rating, content, categoryIds = [], customCategories = [], imagePaths = []) {
    const pool = db.getPool();
    console.log('[ReviewRepository - Create] Đang bắt đầu lưu review:', { userId, bookId, rating, content, categoryIds, customCategories, imagePaths });
    
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, book_id, rating, content) VALUES (?, ?, ?, ?)',
      [userId, bookId, rating, content]
    );
    const reviewId = result.insertId;
    console.log('[ReviewRepository - Create] Đã insert bảng reviews. ID mới:', reviewId);

    if (categoryIds && categoryIds.length > 0) {
      console.log('[ReviewRepository - Create] Lưu thể loại mặc định liên kết:', categoryIds);
      const reviewCategories = categoryIds.map(catId => [reviewId, catId]);
      await pool.query(
        'INSERT INTO review_categories (review_id, category_id) VALUES ?',
        [reviewCategories]
      );
    }

    if (customCategories && customCategories.length > 0) {
      console.log('[ReviewRepository - Create] Lưu các thể loại tùy chỉnh:', customCategories);
      for (const name of customCategories) {
        const cleanName = name.trim();
        if (cleanName.length === 0) continue;
        
        let [catRows] = await pool.query('SELECT id FROM categories WHERE name = ?', [cleanName]);
        let catId;
        if (catRows.length === 0) {
          const [insertRes] = await pool.query('INSERT INTO categories (name, is_default) VALUES (?, ?)', [cleanName, false]);
          catId = insertRes.insertId;
          console.log(`[ReviewRepository - Create] Đã tạo mới thể loại tùy chỉnh "${cleanName}" với ID: ${catId}`);
        } else {
          catId = catRows[0].id;
          console.log(`[ReviewRepository - Create] Thể loại tùy chỉnh "${cleanName}" đã tồn tại với ID: ${catId}`);
        }
        await pool.query('INSERT IGNORE INTO review_categories (review_id, category_id) VALUES (?, ?)', [reviewId, catId]);
        console.log(`[ReviewRepository - Create] Đã liên kết review ${reviewId} với thể loại ID ${catId}`);
      }
    }

    if (imagePaths && imagePaths.length > 0) {
      const reviewImages = imagePaths.map(p => [reviewId, p]);
      await pool.query(
        'INSERT INTO review_images (review_id, image_path) VALUES ?',
        [reviewImages]
      );
    }

    return reviewId;
  }

  async update(id, rating, content, categoryIds = [], customCategories = [], imagePaths = []) {
    const pool = db.getPool();
    const fs = require('fs');
    const path = require('path');
    console.log('[ReviewRepository - Update] Đang bắt đầu cập nhật review ID:', id, { rating, content, categoryIds, customCategories, imagePaths });

    await pool.query(
      'UPDATE reviews SET rating = ?, content = ? WHERE id = ?',
      [rating, content, id]
    );

    console.log('[ReviewRepository - Update] Đang xóa liên kết thể loại cũ của review:', id);
    await pool.query('DELETE FROM review_categories WHERE review_id = ?', [id]);

    if (categoryIds && categoryIds.length > 0) {
      console.log('[ReviewRepository - Update] Lưu lại thể loại mặc định liên kết:', categoryIds);
      const reviewCategories = categoryIds.map(catId => [id, catId]);
      await pool.query(
        'INSERT INTO review_categories (review_id, category_id) VALUES ?',
        [reviewCategories]
      );
    }

    if (customCategories && customCategories.length > 0) {
      console.log('[ReviewRepository - Update] Lưu lại các thể loại tùy chỉnh:', customCategories);
      for (const name of customCategories) {
        const cleanName = name.trim();
        if (cleanName.length === 0) continue;
        
        let [catRows] = await pool.query('SELECT id FROM categories WHERE name = ?', [cleanName]);
        let catId;
        if (catRows.length === 0) {
          const [insertRes] = await pool.query('INSERT INTO categories (name, is_default) VALUES (?, ?)', [cleanName, false]);
          catId = insertRes.insertId;
          console.log(`[ReviewRepository - Update] Đã tạo mới thể loại tùy chỉnh "${cleanName}" với ID: ${catId}`);
        } else {
          catId = catRows[0].id;
          console.log(`[ReviewRepository - Update] Thể loại tùy chỉnh "${cleanName}" đã tồn tại với ID: ${catId}`);
        }
        await pool.query('INSERT IGNORE INTO review_categories (review_id, category_id) VALUES (?, ?)', [id, catId]);
        console.log(`[ReviewRepository - Update] Đã liên kết review ${id} với thể loại ID ${catId}`);
      }
    }

    const [oldImgRows] = await pool.query('SELECT image_path FROM review_images WHERE review_id = ?', [id]);
    const oldPaths = oldImgRows.map(r => r.image_path);

    const pathsToDelete = oldPaths.filter(p => !imagePaths.includes(p));
    const pathsToAdd = imagePaths.filter(p => !oldPaths.includes(p));

    for (const imgPath of pathsToDelete) {
      const fullPath = path.join(__dirname, '../public', imgPath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error('[Repository] Lỗi khi xóa file ảnh vật lý:', err.message);
        }
      }
      await pool.query('DELETE FROM review_images WHERE review_id = ? AND image_path = ?', [id, imgPath]);
    }

    if (pathsToAdd.length > 0) {
      const reviewImages = pathsToAdd.map(p => [id, p]);
      await pool.query(
        'INSERT INTO review_images (review_id, image_path) VALUES ?',
        [reviewImages]
      );
    }

    return true;
  }

  async delete(id) {
    const pool = db.getPool();
    const fs = require('fs');
    const path = require('path');

    const [imgRows] = await pool.query('SELECT image_path FROM review_images WHERE review_id = ?', [id]);
    for (const r of imgRows) {
      const fullPath = path.join(__dirname, '../public', r.image_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err) {
          console.error('[Repository] Lỗi khi xóa file ảnh vật lý lúc xóa review:', err.message);
        }
      }
    }

    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    return true;
  }
}

class CategoryRepository {
  async getAll() {
    const pool = db.getPool();
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY is_default DESC, name ASC');
    return rows;
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
  CommentRepository: new CommentRepository(),
  CategoryRepository: new CategoryRepository()
};
