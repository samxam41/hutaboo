const mysql = require('mysql2/promise');

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    const host = 'localhost';
    const user =  'root';
    const password =  '040105';

    // Khởi tạo connection pool ban đầu không có database để có thể tạo database nếu chưa tồn tại
    this.pool = mysql.createPool({
      host,
      user,
      password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    Database.instance = this;
  }

  /**
   * Khởi tạo database, tạo các bảng và chèn dữ liệu mẫu
   */
  async initialize() {
    try {
      const dbName = process.env.DB_NAME || 'hutaboo';
      
      // 1. Tạo database nếu chưa tồn tại
      await this.pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      
      // 2. Đóng pool cũ và kết nối lại tới database cụ thể
      await this.pool.end();

      const host = 'localhost';
      const user = 'root';
      const password = '040105';

      this.pool = mysql.createPool({
        host,
        user,
        password,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      console.log(`[Database] Đã kết nối thành công tới database: ${dbName}`);

      // 3. Khởi tạo các bảng dữ liệu
      await this.createTables();
    } catch (error) {
      console.error('[Database] Lỗi khởi tạo cơ sở dữ liệu:', error.message);
      throw error;
    }
  }

  /**
   * Tạo cấu trúc các bảng theo yêu cầu thiết kế hợp nhất
   */
  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    // Bảng books tích hợp đầy đủ các cột mới từ SQLite của dự án desktop
    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        tags VARCHAR(255) DEFAULT NULL,
        average_rating DECIMAL(3,2) DEFAULT 0.00,
        review_count INT DEFAULT 0,
        description TEXT DEFAULT NULL,
        image VARCHAR(255) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createReviewsTable = `
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        is_default BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createReviewCategoriesTable = `
      CREATE TABLE IF NOT EXISTS review_categories (
        review_id INT NOT NULL,
        category_id INT NOT NULL,
        PRIMARY KEY (review_id, category_id),
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const createReviewImagesTable = `
      CREATE TABLE IF NOT EXISTS review_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        image_path VARCHAR(255) NOT NULL,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await this.pool.query(createUsersTable);
    await this.pool.query(createBooksTable);
    await this.pool.query(createReviewsTable);
    await this.pool.query(createCommentsTable);
    await this.pool.query(createCategoriesTable);
    await this.pool.query(createReviewCategoriesTable);
    await this.pool.query(createReviewImagesTable);

    console.log('[Database] Cấu trúc các bảng dữ liệu đã được kiểm tra/khởi tạo.');

    // Seed thể loại mặc định
    const [categoriesCount] = await this.pool.query('SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE');
    if (categoriesCount[0].count === 0) {
      const defaultCategories = [
        ['Tiểu thuyết', true],
        ['Trinh thám', true],
        ['Khoa học viễn tưởng', true],
        ['Fantasy', true],
        ['Ngôn tình', true],
        ['Kinh dị', true],
        ['Phiêu lưu', true],
        ['Hành động', true],
        ['Tâm lý', true],
        ['Lịch sử', true],
        ['Giáo dục', true],
        ['Kỹ năng sống', true],
        ['Kinh doanh', true],
        ['Công nghệ', true],
        ['Khác', true]
      ];
      await this.pool.query(
        'INSERT INTO categories (name, is_default) VALUES ?',
        [defaultCategories]
      );
      console.log('[Database] Đã nạp dữ liệu thể loại mặc định (seeding).');
    }

    // Seed sách mặc định từ SQLite (Doraemon, One Piece, Mắt Biếc, Harry Potter, Conan)
    const [books] = await this.pool.query('SELECT COUNT(*) as count FROM books');
    if (books[0].count === 0) {
      const seedBooks = [
        ['Doraemon', 'Fujiko F. Fujio', 'Manga, Thiếu nhi, Viễn tưởng, Hài hước', 4.5, 1250, 'Chú mèo máy thông minh đến từ tương lai với chiếc túi thần kỳ chứa các bảo bối tiện ích giúp đỡ cậu bạn Nobita hậu đậu.', './images/doraemon.svg'],
        ['One Piece', 'Eiichiro Oda', 'Manga, Phiêu lưu, Hành động', 4.9, 5000, 'Hành trình hải tặc đầy cảm hứng về tình bạn của Monkey D. Luffy và băng Mũ Rơm trên con đường đi tìm kho báu huyền thoại One Piece.', './images/onepiece.svg'],
        ['Mắt Biếc', 'Nguyễn Nhật Ánh', 'Văn học Việt Nam, Tình cảm, Lãng mạn', 5.0, 5500, 'Câu chuyện tình đơn phương đầy day dứt và hoài niệm của Ngạn dành cho Hà Lan - cô bạn thanh mai trúc mã có đôi mắt biếc sâu thẳm.', './images/matbiec.svg'],
        ['Harry Potter', 'J.K. Rowling', 'Tiểu thuyết, Kỳ ảo, Phiêu lưu', 4.8, 8500, 'Thế giới phép thuật đầy mê hoặc xoay quanh cuộc sống và cuộc đấu tranh của cậu bé phù thủy Harry Potter chống lại Chúa tể hắc ám Voldemort.', './images/harrypotter.svg'],
        ['Thám tử lừng danh Conan', 'Gosho Aoyama', 'Manga, Trinh thám, Học đường', 5.0, 4200, 'Các vụ án ly kỳ và màn đấu trí đỉnh cao của cậu thám tử trung học Kudo Shinichi bị thu nhỏ dưới hình dạng đứa trẻ tiểu học Conan.', './images/conan.svg']
      ];
      await this.pool.query(
        'INSERT INTO books (title, author, tags, average_rating, review_count, description, image) VALUES ?',
        [seedBooks]
      );
      console.log('[Database] Đã nạp dữ liệu sách mặc định (seeding) từ SQLite của desktop.');
    }

    // Đồng bộ lại phần mở rộng ảnh từ .png sang .svg nếu đã được tạo từ trước
    await this.pool.query("UPDATE books SET image = REPLACE(image, '.png', '.svg') WHERE image LIKE '%.png'");

    // Thực hiện Migration dữ liệu cũ sang cấu trúc mới nhiều-nhiều
    await this.migrateOldReviewCategories();
  }

  /**
   * Di chuyển dữ liệu thể loại cũ từ tags của sách sang bảng trung gian review_categories cho các review cũ
   */
  async migrateOldReviewCategories() {
    try {
      const [reviews] = await this.pool.query('SELECT r.id, r.book_id, b.tags FROM reviews r JOIN books b ON r.book_id = b.id');
      for (const review of reviews) {
        // Kiểm tra xem review này đã được gán bất kỳ thể loại nào chưa
        const [existing] = await this.pool.query('SELECT COUNT(*) as count FROM review_categories WHERE review_id = ?', [review.id]);
        if (existing[0].count === 0 && review.tags) {
          const tags = review.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
          for (const tag of tags) {
            // Kiểm tra/Lấy ID category
            let [catRows] = await this.pool.query('SELECT id FROM categories WHERE name = ?', [tag]);
            let catId;
            if (catRows.length === 0) {
              const [insertRes] = await this.pool.query('INSERT INTO categories (name, is_default) VALUES (?, ?)', [tag, false]);
              catId = insertRes.insertId;
            } else {
              catId = catRows[0].id;
            }
            // Tạo liên kết trong bảng trung gian
            await this.pool.query('INSERT IGNORE INTO review_categories (review_id, category_id) VALUES (?, ?)', [review.id, catId]);
          }
        }
      }
      console.log('[Database Migration] Đã đồng bộ thành công thể loại của các bài viết cũ.');
    } catch (error) {
      console.error('[Database Migration] Lỗi đồng bộ dữ liệu cũ:', error.message);
    }
  }

  /**
   * Lấy pool kết nối phục vụ truy vấn
   */
  getPool() {
    return this.pool;
  }
}

// Export duy nhất một instance của Database class (Singleton Pattern)
const dbInstance = new Database();
module.exports = dbInstance;