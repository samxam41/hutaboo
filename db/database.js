const mysql = require('mysql2/promise');

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '040105',
      port: 3306,
      database: 'hutaboo',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    Database.instance = this;
  }

  /**
   * Kiểm tra kết nối database
   */
  async initialize() {
    try {
      const connection = await this.pool.getConnection();

      const [rows] = await connection.query('SELECT DATABASE() AS db');

      console.log(
        `[Database] Kết nối thành công tới database: ${rows[0].db}`
      );

      connection.release();
    } catch (error) {
      console.error(
        '[Database] Không thể kết nối tới MySQL:',
        error.message
      );
      throw error;
    }
  }

  /**
   * Lấy connection pool
   */
  getPool() {
    return this.pool;
  }
}

module.exports = new Database();