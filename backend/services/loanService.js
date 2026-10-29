const db = require('../config/db');

// Fixed system reference date for consistent institutional calculations
function getSystemDate() {
  // Using institutional local date 2026-10-28
  return new Date('2026-10-28T00:00:00');
}

/**
 * Calculates loan status based on issue date, due date, return date, and current date
 */
function computeLoanStatus(transaction) {
  const currentDate = getSystemDate();
  const dueDate = new Date(transaction.due_date);
  dueDate.setHours(23, 59, 59, 999);

  // If already marked returned
  if (transaction.status === 'Returned' || transaction.return_date) {
    const returnDate = transaction.return_date ? new Date(transaction.return_date) : currentDate;
    returnDate.setHours(0, 0, 0, 0);
    const dueDateClean = new Date(transaction.due_date);
    dueDateClean.setHours(0, 0, 0, 0);

    const diffTime = returnDate.getTime() - dueDateClean.getTime();
    const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLate > 0) {
      return {
        status_label: 'Returned Overdue',
        return_status: 'Overdue Return',
        was_overdue: true,
        is_overdue: false,
        days_overdue: daysLate,
        days_late: daysLate,
        days_left: 0,
        urgency_level: 'danger',
        overdue_color: 'dark-orange',
        accrued_fine: parseFloat(transaction.fine_amount) || (daysLate * 5.00)
      };
    } else {
      return {
        status_label: 'Returned On-Time',
        return_status: 'Unoverdue Return',
        was_overdue: false,
        is_overdue: false,
        days_overdue: 0,
        days_late: 0,
        days_left: 0,
        urgency_level: 'success',
        overdue_color: 'green',
        accrued_fine: 0.00
      };
    }
  }

  // Active loan: check if overdue
  const diffTime = dueDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
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
      days_left: 0,
      urgency_level: 'danger',
      overdue_color: color,
      accrued_fine: daysOverdue * 5.00
    };
  } else if (diffDays <= 3) {
    return {
      status_label: 'Due Soon',
      return_status: 'Due Soon (Unoverdue)',
      was_overdue: false,
      is_overdue: false,
      days_overdue: 0,
      days_late: 0,
      days_left: diffDays,
      urgency_level: 'warning',
      overdue_color: 'orange',
      accrued_fine: 0.00
    };
  } else {
    return {
      status_label: 'Issued',
      return_status: 'Active Unoverdue',
      was_overdue: false,
      is_overdue: false,
      days_overdue: 0,
      days_late: 0,
      days_left: diffDays,
      urgency_level: 'info',
      overdue_color: 'blue',
      accrued_fine: 0.00
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
      DATE_FORMAT(t.issue_date, '%Y-%m-%d') as issue_date,
      DATE_FORMAT(t.due_date, '%Y-%m-%d') as due_date,
      DATE_FORMAT(t.return_date, '%Y-%m-%d') as return_date,
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
      DATE_FORMAT(t.issue_date, '%Y-%m-%d') as issue_date,
      DATE_FORMAT(t.due_date, '%Y-%m-%d') as due_date,
      DATE_FORMAT(t.return_date, '%Y-%m-%d') as return_date,
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
  // 2. Highest number of overdue days first (DATEDIFF desc)
  // 3. Earliest due date next
  // 4. Then active on-schedule loans, then returned
  sql += `
    ORDER BY 
      (CASE 
        WHEN t.status = 'Issued' AND t.due_date < '2026-10-28' THEN 1 
        WHEN t.status = 'Issued' THEN 2 
        ELSE 3 
      END) ASC,
      (CASE WHEN t.status = 'Issued' THEN DATEDIFF('2026-10-28', t.due_date) ELSE 0 END) DESC,
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
    if (overdueFilter === '1d') {
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
 * Authorized Librarian Return Workflow
 * Uses atomic MySQL transaction with row-level lock
 */
async function recordBookReturn(transactionId, librarianUser) {
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

    // 2. Prevent returning an already-returned transaction twice
    if (transaction.status === 'Returned') {
      await conn.rollback();
      const error = new Error(`Transaction #${transactionId} has already been marked as Returned. Double-returns are prevented.`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Update transaction status and recorded return date
    const returnDateStr = '2026-10-28'; // Reference current date
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

    console.log(`[Librarian Return] Return processed for Tx #${transactionId} ("${transaction.title}") by ${librarianUser.name}`);

    return {
      success: true,
      message: `Book "${transaction.title}" successfully marked as Returned. Available copies updated.`,
      transaction: {
        ...updatedTx[0],
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
    const issueDateStr = '2026-10-28';
    const finalDueDate = dueDate || '2026-11-11'; // default 14 days later

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
 * Uses atomic MySQL transaction with row locking
 */
async function borrowBookOnline(bookId, studentUser) {
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

    // 4. Insert transaction with standard 14-day loan period
    const issueDateStr = '2026-10-28';
    const dueDateStr = '2026-11-11';

    const [insertResult] = await conn.query(`
      INSERT INTO transactions (book_id, user_id, issue_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, 'Issued', 'Online self-service borrowing via Student Dashboard')
    `, [bookId, studentUser.id, issueDateStr, dueDateStr]);

    // 5. Decrement available copies atomically
    await conn.query(`
      UPDATE books 
      SET available_copies = GREATEST(0, available_copies - 1)
      WHERE id = ?
    `, [bookId]);

    // 6. Commit transaction
    await conn.commit();

    console.log(`[Online Borrow] Student ${studentUser.name} (${studentUser.student_id || studentUser.username}) borrowed "${book.title}" (Tx #${insertResult.insertId})`);

    return {
      success: true,
      message: `Successfully borrowed "${book.title}"! Due date: 11 November 2026.`,
      transaction: {
        transaction_id: insertResult.insertId,
        book_id: book.id,
        title: book.title,
        author: book.author,
        issue_date: issueDateStr,
        due_date: dueDateStr,
        status: 'Issued',
        status_label: 'Issued'
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

module.exports = {
  computeLoanStatus,
  getStudentLoans,
  getStudentLoanSummary,
  getAllLoans,
  recordBookReturn,
  issueBook,
  borrowBookOnline,
  renewLoan,
  updateLoanDetails
};
