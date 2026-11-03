const db = require('../config/db');

// Format overdue duration into friendly text (minutes, hours, days)
function formatOverdueDuration(diffMs) {
  if (diffMs <= 0) return '0 minutes';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 60) {
    return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`;
  } else if (hours < 24) {
    const remMins = mins % 60;
    return `${hours} hour${hours === 1 ? '' : 's'}${remMins > 0 ? ` ${remMins}m` : ''}`;
  } else {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
}

/**
 * Formats a Date object as a local MySQL DATETIME string: YYYY-MM-DD HH:mm:ss
 */
function formatLocalDateTime(d) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
}

// In-memory sets to track dynamic librarian notification read & cleared states
const librarianReadAlerts = new Set();
const librarianClearedAlerts = new Set();

// Cache of active library policies
let cachedPolicies = null;
let lastPolicyFetch = 0;

/**
 * Feature 4: Dynamic Library Policies Synchronization
 * Fetches all library policy settings from database with short-lived cache
 */
async function getActivePolicies(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedPolicies && (now - lastPolicyFetch < 5000)) {
    return cachedPolicies;
  }
  try {
    const rows = await db.query('SELECT policy_key, policy_value, description, updated_at FROM policies');
    const policyMap = {
      loan_period_days: 5,
      max_books_per_student: 5,
      fine_per_day: 5.00,
      grace_period_days: 2,
      borrowing_mode: 'production',
      sms_notifications_enabled: true,
      max_renewals: 2,
      allow_reservations: true
    };
    (rows || []).forEach(r => {
      const k = r.policy_key;
      const v = r.policy_value;
      if (k === 'loan_period_days' || k === 'max_books_per_student' || k === 'grace_period_days' || k === 'max_renewals') {
        policyMap[k] = parseInt(v, 10) || policyMap[k];
      } else if (k === 'fine_per_day') {
        policyMap[k] = parseFloat(v) || policyMap[k];
      } else if (k === 'sms_notifications_enabled' || k === 'allow_reservations') {
        policyMap[k] = v === 'true' || v === true || v === '1' || v === 1;
      } else {
        policyMap[k] = v;
      }
    });

    cachedPolicies = {
      raw: rows || [],
      config: policyMap,
      ...policyMap
    };
    lastPolicyFetch = now;
    return cachedPolicies;
  } catch (err) {
    console.warn('[LoanService] Failed to load policies from DB:', err.message);
    const fallbackMap = {
      loan_period_days: 5,
      max_books_per_student: 5,
      fine_per_day: 5.00,
      grace_period_days: 2,
      borrowing_mode: 'production',
      sms_notifications_enabled: true,
      max_renewals: 2,
      allow_reservations: true
    };
    return {
      raw: [],
      config: fallbackMap,
      ...fallbackMap
    };
  }
}

/**
 * Feature 3 & 4: Get system borrowing duration configuration synchronized with database policies
 */
async function getBorrowingConfig() {
  const { config } = await getActivePolicies();
  const rawMode = String(config.borrowing_mode || 'testing').toLowerCase().trim();
  const isTesting = rawMode === 'testing' || rawMode === 'test' || rawMode === '10m' || rawMode === '10_minutes';
  const loanDays = config.loan_period_days || 5;

  return {
    mode: isTesting ? 'testing' : 'production',
    duration_label: isTesting ? '10 minutes' : `${loanDays} days`,
    duration_ms: isTesting ? 10 * 60 * 1000 : loanDays * 24 * 60 * 60 * 1000,
    days_equivalent: isTesting ? 0 : loanDays,
    loan_period_days: loanDays,
    max_books_per_student: config.max_books_per_student || 5,
    fine_per_day: config.fine_per_day || 5.00,
    description: isTesting 
      ? 'Testing Mode Active (10-Minute Borrowing Duration)' 
      : `Production Mode Active (${loanDays}-Day Academic Borrowing Duration)`
  };
}

/**
 * Feature 3 & 4: Set system borrowing duration mode (Production vs Testing)
 */
async function setBorrowingMode(mode) {
  const normalized = String(mode).toLowerCase().trim() === 'testing' ? 'testing' : 'production';
  await db.query(`
    INSERT INTO policies (policy_key, policy_value, description)
    VALUES ('borrowing_mode', ?, 'System borrowing duration mode: production or testing (10 minutes)')
    ON DUPLICATE KEY UPDATE policy_value = VALUES(policy_value)
  `, [normalized]);
  cachedPolicies = null;
  return await getBorrowingConfig();
}

/**
 * Calculates loan status based on issue date, due date, return date, and current date/time
 */
function computeLoanStatus(transaction) {
  const now = new Date();
  const dueDate = new Date(transaction.due_date);
  const nowMs = now.getTime();
  const dueMs = dueDate.getTime();
  const remainingMs = dueMs - nowMs;

  // If already marked returned
  if (transaction.status === 'Returned' || transaction.return_date) {
    const returnDate = transaction.return_date ? new Date(transaction.return_date) : now;
    const diffTime = returnDate.getTime() - dueMs;
    const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime > 0) {
      return {
        status_label: 'Returned Overdue',
        return_status: 'Overdue Return',
        was_overdue: true,
        is_overdue: false,
        days_overdue: Math.max(1, daysLate),
        days_late: Math.max(1, daysLate),
        overdue_duration_text: `${Math.max(1, daysLate)} day(s) late`,
        days_left: 0,
        urgency_level: 'danger',
        overdue_color: 'dark-orange',
        accrued_fine: parseFloat(transaction.fine_amount) || (Math.max(1, daysLate) * 5.00),
        due_date_timestamp: dueMs,
        server_now: nowMs,
        remaining_ms: 0
      };
    } else {
      return {
        status_label: 'Returned On-Time',
        return_status: 'Unoverdue Return',
        was_overdue: false,
        is_overdue: false,
        days_overdue: 0,
        days_late: 0,
        overdue_duration_text: 'Returned On-Time',
        days_left: 0,
        urgency_level: 'success',
        overdue_color: 'green',
        accrued_fine: 0.00,
        due_date_timestamp: dueMs,
        server_now: nowMs,
        remaining_ms: 0
      };
    }
  }

  // Active loan: check if overdue against current time
  if (nowMs > dueMs) {
    const overdueMs = nowMs - dueMs;
    const daysOverdue = Math.max(1, Math.ceil(overdueMs / (1000 * 60 * 60 * 24)));
    const durationText = formatOverdueDuration(overdueMs);

    let color = 'yellow';
    if (daysOverdue >= 30) {
      color = 'red'; // 30+ days: critical priority
    } else if (daysOverdue >= 15) {
      color = 'dark-orange'; // 15-29 days: dark orange
    } else if (daysOverdue >= 7) {
      color = 'orange'; // 7-14 days: orange
    } else {
      color = 'yellow'; // 1-6 days: yellow
    }

    return {
      status_label: 'Overdue',
      return_status: 'Active Overdue',
      was_overdue: true,
      is_overdue: true,
      days_overdue: daysOverdue,
      days_late: daysOverdue,
      overdue_duration_text: durationText,
      days_left: 0,
      urgency_level: 'danger',
      overdue_color: color,
      accrued_fine: Math.max(5.00, daysOverdue * 5.00),
      due_date_timestamp: dueMs,
      server_now: nowMs,
      remaining_ms: 0
    };
  } else {
    // Active loan, still within borrowing period
    const daysLeft = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    let durationText = '';

    if (remainingMs < 60 * 60 * 1000) {
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      durationText = `${mins}m ${secs}s left`;
    } else if (remainingMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(remainingMs / 3600000);
      const mins = Math.floor((remainingMs % 3600000) / 60000);
      durationText = `${hours}h ${mins}m left`;
    } else {
      durationText = `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`;
    }

    const isDueSoon = remainingMs <= 24 * 60 * 60 * 1000;

    return {
      status_label: isDueSoon ? 'Due Soon' : 'Issued',
      return_status: isDueSoon ? 'Due Soon (Unoverdue)' : 'Active Unoverdue',
      was_overdue: false,
      is_overdue: false,
      days_overdue: 0,
      days_late: 0,
      overdue_duration_text: durationText,
      days_left: Math.max(0, daysLeft),
      urgency_level: isDueSoon ? 'warning' : 'info',
      overdue_color: isDueSoon ? 'orange' : 'blue',
      accrued_fine: 0.00,
      due_date_timestamp: dueMs,
      server_now: nowMs,
      remaining_ms: remainingMs
    };
  }
}

/**
 * Get borrowing records for an authenticated student
 */
async function getStudentLoans(userId) {
  const sql = `
    SELECT 
      t.id as transaction_id,
      t.book_id,
      b.title,
      b.author,
      b.category,
      b.department as book_department,
      b.cover_image,
      b.shelf_location,
      b.available_copies,
      b.total_copies,
      t.user_id,
      u.name as student_name,
      u.student_id,
      u.email as student_email,
      u.department as student_department,
      u.contact_number as student_contact,
      t.duration,
      DATE_FORMAT(t.issue_date, '%Y-%m-%d %H:%i:%s') as issue_date,
      DATE_FORMAT(t.due_date, '%Y-%m-%d %H:%i:%s') as due_date,
      DATE_FORMAT(t.return_date, '%Y-%m-%d %H:%i:%s') as return_date,
      t.status,
      t.fine_amount,
      t.last_sms_sent_at,
      t.sms_status,
      t.sms_count,
      t.notes
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN users u ON t.user_id = u.id
    WHERE t.user_id = ?
    ORDER BY (CASE WHEN t.status = 'Issued' THEN 1 ELSE 2 END) ASC, t.due_date ASC, t.created_at DESC
  `;

  const rows = await db.query(sql, [userId]);

  return rows.map(row => {
    const computed = computeLoanStatus(row);
    return {
      ...row,
      ...computed
    };
  });
}

/**
 * Get student loan status summary
 */
async function getStudentLoanSummary(userId) {
  const loans = await getStudentLoans(userId);
  
  const activeLoans = loans.filter(l => l.status === 'Issued');
  const overdueLoans = activeLoans.filter(l => l.is_overdue);
  const dueSoonLoans = activeLoans.filter(l => l.status_label === 'Due Soon');
  const returnedLoans = loans.filter(l => l.status === 'Returned');

  return {
    total_loans: loans.length,
    active_loans_count: activeLoans.length,
    overdue_count: overdueLoans.length,
    due_soon_count: dueSoonLoans.length,
    returned_count: returnedLoans.length,
    active_loans: activeLoans,
    overdue_loans: overdueLoans,
    due_soon_loans: dueSoonLoans
  };
}

/**
 * Get all loans (Librarian/Admin only)
 * Prioritizes overdue books: highest number of overdue days first, earliest due date next
 */
async function getAllLoans({ status, search, overdueFilter, department } = {}) {
  let sql = `
    SELECT 
      t.id as transaction_id,
      t.book_id,
      b.title,
      b.author,
      b.category,
      b.department as book_department,
      b.cover_image,
      b.available_copies,
      b.total_copies,
      b.shelf_location,
      t.user_id,
      u.name as student_name,
      u.student_id,
      u.email as student_email,
      u.department as student_department,
      u.contact_number as student_contact,
      t.duration,
      DATE_FORMAT(t.issue_date, '%Y-%m-%d %H:%i:%s') as issue_date,
      DATE_FORMAT(t.due_date, '%Y-%m-%d %H:%i:%s') as due_date,
      DATE_FORMAT(t.return_date, '%Y-%m-%d %H:%i:%s') as return_date,
      t.status,
      t.fine_amount,
      t.last_sms_sent_at,
      t.sms_status,
      t.sms_count,
      t.notes
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All') {
    sql += ' AND t.status = ?';
    params.push(status);
  }

  if (department && department !== 'All') {
    sql += ' AND (u.department = ? OR b.department = ?)';
    params.push(department, department);
  }

  if (search) {
    sql += ' AND (b.title LIKE ? OR u.name LIKE ? OR u.student_id LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Priority sorting:
  // 1. Unreturned overdue loans appear first
  // 2. Highest overdue duration first (TIMESTAMPDIFF desc)
  // 3. Earliest due date next
  // 4. Then active on-schedule loans, then returned
  sql += `
    ORDER BY 
      (CASE 
        WHEN t.status = 'Issued' AND t.due_date < NOW() THEN 1 
        WHEN t.status = 'Issued' THEN 2 
        ELSE 3 
      END) ASC,
      (CASE WHEN t.status = 'Issued' THEN TIMESTAMPDIFF(SECOND, t.due_date, NOW()) ELSE 0 END) DESC,
      t.due_date ASC,
      t.created_at DESC
  `;

  const rows = await db.query(sql, params);

  let mapped = rows.map(row => {
    const computed = computeLoanStatus(row);
    return {
      ...row,
      ...computed
    };
  });

  // Additional filter for overdue ranges if requested:
  // '1d' (1 day), '2-7d', '8-14d', '15+d', 'sms_not_sent', 'sms_failed'
  if (overdueFilter) {
    if (overdueFilter === 'overdue' || overdueFilter === 'active_overdue') {
      mapped = mapped.filter(l => l.is_overdue && l.status === 'Issued');
    } else if (overdueFilter === '1d') {
      mapped = mapped.filter(l => l.is_overdue && l.days_overdue === 1);
    } else if (overdueFilter === '2-7d') {
      mapped = mapped.filter(l => l.is_overdue && l.days_overdue >= 2 && l.days_overdue <= 7);
    } else if (overdueFilter === '8-14d') {
      mapped = mapped.filter(l => l.is_overdue && l.days_overdue >= 8 && l.days_overdue <= 14);
    } else if (overdueFilter === '15+d') {
      mapped = mapped.filter(l => l.is_overdue && l.days_overdue >= 15);
    } else if (overdueFilter === 'sms_not_sent') {
      mapped = mapped.filter(l => l.is_overdue && (l.sms_status === 'None' || !l.sms_status));
    } else if (overdueFilter === 'sms_failed') {
      mapped = mapped.filter(l => l.is_overdue && l.sms_status === 'Failed');
    }
  }

  return mapped;
}

