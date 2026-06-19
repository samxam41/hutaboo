const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Detect packaged Electron environment and determine userData path
let isPackaged = false;
let electronDbPath = null;

if (process.versions.electron) {
  try {
    const { app } = require('electron');
    const electronApp = app || require('@electron/remote').app;
    if (electronApp) {
      isPackaged = electronApp.isPackaged;
      electronDbPath = path.join(electronApp.getPath('userData'), 'hutaboo.db');
    }
  } catch (e) {
    console.warn('[Database] Lỗi khi nạp thông tin Electron:', e.message);
  }
}

/**
 * SQLitePoolWrapper: Giả lập API của mysql2/promise để tương thích với hệ thống Repository hiện tại.
 */
class SQLitePoolWrapper {
  constructor(dbPath) {
    console.log(`[SQLitePoolWrapper] Đang mở/tạo file database tại: ${dbPath}`);
    this.sqlite3 = require('sqlite3').verbose();
    
    // Đảm bảo thư mục cha tồn tại
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    this.db = new this.sqlite3.Database(dbPath);
    // Bật khóa ngoại cho SQLite
    this.db.run('PRAGMA foreign_keys = ON;');
  }

  async query(sql, params = []) {
    let convertedSql = sql;
    let convertedParams = [...params];

    // 1. Loại bỏ hoặc xử lý các lệnh cụ thể của MySQL khi tạo/xóa Database
    if (/CREATE\s+DATABASE/i.test(convertedSql)) {
      return [[]];
    }
    if (/DROP\s+DATABASE/i.test(convertedSql)) {
      const tables = await new Promise((resolve) => {
        this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
          if (err || !rows) return resolve([]);
          resolve(rows.map(r => r.name));
        });
      });
      for (const table of tables) {
        await new Promise((resolve) => {
          this.db.run(`DROP TABLE IF EXISTS \`${table}\``, () => resolve());
        });
      }
      return [[]];
    }

    // 2. Chuyển đổi cú pháp tạo bảng MySQL -> SQLite
    convertedSql = convertedSql.replace(/ENGINE\s*=\s*\w+/gi, '');
    convertedSql = convertedSql.replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
    convertedSql = convertedSql.replace(/CHARACTER\s+SET\s+\w+/gi, '');
    convertedSql = convertedSql.replace(/COLLATE\s+\w+/gi, '');
    convertedSql = convertedSql.replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    convertedSql = convertedSql.replace(/INT\s+AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

    // 3. Chuyển đổi INSERT IGNORE -> INSERT OR IGNORE
    convertedSql = convertedSql.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');

    // 4. Giả lập lệnh SHOW COLUMNS
    if (/SHOW\s+COLUMNS\s+FROM\s+books\s+LIKE/i.test(convertedSql)) {
      const hasColumn = await new Promise((resolve) => {
        this.db.all("PRAGMA table_info(books)", (err, rows) => {
          if (err || !rows) return resolve(false);
          const exists = rows.some(r => r.name === 'is_user_added');
          resolve(exists);
        });
      });
      if (hasColumn) {
        return [[{ Field: 'is_user_added' }]];
      } else {
        return [[]];
      }
    }

    // 5. Chuyển đổi cú pháp bulk insert của mysql2 (mảng lồng nhau với VALUES ?) sang SQLite
    let handledBulk = false;
    if (convertedSql.includes('VALUES ?') && convertedParams.length === 1 && Array.isArray(convertedParams[0])) {
      const rowsToInsert = convertedParams[0];
      if (Array.isArray(rowsToInsert) && rowsToInsert.length > 0 && Array.isArray(rowsToInsert[0])) {
        const placeholderGroup = '(' + rowsToInsert[0].map(() => '?').join(', ') + ')';
        const allPlaceholders = rowsToInsert.map(() => placeholderGroup).join(', ');
        
        convertedSql = convertedSql.replace('VALUES ?', 'VALUES ' + allPlaceholders);
        convertedParams = rowsToInsert.flat();
        handledBulk = true;
      }
    }

    // 6. Chuyển đổi cú pháp IN (?) với danh sách array (ví dụ: WHERE id IN (?)) sang SQLite
    if (!handledBulk) {
      let paramIdx = 0;
      let newParams = [];
      let sqlParts = convertedSql.split('?');
      let newSql = '';
      
      for (let i = 0; i < sqlParts.length - 1; i++) {
        newSql += sqlParts[i];
        const currentParam = convertedParams[paramIdx];
        
        if (Array.isArray(currentParam)) {
          if (currentParam.length === 0) {
            newSql += 'NULL';
          } else {
            newSql += currentParam.map(() => '?').join(', ');
            newParams.push(...currentParam);
          }
        } else {
          newSql += '?';
          newParams.push(currentParam);
        }
        paramIdx++;
      }
      newSql += sqlParts[sqlParts.length - 1];
      
      convertedSql = newSql;
      convertedParams = newParams;
    }

    // 7. Thực thi truy vấn chuẩn
    return new Promise((resolve, reject) => {
      const isSelect = /^\s*SELECT|PRAGMA/i.test(convertedSql);
      if (isSelect) {
        this.db.all(convertedSql, convertedParams, (err, rows) => {
          if (err) return reject(err);
          resolve([rows]);
        });
      } else {
        this.db.run(convertedSql, convertedParams, function(err) {
          if (err) return reject(err);
          resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
        });
      }
    });
  }

  async end() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    this.pool = null;
    this.isSqlite = false;
    Database.instance = this;
  }

  /**
   * Khởi tạo database, tạo các bảng và chèn dữ liệu mẫu (Tự động fallback sang SQLite nếu MySQL không khả dụng)
   */
  async initialize() {
    const dbName = process.env.DB_NAME || 'hutaboo';
    const forceSqlite = process.env.USE_SQLITE === 'true' || isPackaged;

    if (forceSqlite) {
      console.log('[Database] Đang sử dụng chế độ SQLite (Zero Configuration)...');
      const finalDbPath = electronDbPath || path.join(process.cwd(), `${dbName}.db`);
      this.pool = new SQLitePoolWrapper(finalDbPath);
      this.isSqlite = true;
      await this.createTables();
      return;
    }

    try {
      console.log('[Database] Đang kết nối tới database MySQL...');
      const host = 'localhost';
      const user = 'root';
      const password = '040105';

      this.pool = mysql.createPool({
        host,
        user,
        password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Tạo database nếu chưa tồn tại
      await this.pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      
      // Kết nối trực tiếp vào database cụ thể
      await this.pool.end();
      this.pool = mysql.createPool({
        host,
        user,
        password,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      console.log(`[Database] Kết nối MySQL thành công tới DB: ${dbName}`);
      this.isSqlite = false;
      await this.createTables();
    } catch (mysqlError) {
      console.warn(`[Database] Kết nối MySQL thất bại: ${mysqlError.message}`);
      console.warn(`[Database] Đang tự động chuyển sang chế độ dự phòng SQLite (Fallback)...`);

      const finalDbPath = electronDbPath || path.join(process.cwd(), `${dbName}.db`);
      this.pool = new SQLitePoolWrapper(finalDbPath);
      this.isSqlite = true;
      await this.createTables();
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
        image VARCHAR(255) DEFAULT NULL,
        is_user_added BOOLEAN DEFAULT FALSE
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

    // Check if is_user_added column exists in books
    const [columns] = await this.pool.query("SHOW COLUMNS FROM books LIKE 'is_user_added'");
    if (columns.length === 0) {
      await this.pool.query("ALTER TABLE books ADD COLUMN is_user_added BOOLEAN DEFAULT FALSE");
      console.log("[Database] Đã thêm cột is_user_added vào bảng books.");
    }

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
        ['Doraemon', 'Fujiko F. Fujio', 'Manga, Thiếu nhi, Viễn tưởng, Hài hước', 0.0, 0, 'Chú mèo máy thông minh đến từ tương lai với chiếc túi thần kỳ chứa các bảo bối tiện ích giúp đỡ cậu bạn Nobita hậu đậu.', './images/doraemon.svg'],
        ['One Piece', 'Eiichiro Oda', 'Manga, Phiêu lưu, Hành động', 0.0, 0, 'Hành trình hải tặc đầy cảm hứng về tình bạn của Monkey D. Luffy và băng Mũ Rơm trên con đường đi tìm kho báu huyền thoại One Piece.', './images/onepiece.svg'],
        ['Mắt Biếc', 'Nguyễn Nhật Ánh', 'Văn học Việt Nam, Tình cảm, Lãng mạn', 0.0, 0, 'Câu chuyện tình đơn phương đầy day dứt và hoài niệm của Ngạn dành cho Hà Lan - cô bạn thanh mai trúc mã có đôi mắt biếc sâu thẳm.', './images/matbiec.svg'],
        ['Harry Potter', 'J.K. Rowling', 'Tiểu thuyết, Kỳ ảo, Phiêu lưu', 0.0, 0, 'Thế giới phép thuật đầy mê hoặc xoay quanh cuộc sống và cuộc đấu tranh của cậu bé phù thủy Harry Potter chống lại Chúa tể hắc ám Voldemort.', './images/harrypotter.svg'],
        ['Thám tử lừng danh Conan', 'Gosho Aoyama', 'Manga, Trinh thám, Học đường', 0.0, 0, 'Các vụ án ly kỳ và màn đấu trí đỉnh cao của cậu thám tử trung học Kudo Shinichi bị thu nhỏ dưới hình dạng đứa trẻ tiểu học Conan.', './images/conan.svg']
      ];
      await this.pool.query(
        'INSERT INTO books (title, author, tags, average_rating, review_count, description, image) VALUES ?',
        [seedBooks]
      );
      console.log('[Database] Đã nạp dữ liệu sách mặc định (seeding) từ SQLite của desktop.');
    }

    // Thực hiện Migration dữ liệu cũ sang cấu trúc mới nhiều-nhiều
    await this.migrateOldReviewCategories();
    await this.migrateBookCovers();
    await this.migrateBookTagsFromReviews();
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
   * Đồng bộ các đường dẫn ảnh bìa của sách với các file vật lý thực tế trong thư mục public/uploads/covers
   */
  async migrateBookCovers() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      let coversDir;
      let packagedCoversDir = path.join(__dirname, '../public/uploads/covers');
      
      if (process.versions.electron) {
        const { app: electronApp } = require('electron');
        const appInstance = electronApp || require('@electron/remote').app;
        coversDir = path.join(appInstance.getPath('userData'), 'uploads/covers');
      } else {
        coversDir = packagedCoversDir;
      }
      
      // Khởi tạo thư mục covers trong userData nếu chưa có
      if (!fs.existsSync(coversDir)) {
        fs.mkdirSync(coversDir, { recursive: true });
      }

      // Danh sách file ảnh bìa thực tế từ cả 2 thư mục
      let physicalFiles = [];
      if (fs.existsSync(coversDir)) {
        physicalFiles = physicalFiles.concat(fs.readdirSync(coversDir));
      }
      if (fs.existsSync(packagedCoversDir) && packagedCoversDir !== coversDir) {
        physicalFiles = physicalFiles.concat(fs.readdirSync(packagedCoversDir));
      }

      const [books] = await this.pool.query('SELECT id, title, image FROM books');
      let updateCount = 0;

      for (const book of books) {
        let originalPath = book.image || '';
        let newPath = originalPath;

        // Xác định xem ảnh bìa hiện tại có phải là default hoặc được tạo động không
        const isDefaultCover = originalPath === 'uploads/covers/default_cover.svg' || originalPath === '' || originalPath === './images/default_cover.svg';
        const isDynamicCover = originalPath.includes('uploads/covers/cover-');

        if (isDefaultCover || isDynamicCover) {
          // 1. Kiểm tra xem sách có bài review nào có ảnh không
          const [reviewRows] = await this.pool.query(`
            SELECT ri.image_path 
            FROM reviews r
            JOIN review_images ri ON r.id = ri.review_id
            WHERE r.book_id = ?
            ORDER BY r.created_at ASC, r.id ASC, ri.id ASC
            LIMIT 1
          `, [book.id]);

          if (reviewRows.length > 0) {
            // Quy tắc mới cho sách chưa có ảnh bìa riêng: Sử dụng ảnh của bài review đăng sớm nhất
            const earliestImagePath = reviewRows[0].image_path;
            
            let sourceFullPath;
            if (process.versions.electron) {
              const { app: electronApp } = require('electron');
              const appInstance = electronApp || require('@electron/remote').app;
              sourceFullPath = path.join(appInstance.getPath('userData'), earliestImagePath);
            } else {
              sourceFullPath = path.join(__dirname, '../public', earliestImagePath);
            }
            
            if (fs.existsSync(sourceFullPath)) {
              const ext = path.extname(earliestImagePath);
              const coverRelativePath = `uploads/covers/cover-${book.id}${ext}`;
              
              let destFullPath;
              if (process.versions.electron) {
                const { app: electronApp } = require('electron');
                const appInstance = electronApp || require('@electron/remote').app;
                destFullPath = path.join(appInstance.getPath('userData'), coverRelativePath);
              } else {
                destFullPath = path.join(__dirname, '../public', coverRelativePath);
              }
              
              try {
                fs.copyFileSync(sourceFullPath, destFullPath);
                newPath = coverRelativePath;
              } catch (copyErr) {
                console.error(`[Database Migration] Lỗi copy ảnh bìa từ review sớm nhất cho sách ID ${book.id}:`, copyErr.message);
              }
            }
          } else if (isDynamicCover) {
            // Nếu là ảnh bìa động nhưng không còn review nào có ảnh, reset về default_cover.svg
            newPath = 'uploads/covers/default_cover.svg';
          }
        }

        // 2. Nếu không có review có ảnh hoặc lỗi copy, thực hiện quy tắc cũ (sửa đường dẫn sai)
        if (newPath === originalPath) {
          // Xử lý đường dẫn tuyệt đối (nếu có, e.g. C:/project/uploads/...)
          if (originalPath.includes(':') || originalPath.startsWith('\\\\')) {
            const normalized = originalPath.replace(/\\/g, '/');
            const match = normalized.match(/(?:public\/)?(uploads\/.*|images\/.*)/i);
            if (match && match[1]) {
              newPath = match[1];
            } else {
              newPath = 'uploads/covers/default_cover.svg';
            }
          }

          // Dọn dẹp phân tách đường dẫn
          newPath = newPath.replace(/\\/g, '/');
          if (newPath.startsWith('./')) {
            newPath = newPath.substring(2);
          }

          // Kiểm tra xem file ảnh có thực sự tồn tại trên đĩa không
          let fileExists = false;
          if (process.versions.electron) {
            const { app: electronApp } = require('electron');
            const appInstance = electronApp || require('@electron/remote').app;
            fileExists = fs.existsSync(path.join(appInstance.getPath('userData'), newPath));
          }
          if (!fileExists) {
            fileExists = fs.existsSync(path.join(__dirname, '../public', newPath));
          }

          // Nếu file không tồn tại, hoặc đường dẫn là dạng cũ ./images/... hoặc images/...
          if (!fileExists || newPath.startsWith('images/')) {
            const fileNameWithExt = newPath.split('/').pop();
            const ext = path.extname(fileNameWithExt);
            const baseName = path.basename(fileNameWithExt, ext);

            // Tìm file ảnh trong public/uploads/covers có cùng tên (không phân biệt hoa/thường)
            let matchFile = physicalFiles.find(f => {
              const fExt = path.extname(f);
              const fBase = path.basename(f, fExt);
              return fBase.toLowerCase() === baseName.toLowerCase() || 
                     fBase.toLowerCase() === book.title.replace(/\s+/g, '').toLowerCase();
            });

            // Nếu không tìm thấy, thử tìm theo tên sách viết liền hoặc chứa từ khóa
            if (!matchFile) {
              matchFile = physicalFiles.find(f => {
                const fExt = path.extname(f);
                const fBase = path.basename(f, fExt);
                const cleanTitle = book.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const cleanFBase = fBase.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return cleanFBase === cleanTitle || cleanTitle.includes(cleanFBase) || cleanFBase.includes(cleanTitle);
              });
            }

            if (matchFile) {
              newPath = `uploads/covers/${matchFile}`;
            } else {
              newPath = 'uploads/covers/default_cover.svg';
            }
          }
        }

        // 3. Nếu đường dẫn thay đổi, cập nhật cơ sở dữ liệu
        if (newPath !== originalPath) {
          console.log(`[Database Migration] Cập nhật sách ID ${book.id} ("${book.title}"): "${originalPath}" -> "${newPath}"`);
          await this.pool.query('UPDATE books SET image = ? WHERE id = ?', [newPath, book.id]);
          updateCount++;
        }
      }

      if (updateCount > 0) {
        console.log(`[Database Migration] Hoàn thành cập nhật ảnh bìa cho ${updateCount} cuốn sách.`);
      }
    } catch (error) {
      console.error('[Database Migration] Lỗi đồng bộ ảnh bìa:', error.message);
    }
  }

  /**
   * Cập nhật lại tags của tất cả sách dựa trên thể loại của các reviews hiện có
   */
  async migrateBookTagsFromReviews() {
    try {
      const [books] = await this.pool.query('SELECT id, title, tags FROM books');
      let updateCount = 0;
      for (const book of books) {
        // Kiểm tra xem sách có reviews nào không
        const [reviewCountRows] = await this.pool.query('SELECT COUNT(*) as count FROM reviews WHERE book_id = ?', [book.id]);
        if (reviewCountRows[0].count === 0) {
          continue;
        }

        const query = `
          SELECT DISTINCT c.name, c.is_default
          FROM reviews r
          JOIN review_categories rc ON r.id = rc.review_id
          JOIN categories c ON rc.category_id = c.id
          WHERE r.book_id = ?
          ORDER BY c.is_default DESC, c.name ASC
        `;
        const [rows] = await this.pool.query(query, [book.id]);
        
        let tagsStr = 'Khác';
        if (rows.length > 0) {
          tagsStr = rows.map(row => row.name).join(', ');
        }
        
        // Chỉ cập nhật nếu tags hiện tại khác với tags tính toán được
        if (book.tags !== tagsStr) {
          await this.pool.query('UPDATE books SET tags = ? WHERE id = ?', [tagsStr, book.id]);
          console.log(`[Database Migration] Đã đồng bộ tags cho sách ID ${book.id} ("${book.title}") thành: ${tagsStr}`);
          updateCount++;
        }
      }
      if (updateCount > 0) {
        console.log(`[Database Migration] Hoàn thành cập nhật tags cho ${updateCount} cuốn sách.`);
      }
    } catch (error) {
      console.error('[Database Migration] Lỗi đồng bộ tags cho sách hiện có:', error.message);
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