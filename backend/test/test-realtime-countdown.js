/**
 * KCT AI Smart Library — End-to-End Verification Suite
 * Tests Real-Time Borrowing History, 10-Min Testing Mode, 6-Day Production Mode,
 * Countdown Timers, Automatic Overdue Detection, SMS, Notifications, and Returns.
 */
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const loanService = require('../services/loanService');
const {
  dispatchSMSViaGateway,
  compileAutoOverdueTemplate
} = require('../services/smsService');
const {
  checkAndDispatchOverdueReminders
} = require('../services/overdueScheduler');

async function runRealtimeCountdownTests() {
  console.log('================================================================');
  console.log('KCT AI SMART LIBRARY — REAL-TIME COUNTDOWN & OVERDUE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Template Verification (Feature 6)
  await check('Feature 6: SMS template matches exact required wording', async () => {
    const studentName = 'Santhosh Krishnaa';
    const bookTitle = 'Deep Learning with Python';
    const msg = compileAutoOverdueTemplate({ studentName, bookTitle });
    const expected = `Dear Santhosh Krishnaa, your borrowed book 'Deep Learning with Python' has exceeded its return deadline. Your borrowing period has expired. Please return the book to KCT AI Smart Library immediately. Thank you.`;
    assert.strictEqual(msg, expected, 'SMS template must exactly match specification');
  });

  // 2. Policy & Duration Config (Features 2 & 3)
  await check('Feature 3: System borrowing mode policy retrieves testing duration (10 min)', async () => {
    // Set to testing mode
    await loanService.setBorrowingMode('testing');
    const config = await loanService.getBorrowingConfig();
    assert.strictEqual(config.mode, 'testing');
    assert.strictEqual(config.duration_ms, 10 * 60 * 1000);
    assert.strictEqual(config.duration_label, '10 minutes');
  });

  await check('Feature 2: System borrowing mode policy retrieves production duration (6 days)', async () => {
    // Set to production mode
    await loanService.setBorrowingMode('production');
    const config = await loanService.getBorrowingConfig();
    assert.strictEqual(config.mode, 'production');
    assert.strictEqual(config.duration_ms, 6 * 24 * 60 * 60 * 1000);
    assert.strictEqual(config.duration_label, '6 days');

    // Restore to testing mode for subsequent tests
    await loanService.setBorrowingMode('testing');
  });

  // 3. User & Book Setup
  const students = await db.query("SELECT * FROM users WHERE role = 'student' LIMIT 1");
  const student = students[0];
  assert.ok(student, 'Must have at least one student user');

  // Reset any previous unreturned test loans for this student
  await db.query("UPDATE transactions SET status = 'Returned', return_date = NOW() WHERE user_id = ? AND status = 'Issued'", [student.id]);
  await db.query("UPDATE books SET available_copies = total_copies WHERE available_copies < total_copies");

  const librarians = await db.query("SELECT * FROM users WHERE role = 'librarian' LIMIT 1");
  const librarian = librarians[0];
  assert.ok(librarian, 'Must have at least one librarian user');

  const books = await db.query("SELECT * FROM books WHERE available_copies > 0 LIMIT 2");
  assert.ok(books.length >= 2, 'Must have at least 2 available books for test');
  const testBook1 = books[0];
  const testBook2 = books[1];

  let testTx1 = null;
  let testTx2 = null;

  // 4. Feature 1 & 2: Student Borrow in 10-Minute Testing Mode
  await check('Feature 1 & 3: Student borrows book in testing mode, gets ~10 min due date', async () => {
    const initialCopies = testBook1.available_copies;
    const borrowRes = await loanService.borrowBookOnline(testBook1.id, student);
    assert.ok(borrowRes.success);
    assert.ok(borrowRes.transaction);
    testTx1 = borrowRes.transaction;

    // Verify copies decreased
    const updatedBook = await db.query('SELECT available_copies FROM books WHERE id = ?', [testBook1.id]);
    assert.strictEqual(updatedBook[0].available_copies, initialCopies - 1);

    // Verify remaining_ms is ~600,000 ms (within 10 seconds tolerance)
    assert.ok(testTx1.remaining_ms > 580000 && testTx1.remaining_ms <= 600000, 
      `Remaining ms (${testTx1.remaining_ms}) should be ~600,000 ms`);
    assert.strictEqual(testTx1.is_overdue, false);
    assert.ok(testTx1.cover_image, 'Must include cover image');
  });

  // 5. Feature 4: Librarian active circulation reflects borrow immediately
  await check('Feature 4: Librarian circulation loans list includes active student loan', async () => {
    const allLoans = await loanService.getAllLoans();
    const txId = testTx1.id || testTx1.transaction_id;
    const found = allLoans.find(l => l.transaction_id === txId || l.id === txId);
    assert.ok(found, 'Librarian loan list must include newly borrowed book');
    assert.strictEqual(found.student_name, student.name);
    assert.strictEqual(found.status, 'Issued');
    assert.strictEqual(found.is_overdue, false);
    assert.ok(found.due_date_timestamp > Date.now());
  });

  // 6. Feature 5, 6, 7: Automatic Overdue Detection, SMS & In-App Notification
  await check('Feature 5, 6, 7: Automatic Overdue detection triggers SMS and Notification after deadline', async () => {
    const txId = testTx1.id || testTx1.transaction_id;

    // Manually backdate testTx1 due date by 1 minute into the past to simulate 10 minutes elapsed
    await db.query(`
      UPDATE transactions 
      SET due_date = DATE_SUB(NOW(), INTERVAL 1 MINUTE) 
      WHERE id = ?
    `, [txId]);

    // Run overdue scheduler check
    const result = await checkAndDispatchOverdueReminders();
    assert.ok(result.overdueLoansFound >= 1, 'Overdue scheduler should find overdue loans');

    // Verify transaction status and SMS tracking in database
    const txRows = await db.query('SELECT * FROM transactions WHERE id = ?', [txId]);
    assert.strictEqual(txRows[0].status, 'Issued');
    const computed = loanService.computeLoanStatus(txRows[0]);
    assert.strictEqual(computed.is_overdue, true);
    assert.strictEqual(computed.status_label, 'Overdue');
    assert.ok(txRows[0].sms_count >= 1, 'SMS reminder count should be incremented');

    // Verify In-App Notification was generated for student
    const notifications = await loanService.getStudentNotifications(student.id);
    const overdueNotif = notifications.find(n => n.transaction_id === txId || n.message.includes(testBook1.title));
    assert.ok(overdueNotif, 'Student notifications must contain overdue reminder');
    assert.strictEqual(overdueNotif.title, 'Book Return Deadline Expired');
    assert.ok(overdueNotif.message.includes('Dear ' + student.name));
    assert.ok(overdueNotif.message.includes(testBook1.title));

    // Verify overdue appearance in Librarian Overdue filter
    const overdueLoans = await loanService.getAllLoans({ overdueFilter: 'overdue' });
    const foundInOverdue = overdueLoans.find(l => l.transaction_id === txId || l.id === txId);
    assert.ok(foundInOverdue, 'Librarian Overdue Monitor must list the overdue transaction');
    assert.strictEqual(foundInOverdue.is_overdue, true);
  });

  // 7. Feature 1 & 7: Return Book Workflow
  await check('Feature 7: Returning book stops timer, marks Returned, restores copies', async () => {
    // Borrow second book
    const initialCopies2 = testBook2.available_copies;
    const borrow2 = await loanService.borrowBookOnline(testBook2.id, student);
    testTx2 = borrow2.transaction;
    const txId2 = testTx2.id || testTx2.transaction_id;

    // Student returns testBook2
    const returnRes = await loanService.recordBookReturn(txId2, student);
    assert.ok(returnRes.success);
    assert.strictEqual(returnRes.transaction.status, 'Returned');

    // Verify copies restored
    const restoredBook = await db.query('SELECT available_copies FROM books WHERE id = ?', [testBook2.id]);
    assert.strictEqual(restoredBook[0].available_copies, initialCopies2);

    // Verify it is not in overdue list
    const overdueLoans = await loanService.getAllLoans({ overdueFilter: 'overdue' });
    const inOverdue = overdueLoans.find(l => l.transaction_id === txId2);
    assert.strictEqual(inOverdue, undefined, 'Returned book must not be in overdue monitor');

    // Clean up testTx1 by returning it as well
    const txId1 = testTx1.id || testTx1.transaction_id;
    await loanService.recordBookReturn(txId1, student);
  });

  // 8. Notification Read
  await check('Feature 7: Student can mark notification as read', async () => {
    const notifs = await loanService.getStudentNotifications(student.id);
    if (notifs.length > 0) {
      await loanService.markNotificationAsRead(notifs[0].id, student.id);
      const updated = await db.query('SELECT is_read FROM notifications WHERE id = ?', [notifs[0].id]);
      assert.strictEqual(updated[0].is_read, 1);
    }
  });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRealtimeCountdownTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
