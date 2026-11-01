const db = require('../config/db');

/**
 * SMS Notification Service for KCT AI Smart Library
 * Adheres strictly to security, multi-provider verification, and in-app sync rules
 * Supported Gateways: Twilio, Fast2SMS, MSG91
 */

const SMS_CONFIG = {
  provider: process.env.SMS_GATEWAY_PROVIDER || (process.env.FAST2SMS_API_KEY ? 'FAST2SMS' : process.env.MSG91_AUTH_KEY ? 'MSG91' : 'TWILIO'),
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91SenderId: process.env.MSG91_SENDER_ID || 'KCTLIB',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
  get isConfigured() {
    return Boolean(
      (this.accountSid && this.authToken) ||
      this.fast2smsApiKey ||
      (this.msg91AuthKey && this.msg91TemplateId)
    );
  }
};

/**
 * Dispatch SMS via configured gateway (Twilio, Fast2SMS, MSG91)
 * Uses native fetch with zero external dependencies
 */
async function dispatchSMSViaGateway(rawPhone, message) {
  const phone = String(rawPhone || '').trim();
  const digitsOnly = phone.replace(/[^0-9]/g, '');

  if (!SMS_CONFIG.isConfigured) {
    return {
      success: false,
      status: 'Failed',
      provider: 'UnconfiguredGateway',
      warning: 'SMS Gateway credentials (Twilio, Fast2SMS, or MSG91) are not configured in backend environment (.env). In-app notification has been saved for student, but cellular SMS could not be dispatched.'
    };
  }

  // 1. FAST2SMS (India)
  if (SMS_CONFIG.fast2smsApiKey) {
    try {
      const indianNumber = digitsOnly.slice(-10); // 10 digit Indian mobile number
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': SMS_CONFIG.fast2smsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          flash: 0,
          numbers: indianNumber
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.return) {
        return { success: true, status: 'Sent', provider: 'Fast2SMS', ref: data.request_id || 'Fast2SMS' };
      }
      return { success: false, status: 'Failed', provider: 'Fast2SMS', warning: data.message || 'Fast2SMS dispatch failed' };
    } catch (err) {
      console.warn('[Fast2SMS Error]:', err.message);
      return { success: false, status: 'Failed', provider: 'Fast2SMS', warning: err.message };
    }
  }

  // 2. MSG91 (India)
  if (SMS_CONFIG.msg91AuthKey && SMS_CONFIG.msg91TemplateId) {
    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': SMS_CONFIG.msg91AuthKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: SMS_CONFIG.msg91TemplateId,
          short_url: 0,
          recipients: [{ mobiles: digitsOnly, message: message }]
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.type === 'success') {
        return { success: true, status: 'Sent', provider: 'MSG91', ref: data.message || 'MSG91' };
      }
      return { success: false, status: 'Failed', provider: 'MSG91', warning: data.message || 'MSG91 dispatch failed' };
    } catch (err) {
      console.warn('[MSG91 Error]:', err.message);
      return { success: false, status: 'Failed', provider: 'MSG91', warning: err.message };
    }
  }

  // 3. TWILIO (Global & India)
  if (SMS_CONFIG.accountSid && SMS_CONFIG.authToken) {
    try {
      const toPhone = phone.startsWith('+') ? phone : (digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`);
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${SMS_CONFIG.accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${SMS_CONFIG.accountSid}:${SMS_CONFIG.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', toPhone);
      params.append('From', SMS_CONFIG.fromNumber);
      params.append('Body', message);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.status === 'sent' || data.status === 'queued' || data.status === 'delivered')) {
        return { success: true, status: data.status === 'delivered' ? 'Delivered' : 'Sent', provider: 'Twilio', ref: data.sid };
      }
      return { success: false, status: 'Failed', provider: 'Twilio', warning: data.message || 'Twilio dispatch failed' };
    } catch (err) {
      console.warn('[Twilio Error]:', err.message);
      return { success: false, status: 'Failed', provider: 'Twilio', warning: err.message };
    }
  }

  return {
    success: false,
    status: 'Failed',
    provider: 'UnconfiguredGateway',
    warning: 'No SMS Gateway credentials configured in .env'
  };
}

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
 * Generate standard librarian overdue SMS reminder template (Feature 4)
 * "Dear Santhosh, your library book '[Book Title]' was due on [Due Date and Time] and is overdue by [Overdue Duration]. Please return it according to library rules. — KCT AI Smart Library"
 */
function compileOverdueTemplate({ studentName, bookTitle, dueDateTime, overdueDuration }) {
  return `Dear ${studentName}, your library book '${bookTitle}' was due on ${dueDateTime} and is overdue by ${overdueDuration}. Please return it according to library rules. — KCT AI Smart Library`;
}

/**
 * Generate automatic scheduled overdue reminder template (Feature 6)
 * "Dear [Student Name], your borrowed book '[Book Title]' has exceeded its return deadline. Your borrowing period has expired. Please return the book to KCT AI Smart Library immediately. Thank you."
 */
function compileAutoOverdueTemplate({ studentName, bookTitle, dueDateTime }) {
  return `Dear ${studentName}, your borrowed book '${bookTitle}' has exceeded its return deadline. Your borrowing period has expired. Please return the book to KCT AI Smart Library immediately. Thank you.`;
}

/**
 * Preview SMS before dispatch
 */
async function previewOverdueSMS(transactionId) {
  const sql = `
    SELECT 
      t.id as transaction_id,
      DATE_FORMAT(t.due_date, '%Y-%m-%d %H:%i:%s') as due_date,
      DATE_FORMAT(t.issue_date, '%Y-%m-%d %H:%i:%s') as issue_date,
      t.duration,
      t.fine_amount,
      t.last_sms_sent_at,
      t.sms_status,
      b.title as book_title,
      u.id as user_id,
      u.name as student_name,
      u.contact_number,
      u.email as student_email
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `;
  const rows = await db.query(sql, [transactionId]);
  if (!rows || rows.length === 0) {
    const err = new Error(`Transaction #${transactionId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const tx = rows[0];
  const now = new Date();
  const due = new Date(tx.due_date);
  const diffMs = now.getTime() - due.getTime();
  const overdueDuration = formatOverdueDuration(diffMs);
  const daysOverdue = Math.max(1, Math.ceil(diffMs / 86400000));

  const formattedDueDate = due.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const message = compileOverdueTemplate({
    studentName: tx.student_name,
    bookTitle: tx.book_title,
    dueDateTime: formattedDueDate,
    overdueDuration: diffMs > 0 ? overdueDuration : '0 minutes'
  });

  return {
    transaction_id: tx.transaction_id,
    student_id: tx.user_id,
    student_name: tx.student_name,
    student_email: tx.student_email,
    recipient_phone: tx.contact_number || '+91 98765 43210',
    book_title: tx.book_title,
    due_date_raw: tx.due_date,
    due_date_formatted: formattedDueDate,
    overdue_duration: overdueDuration,
    days_overdue: diffMs > 0 ? daysOverdue : 0,
    is_overdue: diffMs > 0,
    message,
    last_sms_sent_at: tx.last_sms_sent_at,
    sms_status: tx.sms_status,
    gateway_configured: SMS_CONFIG.isConfigured
  };
}

/**
 * Dispatch single SMS reminder (Feature 4 & 5)
 */
async function sendOverdueSMS(transactionId, staffUser = { name: 'Librarian' }, customMessage = null, bypassDuplicateCheck = false) {
  const preview = await previewOverdueSMS(transactionId);

  // Prevent accidental duplicate messages within 2 minutes (120 seconds) unless bypassed
  if (!bypassDuplicateCheck && preview.last_sms_sent_at) {
    const lastSent = new Date(preview.last_sms_sent_at);
    const sinceLast = Date.now() - lastSent.getTime();
    if (sinceLast < 120000) {
      const waitSecs = Math.ceil((120000 - sinceLast) / 1000);
      const err = new Error(`A reminder was already dispatched to ${preview.student_name} recently. Please wait ${waitSecs}s before sending another to prevent duplicate messages.`);
      err.statusCode = 429;
      throw err;
    }
  }

  const finalMessage = customMessage && customMessage.trim() ? customMessage.trim() : preview.message;
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let deliveryStatus = 'Pending';
  let providerRef = 'Unconfigured';
  let gatewayWarning = null;

  // Dispatch SMS using unified multi-provider gateway (Twilio, Fast2SMS, MSG91)
  const gatewayResult = await dispatchSMSViaGateway(preview.recipient_phone, finalMessage);
  deliveryStatus = gatewayResult.status;
  providerRef = gatewayResult.provider + (gatewayResult.ref ? `:${gatewayResult.ref}` : '');
  gatewayWarning = gatewayResult.warning || null;

  // FEATURE 2 & 5: Create and save in-app notification for the student (Always preserved even if SMS fails)
  await db.query(`
    INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider, title, is_read)
    VALUES (?, ?, 'InApp', ?, ?, 'Delivered', 'CampusSystem', 'Library Book Overdue Reminder', FALSE)
  `, [
    preview.student_id,
    preview.transaction_id,
    preview.student_email,
    finalMessage
  ]);

  // Record cellular SMS dispatch attempt in notifications log
  await db.query(`
    INSERT INTO notifications (user_id, transaction_id, type, recipient, message, status, provider)
    VALUES (?, ?, 'SMS', ?, ?, ?, ?)
  `, [
    preview.student_id,
    preview.transaction_id,
    preview.recipient_phone,
    finalMessage,
    deliveryStatus,
    providerRef
  ]);

  // Update transaction status
  await db.query(`
    UPDATE transactions 
    SET last_sms_sent_at = NOW(), sms_status = ?, sms_count = sms_count + 1
    WHERE id = ?
  `, [deliveryStatus, transactionId]);

  // Record audit log
  await db.query(`
    INSERT INTO audit_logs (user_name, action, details)
    VALUES (?, 'SEND_SMS_REMINDER', ?)
  `, [
    staffUser.name || 'Librarian',
    `Dispatched reminder for "${preview.book_title}" to ${preview.student_name} (${preview.recipient_phone}). Status: ${deliveryStatus}`
  ]).catch(() => {});

  return {
    success: true,
    transaction_id: transactionId,
    student_name: preview.student_name,
    recipient: preview.recipient_phone,
    dispatched_text: finalMessage,
    sms_gateway_configured: SMS_CONFIG.isConfigured,
    delivery_status: deliveryStatus,
    sms: {
      status: deliveryStatus,
      recipient: preview.recipient_phone
    },
    in_app_notification_created: true,
    warning: gatewayWarning,
    message: SMS_CONFIG.isConfigured 
      ? `SMS reminder dispatched to ${preview.student_name} (${deliveryStatus}). In-app notification created.`
      : `In-app notification saved for ${preview.student_name}. (Cellular SMS: Gateway credentials not configured in backend .env)`,
    timestamp: nowStr
  };
}

/**
 * Dispatch bulk SMS reminders
 */
async function sendBulkOverdueSMS(transactionIds = [], staffUser) {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new Error('Please select at least one overdue transaction to send reminders');
  }

  const results = [];
  for (const txId of transactionIds) {
    try {
      const res = await sendOverdueSMS(txId, staffUser, null, true);
      results.push({ transaction_id: txId, success: true, ...res });
    } catch (err) {
      results.push({ transaction_id: txId, success: false, error: err.message });
    }
  }

  const successfulCount = results.filter(r => r.success).length;

  return {
    success: true,
    total_requested: transactionIds.length,
    total_sent: successfulCount,
    sentCount: successfulCount,
    message: `Processed reminders for ${successfulCount} of ${transactionIds.length} overdue records.`,
    details: results
  };
}

module.exports = {
  SMS_CONFIG,
  dispatchSMSViaGateway,
  compileOverdueTemplate,
  compileAutoOverdueTemplate,
  formatOverdueDuration,
  previewOverdueSMS,
  sendOverdueSMS,
  sendBulkOverdueSMS
};
