const db = require('../config/db');
const {
  dispatchSMSViaGateway,
  compileAutoOverdueTemplate
} = require('./smsService');

/**
 * Background Overdue Scheduler for KCT AI Smart Library (Feature 1)
 * Runs 24/7 in the background without needing librarian interaction.
 * - Detects active overdue loans (status = 'Issued' AND due_date < NOW())
 * - Immediately dispatches first reminder on becoming overdue
 * - Enforces 24-hour interval for delivered/sent reminders (or 30 mins retry for failed)
 * - Automatically creates in-app notifications with unread indicators for students
 * - Stops reminders immediately once book is returned
 * - Prevents spam / duplicate messages
 */

let schedulerTimer = null;
let isCheckRunning = false;
const schedulerState = {
  isRunning: false,
  intervalMs: Number(process.env.OVERDUE_CHECK_INTERVAL_MS) || 15000, // 15 seconds for responsive overdue detection
  lastRunAt: null,
  totalChecksRun: 0,
  totalRemindersSent: 0,
  lastRunSummary: null
};

/**
 * Perform overdue loan check and dispatch reminders
 */
async function checkAndDispatchOverdueReminders() {
  if (isCheckRunning) {
    return { skipped: true, reason: 'Previous check still running' };
  }

  isCheckRunning = true;
  const startTime = Date.now();
  schedulerState.lastRunAt = new Date().toISOString();
  schedulerState.totalChecksRun += 1;

  try {
    // 1. Fetch active overdue transactions
    const sql = `
      SELECT 
        t.id as transaction_id,
        t.user_id,
        t.book_id,
        t.due_date,
        t.issue_date,
        t.last_auto_reminder_at,
        t.last_sms_sent_at,
        t.sms_status,
        t.auto_reminders_count,
        b.title as book_title,
        u.name as student_name,
        u.email as student_email,
        u.contact_number
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'Issued'
        AND t.due_date < NOW()
      ORDER BY t.due_date ASC
    `;

    const overdueLoans = await db.query(sql);
    let dispatchedCount = 0;
    const dispatchedDetails = [];

    const RETRY_INTERVAL_FAILED_MS = 30 * 60 * 1000;   // 30 minutes retry if failed
    const INTERVAL_SUCCESS_MS = 24 * 60 * 60 * 1000;    // 24 hours interval for success

    for (const loan of overdueLoans) {
      const nowMs = Date.now();
      let shouldSend = false;

      if (!loan.last_auto_reminder_at) {
        // First reminder: send immediately upon becoming overdue
        shouldSend = true;
      } else {
        const lastSentMs = new Date(loan.last_auto_reminder_at).getTime();
        const elapsedMs = nowMs - lastSentMs;

        if (loan.sms_status === 'Failed' && elapsedMs >= RETRY_INTERVAL_FAILED_MS) {
          shouldSend = true;
        } else if (loan.sms_status !== 'Failed' && elapsedMs >= INTERVAL_SUCCESS_MS) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        // Format due date in local format (e.g. 24 Oct 2026, 11:30 AM)
        const dueObj = new Date(loan.due_date);
        const formattedDueDate = dueObj.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });

        // Exact template from prompt:
        // "Dear [Student Name], your library book '[Book Title]' was due on [Due Date]. Your book is now overdue. Please return it to KCT AI Smart Library as soon as possible to avoid additional fines. Thank you."
        const message = compileAutoOverdueTemplate({
          studentName: loan.student_name,
          bookTitle: loan.book_title,
          dueDateTime: formattedDueDate
        });

        const recipientPhone = loan.contact_number || '+91 98765 43210';

        // Dispatch cellular SMS via multi-provider gateway
        const gatewayResult = await dispatchSMSViaGateway(recipientPhone, message);
        const deliveryStatus = gatewayResult.status;
        const providerRef = gatewayResult.provider + (gatewayResult.ref ? `:${gatewayResult.ref}` : '');

        // 1. Create in-app notification for the student (Feature 2 & 7)
        await db.query(`
          INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
          VALUES (?, ?, 'InApp', ?, ?, 'Delivered', 'CampusSystem', 'Book Return Deadline Expired', FALSE)
        `, [
          loan.user_id,
          loan.transaction_id,
          loan.student_email,
          message
        ]);

        // 2. Record SMS log entry (Feature 4 & 6)
        await db.query(`
          INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
          VALUES (?, ?, 'SMS', ?, ?, ?, ?, 'Book Return Deadline Expired', FALSE)
        `, [
          loan.user_id,
          loan.transaction_id,
          recipientPhone,
          message,
          deliveryStatus,
          providerRef
        ]);

        // 3. Update transaction tracking
        await db.query(`
          UPDATE transactions 
          SET last_auto_reminder_at = NOW(),
              last_sms_sent_at = NOW(),
              sms_status = ?,
              sms_count = sms_count + 1,
              auto_reminders_count = auto_reminders_count + 1
          WHERE id = ?
        `, [deliveryStatus, loan.transaction_id]);

        // 4. Audit log entry
        await db.query(`
          INSERT INTO audit_logs (user_name, action, details)
          VALUES ('System Scheduler', 'AUTO_OVERDUE_SMS_REMINDER', ?)
        `, [
          `Auto reminder sent to ${loan.student_name} (${recipientPhone}) for '${loan.book_title}'. Status: ${deliveryStatus}`
        ]).catch(() => {});

        dispatchedCount++;
        schedulerState.totalRemindersSent++;
        dispatchedDetails.push({
          transaction_id: loan.transaction_id,
          student: loan.student_name,
          book: loan.book_title,
          phone: recipientPhone,
          status: deliveryStatus
        });
      }
    }

    const durationMs = Date.now() - startTime;
    schedulerState.lastRunSummary = {
      checkedAt: schedulerState.lastRunAt,
      overdueLoansFound: overdueLoans.length,
      dispatchedCount,
      durationMs,
      details: dispatchedDetails
    };

    return schedulerState.lastRunSummary;
  } catch (err) {
    console.error('[Overdue Scheduler Error]:', err);
    schedulerState.lastRunSummary = {
      checkedAt: schedulerState.lastRunAt,
      error: err.message
    };
    return schedulerState.lastRunSummary;
  } finally {
    isCheckRunning = false;
  }
}

/**
 * Start the background scheduler
 */
function startOverdueScheduler() {
  if (schedulerTimer) {
    return;
  }

  schedulerState.isRunning = true;
  console.log(`[Overdue Scheduler] Started background daemon (Interval: ${schedulerState.intervalMs}ms)`);

  // Run initial check 3 seconds after boot
  setTimeout(() => {
    checkAndDispatchOverdueReminders().catch(err => {
      console.warn('[Overdue Scheduler Initial Run Error]:', err.message);
    });
  }, 3000);

  // Periodic recurring timer
  schedulerTimer = setInterval(() => {
    checkAndDispatchOverdueReminders().catch(err => {
      console.warn('[Overdue Scheduler Periodic Run Error]:', err.message);
    });
  }, schedulerState.intervalMs);
}

/**
 * Stop the background scheduler
 */
function stopOverdueScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  schedulerState.isRunning = false;
  console.log('[Overdue Scheduler] Stopped');
}

/**
 * Get current scheduler status and metrics
 */
function getSchedulerStatus() {
  return {
    ...schedulerState,
    activeTimer: Boolean(schedulerTimer)
  };
}

module.exports = {
  startOverdueScheduler,
  stopOverdueScheduler,
  checkAndDispatchOverdueReminders,
  getSchedulerStatus
};

