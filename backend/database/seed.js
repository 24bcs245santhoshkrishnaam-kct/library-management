const bcrypt = require('bcryptjs');
const db = require('../config/db');
const books500 = require('./books500Data');

const studentAccounts20 = [
  {
    name: 'Santhosh Krishna',
    email: 'santhoshkrishna@gmail.com',
    username: 'santhoshkrishna',
    aliases: ['santhosh'],
    passwordRaw: '1234',
    student_id: '24BCS245',
    department: 'Computer Science & Engineering',
    contact_number: '+91 98401 23456'
  },
  {
    name: 'Parthipan',
    email: 'Parthi43@gmail.com',
    username: 'parthi43',
    aliases: ['parthiban'],
    passwordRaw: '12345',
    student_id: '24BCS199',
    department: 'Computer Science & Engineering',
    contact_number: '+91 98402 34567'
  },
  {
    name: 'Rupak',
    email: 'rupak@kct.ac.in',
    username: 'rupak',
    passwordRaw: '12345',
    student_id: '24BCS101',
    department: 'AI & Data Science',
    contact_number: '+91 98403 45678'
  },
  {
    name: 'Prawin',
    email: 'prawin@kct.ac.in',
    username: 'prawin',
    passwordRaw: '12345',
    student_id: '24BCS102',
    department: 'Electronics & Communication Engineering',
    contact_number: '+91 98404 56789'
  },
  {
    name: 'Paramasivam',
    email: 'paramasivam@kct.ac.in',
    username: 'paramasivam',
    passwordRaw: '12345',
    student_id: '24BCS103',
    department: 'Mechanical Engineering',
    contact_number: '+91 98405 67890'
  },
  {
    name: 'Ananya Sharma',
    email: 'ananya.sharma@kct.ac.in',
    username: 'ananya',
    passwordRaw: '12345',
    student_id: '24BCS104',
    department: 'Computer Science & Engineering',
    contact_number: '+91 98406 78901'
  },
  {
    name: 'Harish Kumar',
    email: 'harish.k@kct.ac.in',
    username: 'harish',
    passwordRaw: '12345',
    student_id: '24BCS105',
    department: 'Electrical & Electronics Engineering',
    contact_number: '+91 98407 89012'
  },
  {
    name: 'Keerthana R',
    email: 'keerthana.r@kct.ac.in',
    username: 'keerthana',
    passwordRaw: '12345',
    student_id: '24BCS106',
    department: 'AI & Data Science',
    contact_number: '+91 98408 90123'
  },
  {
    name: 'Vigneshwaran S',
    email: 'vignesh.s@kct.ac.in',
    username: 'vignesh',
    passwordRaw: '12345',
    student_id: '24BCS107',
    department: 'Civil Engineering',
    contact_number: '+91 98409 01234'
  },
  {
    name: 'Divya Bharathi',
    email: 'divya.b@kct.ac.in',
    username: 'divya',
    passwordRaw: '12345',
    student_id: '24BCS108',
    department: 'Electronics & Communication Engineering',
    contact_number: '+91 98410 12345'
  },
  {
    name: 'Manoj Prabhakar',
    email: 'manoj.p@kct.ac.in',
    username: 'manoj',
    passwordRaw: '12345',
    student_id: '24BCS109',
    department: 'Mechanical Engineering',
    contact_number: '+91 98411 23456'
  },
  {
    name: 'Swetha Sundaram',
    email: 'swetha.s@kct.ac.in',
    username: 'swetha',
    passwordRaw: '12345',
    student_id: '24BCS110',
    department: 'Computer Science & Engineering',
    contact_number: '+91 98412 34567'
  },
  {
    name: 'Naveen Chandran',
    email: 'naveen.c@kct.ac.in',
    username: 'naveen',
    passwordRaw: '12345',
    student_id: '24BCS111',
    department: 'AI & Data Science',
    contact_number: '+91 98413 45678'
  },
  {
    name: 'Priya Dharshini',
    email: 'priya.d@kct.ac.in',
    username: 'priya',
    passwordRaw: '12345',
    student_id: '24BCS112',
    department: 'Electrical & Electronics Engineering',
    contact_number: '+91 98414 56789'
  },
  {
    name: 'Karthikeyan M',
    email: 'karthik.m@kct.ac.in',
    username: 'karthik',
    passwordRaw: '12345',
    student_id: '24BCS113',
    department: 'Robotics & Automation',
    contact_number: '+91 98415 67890'
  },
  {
    name: 'Sneha Murali',
    email: 'sneha.m@kct.ac.in',
    username: 'sneha',
    passwordRaw: '12345',
    student_id: '24BCS114',
    department: 'Electronics & Communication Engineering',
    contact_number: '+91 98416 78901'
  },
  {
    name: 'Deepak Raj',
    email: 'deepak.r@kct.ac.in',
    username: 'deepak',
    passwordRaw: '12345',
    student_id: '24BCS115',
    department: 'Mechanical Engineering',
    contact_number: '+91 98417 89012'
  },
  {
    name: 'Bhavani Shankar',
    email: 'bhavani.s@kct.ac.in',
    username: 'bhavani',
    passwordRaw: '12345',
    student_id: '24BCS116',
    department: 'Computer Science & Engineering',
    contact_number: '+91 98418 90123'
  },
  {
    name: 'Arvind Swamy',
    email: 'arvind.s@kct.ac.in',
    username: 'arvind',
    passwordRaw: '12345',
    student_id: '24BCS117',
    department: 'Chemical Engineering',
    contact_number: '+91 98419 01234'
  },
  {
    name: 'Meera Krishnan',
    email: 'meera.k@kct.ac.in',
    username: 'meera',
    passwordRaw: '12345',
    student_id: '24BCS118',
    department: 'Applied Mathematics',
    contact_number: '+91 98420 12345'
  }
];

