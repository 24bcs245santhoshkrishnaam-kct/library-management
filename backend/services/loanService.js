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

/**
 * Feature 3: Get system borrowing duration configuration
 * Testing Mode: 10 minutes (600,000 ms)
 * Production Mode: 6 days (518,400,000 ms)
 */
async function getBorrowingConfig() {
  try {
    const rows = await db.query("SELECT policy_value FROM policies WHERE policy_key = 'borrowing_mode'");
    const rawVal = (rows && rows.length > 0 && rows[0].policy_value) 
      ? rows[0].policy_value.toLowerCase().trim() 
      : (process.env.BORROWING_MODE || 'production').toLowerCase().trim();

    const isTesting = rawVal === 'testing' || rawVal === 'test' || rawVal === '10m' || rawVal === '10_minutes';

    return {
      mode: isTesting ? 'testing' : 'production',
      duration_label: isTesting ? '10 minutes' : '6 days',
      duration_ms: isTesting ? 10 * 60 * 1000 : 6 * 24 * 60 * 60 * 1000,
      days_equivalent: isTesting ? 0 : 6,
      description: isTesting 
        ? 'Testing Mode Active (10-Minute Borrowing Duration)' 
        : 'Production Mode Active (6-Day Academic Borrowing Duration)'
    };
  } catch (err) {
    return {
      mode: 'production',
      duration_label: '6 days',
      duration_ms: 6 * 24 * 60 * 60 * 1000,
      days_equivalent: 6,
      description: 'Production Mode Active (6-Day Academic Borrowing Duration)'
    };
  }
}

/**
 * Feature 3: Set system borrowing duration mode (Production vs Testing)
 */
async function setBorrowingMode(mode) {
  const normalized = String(mode).toLowerCase().trim() === 'testing' ? 'testing' : 'production';
  await db.query(`
    INSERT INTO policies (policy_key, policy_value, description)
    VALUES ('borrowing_mode', ?, 'System borrowing duration mode: production (6 days) or testing (10 minutes)')
    ON DUPLICATE KEY UPDATE policy_value = VALUES(policy_value)
  `, [normalized]);
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

    // Check student authorization: student can only return their own loan
    if (user && user.role === 'student' && transaction.user_id !== user.id) {
      await conn.rollback();
      const error = new Error('Unauthorized: You can only return books borrowed under your own account.');
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

    // 3. Insert transaction
    const nowObj = new Date();
    const issueDateStr = formatLocalDateTime(nowObj);
    const finalDueDate = dueDate || formatLocalDateTime(new Date(nowObj.getTime() + 14 * 24 * 60 * 60 * 1000));

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
    `, [bookId, studentUser.id]);

    if (existingLoan && existingLoan.length > 0) {
      await conn.rollback();
      const err = new Error(`You currently have an active loan for "${book.title}" (Tx #${existingLoan[0].id}). Please return your existing copy before borrowing another.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Check active loan count (limit: 5 books per student)
    const [activeLoans] = await conn.query(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE user_id = ? AND status = 'Issued'
    `, [studentUser.id]);

    if (activeLoans[0].count >= 5) {
      await conn.rollback();
      const err = new Error('Borrowing limit reached: You cannot hold more than 5 active books simultaneously. Please return a book first.');
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
    `, [bookId, studentUser.id, issueDateStr, dueDateStr, durationLabel, `Online borrowing (${config.mode} mode - ${durationLabel})`]);

    // 5. Decrement available copies atomically
    await conn.query(`
      UPDATE books 
      SET available_copies = GREATEST(0, available_copies - 1)
      WHERE id = ?
    `, [bookId]);

    // 6. Commit transaction
    await conn.commit();

    console.log(`[Online Borrow] Student ${studentUser.name} borrowed "${book.title}" for ${durationLabel} (Tx #${insertResult.insertId}, Due: ${dueDateStr})`);

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

module.exports = {
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
  markAllNotificationsAsRead
};
