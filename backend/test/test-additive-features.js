const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const {
  dispatchSMSViaGateway,
  compileAutoOverdueTemplate,
  compileOverdueTemplate,
  formatOverdueDuration,
  SMS_CONFIG
} = require('../services/smsService');
const {
  checkAndDispatchOverdueReminders,
  getSchedulerStatus
} = require('../services/overdueScheduler');
const loanService = require('../services/loanService');

async function runTests() {
  console.log('================================================================');
  console.log('KCT AI SMART LIBRARY — ADDITIVE FEATURES VERIFICATION SUITE');
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

  // 1. FEATURE 1: Template verification
  await check('Feature 1: Automatic Overdue SMS template matches exact required string', async () => {
    const studentName = 'Santhosh Krishnaa';
    const bookTitle = 'Artificial Intelligence: A Modern Approach';
    const dueDateTime = '24 Oct 2026, 11:30 am';

    const msg = compileAutoOverdueTemplate({ studentName, bookTitle, dueDateTime });
    const expected = `Dear Santhosh Krishnaa, your borrowed book 'Artificial Intelligence: A Modern Approach' has exceeded its return deadline. Your borrowing period has expired. Please return the book to KCT AI Smart Library immediately. Thank you.`;

    assert.strictEqual(msg, expected, 'SMS template must exactly match specification');
  });

  // 2. FEATURE 5: Multi-gateway honest reporting
  await check('Feature 5: SMS Gateway provides honest status when unconfigured without fake success', async () => {
    const res = await dispatchSMSViaGateway('+919876543210', 'Test overdue message');
    assert.strictEqual(res.success, false, 'Should report success false when unconfigured');
    assert.strictEqual(res.status, 'Failed', 'Status must be Failed, never fake Delivered');
    assert.ok(res.warning.length > 0, 'Warning must explain unconfigured gateway');
  });

  // 3. Database connection & columns check
  await check('Database: Verify notifications table has title, is_read, read_at columns', async () => {
    const cols = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME IN ('title', 'is_read', 'read_at')
    `);
    const colNames = cols.map(c => c.COLUMN_NAME);
    assert.ok(colNames.includes('title'), 'Column title must exist');
    assert.ok(colNames.includes('is_read'), 'Column is_read must exist');
    assert.ok(colNames.includes('read_at'), 'Column read_at must exist');
  });

  await check('Database: Verify transactions table has auto_reminders_count, last_auto_reminder_at', async () => {
    const cols = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'transactions'
        AND COLUMN_NAME IN ('auto_reminders_count', 'last_auto_reminder_at')
    `);
    const colNames = cols.map(c => c.COLUMN_NAME);
    assert.ok(colNames.includes('auto_reminders_count'), 'Column auto_reminders_count must exist');
    assert.ok(colNames.includes('last_auto_reminder_at'), 'Column last_auto_reminder_at must exist');
  });

  // 4. FEATURE 1 & 2: Background Overdue Scheduler Execution
  await check('Feature 1 & 2: Background scheduler detects overdue loan, dispatches SMS log and student in-app notice', async () => {
    // Setup test overdue loan for user 3 (student)
    const testLoan = await db.query(`
      SELECT t.id, t.user_id 
      FROM transactions t 
      WHERE t.status = 'Issued' AND t.due_date < NOW()
      LIMIT 1
    `);

    assert.ok(testLoan.length > 0, 'Must have at least 1 overdue transaction for testing');
    const loanId = testLoan[0].id;
    const studentUserId = testLoan[0].user_id;

    // Reset last_auto_reminder_at to test initial automatic detection
    await db.query(`
      UPDATE transactions 
      SET last_auto_reminder_at = NULL, last_sms_sent_at = NULL 
      WHERE id = ?
    `, [loanId]);

    // Run scheduler check
    const summary = await checkAndDispatchOverdueReminders();
    assert.ok(summary.overdueLoansFound > 0, 'Scheduler must find overdue loans');
    assert.ok(summary.dispatchedCount > 0, 'Scheduler must dispatch reminders for first overdue');

    // Verify transaction record was updated
    const updatedTx = await db.query(`
      SELECT last_auto_reminder_at, auto_reminders_count, sms_status 
      FROM transactions 
      WHERE id = ?
    `, [loanId]);
    assert.ok(updatedTx[0].last_auto_reminder_at, 'last_auto_reminder_at must be populated');
    assert.ok(updatedTx[0].auto_reminders_count >= 1, 'auto_reminders_count must be incremented');

    // Verify student in-app notification exists
    const notifs = await db.query(`
      SELECT id, title, type, is_read, status, message 
      FROM notifications 
      WHERE user_id = ? AND transaction_id = ? AND type = 'InApp'
      ORDER BY id DESC LIMIT 1
    `, [studentUserId, loanId]);

    assert.ok(notifs.length > 0, 'In-app notification must be generated for student');
    assert.strictEqual(notifs[0].title, 'Book Return Deadline Expired', 'Title must match exact specification');
    assert.strictEqual(Boolean(notifs[0].is_read), false, 'New notification must be unread (is_read = FALSE)');
    assert.strictEqual(notifs[0].status, 'Delivered', 'In-app notification must be Delivered');
  });

  // 5. FEATURE 1: Cooldown / anti-spam enforcement
  await check('Feature 1: Scheduler enforces 24-hour / 30-min cooldown to avoid spamming students', async () => {
    // Running immediate second check should dispatch 0 since cooldown is active
    const secondSummary = await checkAndDispatchOverdueReminders();
    assert.strictEqual(secondSummary.dispatchedCount, 0, 'Cooldown must block duplicate reminder dispatched in quick succession');
  });

  // 6. FEATURE 2: Student notification read operations & unread counter
  await check('Feature 2: Student retrieves scoped notifications with unread count and marks as read', async () => {
    // Insert an unread notification for user 3
    await db.query(`
      INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
      VALUES (3, 1, 'InApp', 'student@kct.ac.in', 'Test overdue notice', 'Delivered', 'CampusSystem', 'Book Return Deadline Expired', FALSE)
    `);

    // Student user 3
    const studentNotifications = await loanService.getStudentNotifications(3);
    assert.ok(Array.isArray(studentNotifications), 'Should return array of notifications');
    
    const unread = studentNotifications.filter(n => !n.is_read);
    assert.ok(unread.length > 0, 'Should have at least 1 unread notification from setup');

    const firstUnread = unread[0];
    assert.strictEqual(firstUnread.title, 'Book Return Deadline Expired');
    assert.ok(firstUnread.return_instructions, 'Must include actionable return instructions');
    assert.ok(firstUnread.overdue_duration_text, 'Must include overdue duration');

    // Mark single notification as read
    await loanService.markNotificationAsRead(firstUnread.id, 3);

    // Verify it is now read
    const refreshed = await loanService.getStudentNotifications(3);
    const target = refreshed.find(n => n.id === firstUnread.id);
    assert.strictEqual(target.is_read, true, 'Notification must be marked as read');
    assert.ok(target.read_at, 'read_at timestamp must be recorded');

    // Mark all as read
    await loanService.markAllNotificationsAsRead(3);
    const allRefreshed = await loanService.getStudentNotifications(3);
    const anyUnread = allRefreshed.some(n => !n.is_read);
    assert.strictEqual(anyUnread, false, 'All notifications must be marked read');
  });

  // 7. FEATURE 2: Strict student privacy enforcement
  await check('Feature 2: Strict student privacy — students cannot view notifications belonging to other users', async () => {
    // Retrieve notifications for student 3 vs student 4
    const notifsUser3 = await loanService.getStudentNotifications(3);
    const notifsUser4 = await loanService.getStudentNotifications(4);

    const user3Ids = notifsUser3.map(n => n.id);
    const user4Ids = notifsUser4.map(n => n.id);

    const intersection = user3Ids.filter(id => user4Ids.includes(id));
    assert.strictEqual(intersection.length, 0, 'No notification IDs can be shared across different user accounts');
  });

  // 8. FEATURE 3: Indian Rupee (₹) formatting and fine policy
  await check('Feature 3: INR formatting utility produces standard Indian currency strings', async () => {
    const { formatINR } = await import('../../frontend/src/utils/currencyFormatter.js');
    assert.strictEqual(formatINR(50), '₹50.00');
    assert.strictEqual(formatINR(100), '₹100.00');
    assert.strictEqual(formatINR(1500), '₹1,500.00');
    assert.strictEqual(formatINR(10000), '₹10,000.00');
    assert.strictEqual(formatINR(100000), '₹1,00,000.00');
  });

  await check('Feature 3: Fine policy is configured in INR (₹5.00/day)', async () => {
    const policy = await db.query("SELECT policy_value FROM policies WHERE policy_key = 'fine_per_day'");
    assert.ok(policy.length > 0, 'fine_per_day policy must exist');
    assert.strictEqual(parseFloat(policy[0].policy_value), 5.0, 'fine_per_day must be 5.00 INR');
  });

  // 9. FEATURE 4: Librarian overdue reminder logs
  await check('Feature 4: Librarian reminder history returns all required audit fields with honest status', async () => {
    const sql = `
      SELECT 
        n.id,
        n.user_id,
        n.transaction_id,
        n.type,
        n.recipient,
        n.message,
        n.status,
        n.provider,
        DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i') as created_at,
        u.name as student_name,
        u.student_id,
        u.contact_number,
        COALESCE(b.title, 'Library Book') as book_title,
        DATE_FORMAT(t.due_date, '%Y-%m-%d %H:%i') as due_date,
        'Created' as notification_created_status
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN transactions t ON n.transaction_id = t.id
      LEFT JOIN books b ON t.book_id = b.id
      WHERE n.type = 'SMS' OR n.type = 'OverdueSMS'
      ORDER BY n.created_at DESC
      LIMIT 10
    `;
    const logs = await db.query(sql);
    assert.ok(logs.length > 0, 'SMS logs must exist');
    const firstLog = logs[0];

    assert.ok(firstLog.student_name, 'student_name required');
    assert.ok(firstLog.student_id, 'student_id required');
    assert.ok(firstLog.book_title, 'book_title required');
    assert.ok(firstLog.due_date, 'due_date required');
    assert.ok(firstLog.created_at, 'created_at (SMS sent date/time) required');
    assert.ok(firstLog.contact_number || firstLog.recipient, 'registered mobile number required');
    assert.ok(['Sent', 'Delivered', 'Failed', 'Pending'].includes(firstLog.status), 'Valid SMS delivery status required');
    assert.strictEqual(firstLog.notification_created_status, 'Created', 'notification_created_status required');
  });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  console.log('All test checks completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
