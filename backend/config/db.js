const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_library',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

// Check if socket path is provided and exists
if (process.env.DB_SOCKET) {
  config.socketPath = process.env.DB_SOCKET;
}

let pool;
let isConnected = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

// In-memory fallback storage if MySQL server is completely unavailable
const inMemoryStore = {
  users: [],
  books: [],
  transactions: []
};

async function testConnection() {
  try {
    const currentPool = getPool();
    const conn = await currentPool.getConnection();
    isConnected = true;
    conn.release();
    console.log(`[Database] Successfully connected to MySQL database "${config.database}"`);
    return true;
  } catch (err) {
    console.warn(`[Database] MySQL connection notice: ${err.message}.`);
    isConnected = false;
    return false;
  }
}

async function query(sql, params = []) {
  if (isConnected) {
    try {
      const [rows] = await getPool().query(sql, params);
      return rows;
    } catch (err) {
      console.error('[Database Query Error]:', err.message);
      throw err;
    }
  } else {
    // Attempt reconnect once
    const reconnected = await testConnection();
    if (reconnected) {
      const [rows] = await getPool().query(sql, params);
      return rows;
    }
    throw new Error('MySQL Database connection is not available');
  }
}

async function getConnection() {
  return await getPool().getConnection();
}

async function initTables() {
  try {
    const conn = await getPool().getConnection();
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        role ENUM('student', 'librarian', 'admin') NOT NULL DEFAULT 'student',
        student_id VARCHAR(50) UNIQUE NULL,
        department VARCHAR(100) NULL DEFAULT 'General Engineering',
        contact_number VARCHAR(30) NULL DEFAULT '+91 98765 43210',
        account_status ENUM('Active', 'Suspended', 'Pending') NOT NULL DEFAULT 'Active',
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely add any missing columns to users
    try { await conn.query("ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL DEFAULT 'General Engineering'"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN contact_number VARCHAR(30) NULL DEFAULT '+91 98765 43210'"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN account_status ENUM('Active', 'Suspended', 'Pending') NOT NULL DEFAULT 'Active'"); } catch (e) {}
    try { await conn.query("ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE"); } catch (e) {}

    await conn.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL DEFAULT 'CSE',
        category VARCHAR(100) NOT NULL,
        publisher VARCHAR(150) NULL,
        published_year INT,
        isbn VARCHAR(50) UNIQUE,
        description TEXT,
        cover_image VARCHAR(500) NULL,
        total_copies INT NOT NULL DEFAULT 3,
        available_copies INT NOT NULL DEFAULT 3,
        shelf_location VARCHAR(50),
        is_damaged INT NOT NULL DEFAULT 0,
        is_lost INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_department (department),
        INDEX idx_category (category),
        INDEX idx_author (author),
        INDEX idx_title (title)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely add missing columns to books
    try { await conn.query("ALTER TABLE books ADD COLUMN department VARCHAR(100) NOT NULL DEFAULT 'CSE'"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN publisher VARCHAR(150) NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN cover_image VARCHAR(500) NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN is_damaged INT NOT NULL DEFAULT 0"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN is_lost INT NOT NULL DEFAULT 0"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN language VARCHAR(50) NOT NULL DEFAULT 'English'"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN alternate_titles TEXT NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN subject_keywords TEXT NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN skills_covered TEXT NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN career_paths TEXT NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN catalog_collection VARCHAR(100) NOT NULL DEFAULT 'Engineering'"); } catch (e) {}
    try { await conn.query("ALTER TABLE books ADD COLUMN metadata_source VARCHAR(150) NULL"); } catch (e) {}

    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        user_id INT NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE NULL,
        status ENUM('Issued', 'Returned') NOT NULL DEFAULT 'Issued',
        fine_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        last_sms_sent_at DATETIME NULL,
        sms_status ENUM('None', 'Sent', 'Delivered', 'Failed', 'Pending') NOT NULL DEFAULT 'None',
        sms_count INT NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_status (user_id, status),
        INDEX idx_book (book_id),
        INDEX idx_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely add missing columns to transactions
    try { await conn.query("ALTER TABLE transactions ADD COLUMN fine_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00"); } catch (e) {}
    try { await conn.query("ALTER TABLE transactions ADD COLUMN last_sms_sent_at DATETIME NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE transactions ADD COLUMN sms_status ENUM('None', 'Sent', 'Delivered', 'Failed', 'Pending') NOT NULL DEFAULT 'None'"); } catch (e) {}
    try { await conn.query("ALTER TABLE transactions ADD COLUMN sms_count INT NOT NULL DEFAULT 0"); } catch (e) {}

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        transaction_id INT NULL,
        type ENUM('SMS', 'InApp', 'Email') NOT NULL DEFAULT 'SMS',
        recipient VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('Sent', 'Delivered', 'Failed', 'Pending') NOT NULL DEFAULT 'Sent',
        provider VARCHAR(50) DEFAULT 'CollegeSMSGateway',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_notif (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        policy_key VARCHAR(100) UNIQUE NOT NULL,
        policy_value VARCHAR(255) NOT NULL,
        description VARCHAR(255) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(150) NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NULL,
        target_id INT NULL,
        details TEXT NULL,
        ip_address VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try { await conn.query("ALTER TABLE audit_logs ADD COLUMN target_type VARCHAR(50) NULL"); } catch (e) {}
    try { await conn.query("ALTER TABLE audit_logs ADD COLUMN target_id INT NULL"); } catch (e) {}

    conn.release();
    console.log('[Database] Tables verified and ready.');
  } catch (err) {
    console.warn('[Database] Table initialization notice:', err.message);
  }
}

module.exports = {
  getPool,
  testConnection,
  query,
  getConnection,
  initTables,
  get isConnected() { return isConnected; }
};
