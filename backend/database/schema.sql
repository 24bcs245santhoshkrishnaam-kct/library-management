-- Schema for Smart College Library Management System
CREATE DATABASE IF NOT EXISTS smart_library;
USE smart_library;

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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT 'CSE',
  category VARCHAR(100) NOT NULL,
  publisher VARCHAR(150) NULL,
  published_year INT NULL,
  isbn VARCHAR(50) UNIQUE NULL,
  description TEXT,
  cover_image VARCHAR(500) NULL,
  total_copies INT NOT NULL DEFAULT 3,
  available_copies INT NOT NULL DEFAULT 3,
  shelf_location VARCHAR(50) NULL DEFAULT 'Main Stacks',
  is_damaged INT NOT NULL DEFAULT 0,
  is_lost INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_department (department),
  INDEX idx_category (category),
  INDEX idx_author (author),
  INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_key VARCHAR(100) UNIQUE NOT NULL,
  policy_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(150) NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NULL,
  ip_address VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