const staffAccounts = [
  {
    name: 'Head Librarian Mr. Shankar',
    email: 'shankarlibarian46@gmail.vom',
    username: 'shankarlibarian46',
    aliases: ['librarian', 'shankarlibrarian46@gmail.com'],
    passwordRaw: 'Kct.libarian',
    role: 'librarian',
    department: 'Library Administration',
    contact_number: '+91 98400 11223'
  },
  {
    name: 'Chief Administrator Dr. Arun',
    email: 'arun444@gamil.com',
    username: 'arun444',
    aliases: ['admin', 'arun444@gmail.com'],
    passwordRaw: 'KCT.admin',
    role: 'admin',
    department: 'Campus IT & Directorate',
    contact_number: '+91 98400 99887'
  }
];

async function seed(forceClean = false) {
  const shouldClean = forceClean || process.argv.includes('--clean');
  console.log(`[Seed] Starting complete database migration & seeding (clean: ${shouldClean})...`);

  await db.testConnection();
  await db.initTables();

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    if (shouldClean) {
      console.log('[Seed] Cleaning existing records for fresh initialization...');
      await conn.query('DELETE FROM notifications');
      await conn.query('DELETE FROM audit_logs');
      await conn.query('DELETE FROM transactions');
      await conn.query('DELETE FROM books');
      await conn.query('DELETE FROM users');
      await conn.query('DELETE FROM policies');
      await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
      await conn.query('ALTER TABLE books AUTO_INCREMENT = 1');
      await conn.query('ALTER TABLE transactions AUTO_INCREMENT = 1');
    }

    // 1. Seed Default Library Policies
    const defaultPolicies = [
      { key: 'max_books_per_student', val: '5', desc: 'Maximum concurrent active books per student' },
      { key: 'loan_period_days', val: '14', desc: 'Standard loan duration in calendar days' },
      { key: 'fine_per_day', val: '5.00', desc: 'Fine charged per overdue day (in INR)' },
      { key: 'grace_period_days', val: '2', desc: 'Grace period before fines accrue' },
      { key: 'sms_notifications_enabled', val: 'true', desc: 'Automated SMS reminder dispatch flag' }
    ];

    for (const p of defaultPolicies) {
      await conn.query(`
        INSERT INTO policies (policy_key, policy_value, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE policy_value = VALUES(policy_value), description = VALUES(description)
      `, [p.key, p.val, p.desc]);
    }

    // 2. Seed 20 Student Accounts + Staff Accounts
    const userMap = {}; // email -> user_id

    for (const s of studentAccounts20) {
      const hash = await bcrypt.hash(s.passwordRaw, 10);
      const [res] = await conn.query(`
        INSERT INTO users (username, password_hash, name, email, role, student_id, department, contact_number, account_status, is_demo)
        VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 'Active', TRUE)
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name), 
          password_hash = VALUES(password_hash),
          department = VALUES(department),
          contact_number = VALUES(contact_number)
      `, [s.username, hash, s.name, s.email, s.student_id, s.department, s.contact_number]);

      const [uRows] = await conn.query('SELECT id FROM users WHERE email = ?', [s.email]);
      userMap[s.email] = uRows[0].id;
    }

    for (const staff of staffAccounts) {
      const hash = await bcrypt.hash(staff.passwordRaw, 10);
      await conn.query(`
        INSERT INTO users (username, password_hash, name, email, role, student_id, department, contact_number, account_status, is_demo)
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'Active', TRUE)
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name), 
          password_hash = VALUES(password_hash),
          role = VALUES(role)
      `, [staff.username, hash, staff.name, staff.email, staff.role, staff.department, staff.contact_number]);

      const [uRows] = await conn.query('SELECT id FROM users WHERE email = ?', [staff.email]);
      userMap[staff.email] = uRows[0].id;
    }

    console.log(`[Seed] 20 Student accounts and 2 Staff accounts successfully seeded.`);

    // 3. Seed 525 Distinct College Library Books
    console.log(`[Seed] Seeding ${books500.length} distinct college library textbooks...`);
    const bookMap = {}; // id -> book row

    for (const b of books500) {
      await conn.query(`
        INSERT INTO books (id, title, author, department, category, publisher, published_year, isbn, description, cover_image, total_copies, available_copies, shelf_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          title = VALUES(title),
          author = VALUES(author),
          department = VALUES(department),
          category = VALUES(category),
          publisher = VALUES(publisher),
          published_year = VALUES(published_year),
          description = VALUES(description),
          cover_image = VALUES(cover_image),
          total_copies = VALUES(total_copies),
          available_copies = VALUES(available_copies),
          shelf_location = VALUES(shelf_location)
      `, [
        b.id, b.title, b.author, b.department, b.category, b.publisher, b.published_year,
        b.isbn, b.description, b.cover_image, b.total_copies, b.available_copies, b.shelf_location
      ]);
      bookMap[b.id] = b;
    }
    console.log(`[Seed] 525 Books successfully loaded into MySQL.`);

    // 4. Seed Structured Overdue & Active Loans (Prioritizing Overdue Order)
    // Institutional Reference Date: 2026-10-28
    const sampleLoans = [
      // CRITICAL PRIORITY (30+ Days Overdue - RED): Paramasivam, 35 days overdue
      {
        userEmail: 'paramasivam@kct.ac.in',
        bookId: 57, // Shigley's Mechanical Engineering Design
        issueDate: '2026-09-09',
        dueDate: '2026-09-23', // 35 days overdue as of 2026-10-28
        status: 'Issued',
        notes: 'Final year design project loan. Immediate recovery required.',
        smsStatus: 'Pending',
        smsCount: 2
      },
      // HIGH PRIORITY (15-29 Days Overdue - DARK ORANGE): Rupak, 18 days overdue
      {
        userEmail: 'rupak@kct.ac.in',
        bookId: 19, // Pattern Recognition and Machine Learning
        issueDate: '2026-09-26',
        dueDate: '2026-10-10', // 18 days overdue
        status: 'Issued',
        notes: 'Deep learning coursework.',
        smsStatus: 'Sent',
        smsCount: 1
      },
      // MEDIUM PRIORITY (7-14 Days Overdue - ORANGE): Parthipan, 9 days overdue
      {
        userEmail: 'Parthi43@gmail.com',
        bookId: 15, // Database System Concepts
        issueDate: '2026-10-05',
        dueDate: '2026-10-19', // 9 days overdue
        status: 'Issued',
        notes: 'DBMS lab reference.',
        smsStatus: 'Sent',
        smsCount: 1
      },
      // ATTENTION REQUIRED (1-6 Days Overdue - YELLOW): Santhosh Krishna, 4 days overdue
      {
        userEmail: 'santhoshkrishna@gmail.com',
        bookId: 14, // Computer Networking: A Top-Down Approach
        issueDate: '2026-10-10',
        dueDate: '2026-10-24', // 4 days overdue
        status: 'Issued',
        notes: 'Term paper research.',
        smsStatus: 'None',
        smsCount: 0
      },
      // 1 DAY OVERDUE (YELLOW): Prawin, 1 day overdue
      {
        userEmail: 'prawin@kct.ac.in',
        bookId: 35, // Microelectronic Circuits
        issueDate: '2026-10-13',
        dueDate: '2026-10-27', // 1 day overdue
        status: 'Issued',
        notes: 'Analog circuits lab.',
        smsStatus: 'None',
        smsCount: 0
      },
      // DUE TODAY / SOON (AMBER): Ananya Sharma
      {
        userEmail: 'ananya.sharma@kct.ac.in',
        bookId: 1, // The C Programming Language
        issueDate: '2026-10-14',
        dueDate: '2026-10-28', // Due today!
        status: 'Issued',
        notes: 'Standard 14-day borrowing loan.',
        smsStatus: 'None',
        smsCount: 0
      },
      // ON SCHEDULE ACTIVE LOAN: Santhosh Krishna
      {
        userEmail: 'santhoshkrishna@gmail.com',
        bookId: 8, // Fluent Python
        issueDate: '2026-10-20',
        dueDate: '2026-11-03', // 6 days left
        status: 'Issued',
        notes: 'Python project development.',
        smsStatus: 'None',
        smsCount: 0
      },
      // ON SCHEDULE ACTIVE LOAN: Parthipan
      {
        userEmail: 'Parthi43@gmail.com',
        bookId: 16, // Designing Data-Intensive Applications
        issueDate: '2026-10-22',
        dueDate: '2026-11-05', // 8 days left
        status: 'Issued',
        notes: 'Distributed data systems study.',
        smsStatus: 'None',
        smsCount: 0
      },
      // RETURNED ON TIME (UNOVERDUE RETURN): Santhosh Krishna
      {
        userEmail: 'santhoshkrishna@gmail.com',
        bookId: 6, // Java: The Complete Reference
        issueDate: '2026-10-01',
        dueDate: '2026-10-15',
        returnDate: '2026-10-14',
        status: 'Returned',
        notes: 'Returned on-time in pristine condition.',
        smsStatus: 'None',
        smsCount: 0
      },
      // RETURNED OVERDUE (HISTORICAL LATE RETURN): Santhosh Krishna, returned 5 days late
      {
        userEmail: 'santhoshkrishna@gmail.com',
        bookId: 18, // Clean Architecture: A Craftsman's Guide
        issueDate: '2026-09-10',
        dueDate: '2026-09-24',
        returnDate: '2026-09-29', // 5 days overdue
        status: 'Returned',
        notes: 'Returned 5 days overdue. Late fine ₹25 cleared.',
        smsStatus: 'Sent',
        smsCount: 1
      },
      // RETURNED OVERDUE (HISTORICAL LATE RETURN): Parthipan, returned 6 days late
      {
        userEmail: 'Parthi43@gmail.com',
        bookId: 3, // Clean Code
        issueDate: '2026-09-15',
        dueDate: '2026-09-29',
        returnDate: '2026-10-05', // 6 days overdue
        status: 'Returned',
        notes: 'Returned 6 days late. Late fine ₹30 settled.',
        smsStatus: 'Sent',
        smsCount: 1
      },
      // RETURNED TODAY (UNOVERDUE RETURN): Harish Kumar
      {
        userEmail: 'harish.k@kct.ac.in',
        bookId: 44, // Electric Machinery Fundamentals
        issueDate: '2026-10-14',
        dueDate: '2026-10-28',
        returnDate: '2026-10-28',
        status: 'Returned',
        notes: 'Returned at circulation desk today on due date.',
        smsStatus: 'None',
        smsCount: 0
      }
    ];

    for (const loan of sampleLoans) {
      const uId = userMap[loan.userEmail];
      if (!uId) continue;

      // Calculate fine if overdue (INR 5 per day)
      let fine = 0.00;
      if (loan.status === 'Issued') {
        const due = new Date(loan.dueDate);
        const ref = new Date('2026-10-28');
        const diffDays = Math.max(0, Math.floor((ref - due) / (1000 * 60 * 60 * 24)));
        fine = diffDays * 5.00;
      } else if (loan.status === 'Returned' && loan.returnDate) {
        const due = new Date(loan.dueDate);
        const ret = new Date(loan.returnDate);
        const diffDays = Math.max(0, Math.floor((ret - due) / (1000 * 60 * 60 * 24)));
        fine = diffDays * 5.00;
      }

      await conn.query(`
        INSERT INTO transactions (book_id, user_id, issue_date, due_date, return_date, status, fine_amount, sms_status, sms_count, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        loan.bookId, uId, loan.issueDate, loan.dueDate, loan.returnDate || null,
        loan.status, fine, loan.smsStatus || 'None', loan.smsCount || 0, loan.notes
      ]);
    }

    // Record audit log
    await conn.query(`
      INSERT INTO audit_logs (action, details)
      VALUES ('SYSTEM_INIT', 'Seeded 20 student accounts, 2 staff accounts, 525 books, and circulation records.')
    `);

    await conn.commit();
    console.log('[Seed] Database migration & seeding completed with 100% success!');
    return true;
  } catch (err) {
    await conn.rollback();
    console.error('[Seed Error]:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seed(process.argv.includes('--clean'))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed, studentAccounts20, staffAccounts };