/**
 * Authorized Return Workflow (Supports Librarian desk return and Student self-service return)
 * Uses atomic MySQL transaction with row-level lock
 */
async function recordBookReturn(transactionId, user = { name: 'Library Staff', role: 'librarian' }) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Lock and retrieve transaction
    const [txRows] = await conn.query(`
      SELECT t.*, b.title, b.available_copies, b.total_copies
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      WHERE t.id = ? FOR UPDATE
    `, [transactionId]);

    if (!txRows || txRows.length === 0) {
      await conn.rollback();
      const error = new Error(`Transaction #${transactionId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const transaction = txRows[0];

    // Strict Role Validation: Only authorized librarians or admins can process book returns (Phase 3 & Phase 4)
    if (!user || (user.role !== 'librarian' && user.role !== 'admin')) {
      await conn.rollback();
      const error = new Error('Unauthorized: Only librarians and library staff are authorized to process book returns.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Prevent returning an already-returned transaction twice
    if (transaction.status === 'Returned') {
      await conn.rollback();
      const error = new Error(`Transaction #${transactionId} has already been marked as Returned. Double-returns are prevented.`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Update transaction status and recorded return date to current timestamp
    const returnDateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await conn.query(`
      UPDATE transactions 
      SET status = 'Returned', return_date = ?
      WHERE id = ?
    `, [returnDateStr, transactionId]);

    // 4. Safely increment available copies (ensuring available_copies does not exceed total_copies)
    await conn.query(`
      UPDATE books 
      SET available_copies = LEAST(total_copies, available_copies + 1)
      WHERE id = ?
    `, [transaction.book_id]);

    // 5. Commit transaction
    await conn.commit();

    // Notify librarian of book return
    await db.query(`
      INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
      VALUES (?, ?, 'LibrarianAlert', 'librarian', ?, 'Delivered', 'CampusSystem', 'Book Returned by Student', 0)
    `, [transaction.user_id, transactionId, `Book "${transaction.title}" returned by student (Tx #${transactionId}). Copies restored on shelf.`]).catch(() => {});

    // Fetch updated records to return
    const [updatedTx] = await conn.query(`
      SELECT t.*, b.title, b.available_copies, b.total_copies
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      WHERE t.id = ?
    `, [transactionId]);

    console.log(`[Book Return] Return processed for Tx #${transactionId} ("${transaction.title}") by ${user.name}`);

    return {
      success: true,
      message: `Book "${transaction.title}" successfully returned! Library copies restored.`,
      transaction: {
        ...updatedTx[0],
        status: 'Returned',
        status_label: 'Returned',
        is_overdue: false
      }
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Authorized Librarian Issue Workflow
 * Uses atomic MySQL transaction
 */
async function issueBook({ bookId, studentUserId, dueDate, notes }, librarianUser) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Lock and check book availability
    const [bookRows] = await conn.query('SELECT * FROM books WHERE id = ? FOR UPDATE', [bookId]);
    if (!bookRows || bookRows.length === 0) {
      await conn.rollback();
      const err = new Error('Book not found');
      err.statusCode = 404;
      throw err;
    }

    const book = bookRows[0];
    if (book.available_copies <= 0) {
      await conn.rollback();
      const err = new Error(`Cannot issue book "${book.title}". All copies are currently checked out.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Verify student exists
    const [userRows] = await conn.query('SELECT id, name, student_id FROM users WHERE id = ?', [studentUserId]);
    if (!userRows || userRows.length === 0) {
      await conn.rollback();
      const err = new Error('Student borrower record not found');
      err.statusCode = 404;
      throw err;
    }
    const student = userRows[0];

    // 3. Insert transaction with dynamically synchronized due date
    const config = await getBorrowingConfig();
    const nowObj = new Date();
    const issueDateStr = formatLocalDateTime(nowObj);
    const finalDueDate = dueDate || formatLocalDateTime(new Date(nowObj.getTime() + config.duration_ms));

    const [insertResult] = await conn.query(`
      INSERT INTO transactions (book_id, user_id, issue_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, 'Issued', ?)
    `, [bookId, studentUserId, issueDateStr, finalDueDate, notes || 'Standard issue by librarian']);

    // 4. Decrement available copies
    await conn.query(`
      UPDATE books 
      SET available_copies = GREATEST(0, available_copies - 1)
      WHERE id = ?
    `, [bookId]);

    await conn.commit();

    // Notify librarian of book issue
    await db.query(`
      INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
      VALUES (?, ?, 'LibrarianAlert', 'librarian', ?, 'Delivered', 'CampusSystem', 'Book Issued at Circulation Desk', 0)
    `, [studentUserId, insertResult.insertId, `Librarian issued "${book.title}" to student ${student.name}. Due on ${finalDueDate}.`]).catch(() => {});

    console.log(`[Librarian Issue] Book "${book.title}" issued to ${student.name} by ${librarianUser.name}`);

    return {
      success: true,
      message: `Book "${book.title}" successfully issued to ${student.name}.`,
      transaction_id: insertResult.insertId,
      book_title: book.title,
      student_name: student.name,
      due_date: finalDueDate
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Student Self-Service Online Borrow Workflow
 * Feature 1, 2, 3: Uses system borrowing configuration (Testing Mode = 10m, Production Mode = 6d)
 * Uses atomic MySQL transaction with row locking
 */
async function borrowBookOnline(bookId, studentUser, requestedDuration = null) {
  let student = studentUser;
  if (typeof studentUser === 'number' || typeof studentUser === 'string') {
    const uRows = await db.query('SELECT * FROM users WHERE id = ?', [Number(studentUser)]);
    student = (uRows && uRows[0]) ? uRows[0] : { id: Number(studentUser), name: 'Student' };
  } else if (!studentUser) {
    student = { id: 1, name: 'Student' };
  }

  const config = await getBorrowingConfig();
  const durationLabel = config.duration_label;
  const durationMs = config.duration_ms;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Lock and check book availability
    const [bookRows] = await conn.query('SELECT * FROM books WHERE id = ? FOR UPDATE', [bookId]);
    if (!bookRows || bookRows.length === 0) {
      await conn.rollback();
      const err = new Error('Book not found in library catalogue');
      err.statusCode = 404;
      throw err;
    }

    const book = bookRows[0];
    if (book.available_copies <= 0) {
      await conn.rollback();
      const err = new Error(`All copies of "${book.title}" are currently checked out. Please try again later.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Prevent duplicate active loan for the same book by this student
    const [existingLoan] = await conn.query(`
      SELECT id FROM transactions 
      WHERE book_id = ? AND user_id = ? AND status = 'Issued'
    `, [bookId, student.id]);

    if (existingLoan && existingLoan.length > 0) {
      await conn.rollback();
      const err = new Error(`You currently have an active loan for "${book.title}" (Tx #${existingLoan[0].id}). Please return your existing copy before borrowing another.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Check active loan count against dynamic library policy quota
    const maxBooksQuota = config.max_books_per_student || 5;
    const [activeLoans] = await conn.query(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE user_id = ? AND status = 'Issued'
    `, [student.id]);

    if (activeLoans[0].count >= maxBooksQuota) {
      await conn.rollback();
      const err = new Error(`Borrowing limit reached: You cannot hold more than ${maxBooksQuota} active books simultaneously under current library policy. Please return a book first.`);
      err.statusCode = 400;
      throw err;
    }

    // 4. Calculate exact start and due timestamps from current server time
    const startTime = new Date();
    const dueTime = new Date(startTime.getTime() + durationMs);

    const issueDateStr = formatLocalDateTime(startTime);
    const dueDateStr = formatLocalDateTime(dueTime);

    const [insertResult] = await conn.query(`
      INSERT INTO transactions (book_id, user_id, issue_date, due_date, status, duration, notes)
      VALUES (?, ?, ?, ?, 'Issued', ?, ?)
    `, [bookId, student.id, issueDateStr, dueDateStr, durationLabel, `Online borrowing (${config.mode} mode - ${durationLabel})`]);

    // 5. Decrement available copies atomically
    await conn.query(`
      UPDATE books 
      SET available_copies = GREATEST(0, available_copies - 1)
      WHERE id = ?
    `, [bookId]);

    // 6. Commit transaction
    await conn.commit();

    // 7. Dispatch Librarian Notification for real-time visibility
    await db.query(`
      INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
      VALUES (?, ?, 'LibrarianAlert', 'librarian', ?, 'Delivered', 'CampusSystem', 'New Online Book Borrowing', 0)
    `, [student.id, insertResult.insertId, `Student ${student.name} (${student.student_id || student.email || 'ID#' + student.id}) borrowed "${book.title}". Due date: ${dueDateStr}.`]).catch(() => {});

    // Low stock notification if stock is now <= 1
    if (book.available_copies - 1 <= 1) {
      await db.query(`
        INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
        VALUES (?, ?, 'LibrarianAlert', 'librarian', ?, 'Delivered', 'CampusSystem', 'Low Stock Alert', 0)
      `, [student.id, insertResult.insertId, `Book "${book.title}" (${book.category}) is low on stock: only ${Math.max(0, book.available_copies - 1)} copies remaining on shelf.`]).catch(() => {});
    }

    console.log(`[Online Borrow] Student ${student.name} borrowed "${book.title}" for ${durationLabel} (Tx #${insertResult.insertId}, Due: ${dueDateStr})`);

    return {
      success: true,
      message: `Successfully borrowed "${book.title}"! Borrowing period: ${durationLabel}. Due at: ${dueDateStr}.`,
      transaction: {
        id: insertResult.insertId,
        transaction_id: insertResult.insertId,
        book_id: book.id,
        title: book.title,
        author: book.author,
        cover_image: book.cover_image,
        shelf_location: book.shelf_location || 'A1',
        book_department: book.department || 'CSE',
        issue_date: issueDateStr,
        due_date: dueDateStr,
        due_date_timestamp: dueTime.getTime(),
        server_now: startTime.getTime(),
        remaining_ms: durationMs,
        duration: durationLabel,
        days_left: config.days_equivalent,
        status: 'Issued',
        status_label: 'Issued',
        is_overdue: false
      }
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Renew Loan Workflow
 */
async function renewLoan(transactionId, user) {
  const txRows = await db.query(`
    SELECT t.*, b.title 
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.id = ?
  `, [transactionId]);

  if (!txRows || txRows.length === 0) {
    const err = new Error('Loan transaction not found');
    err.statusCode = 404;
    throw err;
  }

  const tx = txRows[0];

  // If student is renewing, verify ownership
  if (user.role === 'student' && tx.user_id !== user.id) {
    const err = new Error('Unauthorized to renew another student\'s loan');
    err.statusCode = 403;
    throw err;
  }

  if (tx.status !== 'Issued') {
    const err = new Error('Only active issued loans can be renewed');
    err.statusCode = 400;
    throw err;
  }

  // Extend due date by 14 days from current due date or system date
  const curDue = new Date(tx.due_date);
  curDue.setDate(curDue.getDate() + 14);
  const newDueDateStr = curDue.toISOString().split('T')[0];

  await db.query(`
    UPDATE transactions 
    SET due_date = ?, notes = CONCAT(COALESCE(notes, ''), ' | Renewed by ', ?)
    WHERE id = ?
  `, [newDueDateStr, user.name || user.username, transactionId]);

  return {
    success: true,
    message: `Loan for "${tx.title}" renewed successfully until ${newDueDateStr}.`,
    transaction_id: transactionId,
    new_due_date: newDueDateStr
  };
}

/**
 * Update Loan Information Details (Due date, fine, notes, status)
 */
async function updateLoanDetails(transactionId, updateData = {}, staffUser = {}) {
  const { due_date, notes, fine_amount, status } = updateData;

  await db.query(`
    UPDATE transactions 
    SET 
      due_date = COALESCE(?, due_date),
      notes = COALESCE(?, notes),
      fine_amount = COALESCE(?, fine_amount),
      status = COALESCE(?, status)
    WHERE id = ?
  `, [due_date || null, notes || null, fine_amount !== undefined ? parseFloat(fine_amount) : null, status || null, transactionId]);

  // Log audit
  await db.query(`
    INSERT INTO audit_logs (user_name, action, details)
    VALUES (?, 'UPDATE_LOAN_DETAILS', ?)
  `, [staffUser.name || 'Staff', `Updated details for Transaction #${transactionId}`]).catch(() => {});

  const rows = await db.query(`
    SELECT t.*, b.title, u.name as student_name
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `, [transactionId]);

  const updatedLoan = rows[0] ? { ...rows[0], ...computeLoanStatus(rows[0]) } : null;
  return {
    success: true,
    message: `Transaction #${transactionId} information updated successfully.`,
    transaction: updatedLoan,
    loan: updatedLoan
  };
}

/**
 * Get verified notifications for a specific student (Feature 2 & 5)
 * Scoped strictly to the logged-in student (privacy enforced)
 */
async function getStudentNotifications(userId) {
  const sql = `
    SELECT 
      n.id,
      n.user_id,
      n.transaction_id,
      COALESCE(n.title, 'Book Return Deadline Expired') as title,
      n.type,
      n.recipient,
      n.message,
      n.status,
      n.provider,
      n.is_read,
      n.read_at,
      DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
      u.name as student_name,
      b.title as book_title,
      b.author as book_author,
      b.cover_image,
      t.duration,
      DATE_FORMAT(t.due_date, '%Y-%m-%d %H:%i:%s') as due_date,
      t.status as loan_status
    FROM notifications n
    JOIN users u ON n.user_id = u.id
    LEFT JOIN transactions t ON n.transaction_id = t.id
    LEFT JOIN books b ON t.book_id = b.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `;
  const rows = await db.query(sql, [userId]);

  return rows.map(item => {
    let overdueDurationText = '0 minutes';
    let isOverdue = false;
    let formattedDueDate = 'N/A';

    if (item.due_date) {
      const due = new Date(item.due_date);
      const diffMs = Date.now() - due.getTime();
      formattedDueDate = due.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      if (diffMs > 0) {
        isOverdue = true;
        overdueDurationText = formatOverdueDuration(diffMs);
      }
    }

    return {
      ...item,
      is_read: Boolean(item.is_read),
      is_overdue: isOverdue,
      overdue_duration_text: overdueDurationText,
      due_date_formatted: formattedDueDate,
      return_instructions: 'Please return this book to the KCT AI Smart Library circulation desk or renewal kiosk immediately to prevent additional daily fines.'
    };
  });
}

/**
 * Mark a specific student notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  await db.query(`
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW() 
    WHERE id = ? AND user_id = ?
  `, [notificationId, userId]);
  return true;
}

/**
 * Mark all notifications for a student as read
 */
async function markAllNotificationsAsRead(userId) {
  await db.query(`
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW() 
    WHERE user_id = ? AND is_read = FALSE
  `, [userId]);
  return true;
}

/**
 * Feature 2: Dedicated Librarian Notification Engine
 * Aggregates all library activity alerts:
 * - Online & desk borrowing events
 * - Book return events
 * - Real-time overdue alerts for unreturned books
 * - Upcoming due date reminders
 * - Low-stock book warnings
 * - New student registration notifications
 */
async function getLibrarianNotifications() {
  const notifications = [];

  // 1. Fetch persisted database alerts where recipient = 'librarian' or type = 'LibrarianAlert'
  try {
    const rows = await db.query(`
      SELECT 
        n.id,
        n.user_id,
        n.transaction_id,
        COALESCE(n.title, 'Library Activity Notice') as title,
        n.type,
        n.recipient,
        n.message,
        n.status,
        n.provider,
        n.is_read,
        n.read_at,
        DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        u.name as student_name,
        u.student_id,
        u.department as student_department,
        b.title as book_title,
        b.author as book_author,
        b.id as book_id,
        t.due_date
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN transactions t ON n.transaction_id = t.id
      LEFT JOIN books b ON t.book_id = b.id
      WHERE n.recipient = 'librarian' OR n.type = 'LibrarianAlert'
      ORDER BY n.id DESC
      LIMIT 100
    `);

    (rows || []).forEach(r => {
      const alertId = `db-${r.id}`;
      if (!librarianClearedAlerts.has(alertId) && !librarianClearedAlerts.has(String(r.id))) {
        notifications.push({
          id: alertId,
          db_id: r.id,
          title: r.title,
          student_name: r.student_name || 'Student Borrower',
          student_id: r.student_id || '',
          student_department: r.student_department || '',
          book_title: r.book_title || '',
          book_id: r.book_id,
          transaction_id: r.transaction_id,
          user_id: r.user_id,
          type: r.type || 'LibrarianAlert',
          message: r.message,
          due_date: r.due_date,
          created_at: r.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19),
          is_read: Boolean(r.is_read) || librarianReadAlerts.has(alertId) || librarianReadAlerts.has(String(r.id)),
          is_overdue: (r.title || '').toLowerCase().includes('overdue')
        });
      }
    });
  } catch (err) {
    console.warn('[Librarian Notifs DB Error]:', err.message);
  }

  // 2. Real-time overdue book alerts (Every active unreturned loan past its due date)
  try {
    const allLoans = await getAllLoans({ status: 'Issued' });
    const overdueLoans = allLoans.filter(l => l.is_overdue);

    overdueLoans.forEach(l => {
      const alertId = `overdue-${l.transaction_id}`;
      if (!librarianClearedAlerts.has(alertId)) {
        notifications.push({
          id: alertId,
          transaction_id: l.transaction_id,
          user_id: l.user_id,
          student_name: l.student_name,
          student_id: l.student_id,
          student_department: l.student_department,
          book_title: l.title,
          book_author: l.author,
          book_id: l.book_id,
          type: 'Overdue',
          title: '🚨 Overdue Book Alert',
          message: `Student ${l.student_name} (${l.student_id || 'ID#' + l.user_id}) has not returned "${l.title}" on time. Due date was ${l.due_date} (${l.days_overdue} days overdue). Accrued fine: ₹${l.accrued_fine || (l.days_overdue * 5)}.`,
          due_date: l.due_date,
          created_at: l.due_date,
          is_read: librarianReadAlerts.has(alertId),
          is_overdue: true,
          days_overdue: l.days_overdue
        });
      }
    });

    // 3. Upcoming due date reminders (loans due within 3 days, not yet overdue)
    const dueSoonLoans = allLoans.filter(l => !l.is_overdue && l.days_left !== undefined && l.days_left <= 3);
    dueSoonLoans.forEach(l => {
      const alertId = `duesoon-${l.transaction_id}`;
      if (!librarianClearedAlerts.has(alertId)) {
        notifications.push({
          id: alertId,
          transaction_id: l.transaction_id,
          user_id: l.user_id,
          student_name: l.student_name,
          student_id: l.student_id,
          student_department: l.student_department,
          book_title: l.title,
          book_author: l.author,
          book_id: l.book_id,
          type: 'DueSoon',
          title: '📅 Upcoming Due Date Notice',
          message: `"${l.title}" issued to ${l.student_name} is due in ${l.days_left || 1} day(s) on ${l.due_date}.`,
          due_date: l.due_date,
          created_at: l.issue_date,
          is_read: librarianReadAlerts.has(alertId),
          is_overdue: false
        });
      }
    });
  } catch (err) {
    console.warn('[Librarian Notifs Overdue Error]:', err.message);
  }

  // 4. Low stock alerts (catalog titles with <= 1 copy available)
  try {
    const lowStockBooks = await db.query('SELECT id, title, author, category, available_copies, total_copies FROM books WHERE available_copies <= 1 LIMIT 25');
    (lowStockBooks || []).forEach(b => {
      const alertId = `lowstock-${b.id}`;
      if (!librarianClearedAlerts.has(alertId)) {
        notifications.push({
          id: alertId,
          book_id: b.id,
          book_title: b.title,
          book_author: b.author,
          type: 'LowStock',
          title: '⚠️ Low Stock Alert',
          message: `Book "${b.title}" (${b.category}) is low on stock: only ${b.available_copies} of ${b.total_copies} copies remaining on shelf.`,
          created_at: 'Shelf Inventory',
          is_read: librarianReadAlerts.has(alertId),
          is_overdue: false
        });
      }
    });
  } catch (err) {
    console.warn('[Librarian Notifs Stock Error]:', err.message);
  }

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    success: true,
    total: notifications.length,
    unread_count: unreadCount,
    unreadCount: unreadCount,
    notifications: notifications
  };
}

/**
 * Mark a specific librarian notification as read
 */
async function markLibrarianNotificationAsRead(id) {
  librarianReadAlerts.add(String(id));
  if (String(id).startsWith('db-')) {
    const numId = parseInt(String(id).replace('db-', ''), 10);
    await db.query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?', [numId]).catch(() => {});
  } else if (!isNaN(Number(id))) {
    await db.query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?', [Number(id)]).catch(() => {});
  }
  return { success: true, message: 'Notification marked as read' };
}

/**
 * Mark all librarian notifications as read
 */
async function markAllLibrarianNotificationsAsRead() {
  const current = await getLibrarianNotifications();
  current.notifications.forEach(n => librarianReadAlerts.add(String(n.id)));
  await db.query("UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE recipient = 'librarian' OR type = 'LibrarianAlert'").catch(() => {});
  return { success: true, message: 'All librarian notifications marked as read' };
}

/**
 * Clear all librarian notifications
 */
async function clearLibrarianNotifications() {
  const current = await getLibrarianNotifications();
  current.notifications.forEach(n => librarianClearedAlerts.add(String(n.id)));
  await db.query("DELETE FROM notifications WHERE recipient = 'librarian' OR type = 'LibrarianAlert'").catch(() => {});
  return { success: true, message: 'Librarian notifications cleared' };
}

module.exports = {
  getActivePolicies,
  getBorrowingConfig,
  setBorrowingMode,
  computeLoanStatus,
  getStudentLoans,
  getStudentLoanSummary,
  getAllLoans,
  recordBookReturn,
  issueBook,
  borrowBookOnline,
  renewLoan,
  updateLoanDetails,
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getLibrarianNotifications,
  markLibrarianNotificationAsRead,
  markAllLibrarianNotificationsAsRead,
  clearLibrarianNotifications
};
