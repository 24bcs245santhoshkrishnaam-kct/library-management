const smsService = require('../services/smsService');
const { checkAndDispatchOverdueReminders, getSchedulerStatus: fetchSchedulerStatus } = require('../services/overdueScheduler');
const db = require('../config/db');

async function previewOverdueSMS(req, res) {
  try {
    const transactionId = parseInt(req.params.id || req.params.transactionId, 10);
    if (!transactionId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid transaction ID is required' });
    }

    const preview = await smsService.previewOverdueSMS(transactionId);
    res.json({
      success: true,
      message: preview.message,
      preview
    });
  } catch (err) {
    console.error('[SMS Preview Error]:', err.message);
    res.status(400).json({ error: 'Preview Failed', message: err.message });
  }
}

async function sendOverdueSMS(req, res) {
  try {
    const transactionId = parseInt(req.params.id || req.body.transactionId || req.body.loanId, 10);
    const customMessage = req.body.message;
    const bypassDuplicateCheck = Boolean(req.body.bypassDuplicateCheck || req.body.force);

    if (!transactionId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid transaction ID is required' });
    }

    const result = await smsService.sendOverdueSMS(transactionId, req.user, customMessage, bypassDuplicateCheck);
    res.json(result);
  } catch (err) {
    console.error('[SMS Dispatch Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ error: 'Dispatch Failed', message: err.message });
  }
}

async function sendBulkOverdueSMS(req, res) {
  try {
    let ids = req.body.loanIds || req.body.transactionIds;

    // If no specific IDs provided, automatically gather all active overdue transactions
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const overdueRows = await db.query(`
        SELECT id FROM transactions 
        WHERE status = 'Issued' AND due_date < NOW()
      `);
      ids = overdueRows.map(r => r.id);
    }

    if (ids.length === 0) {
      return res.json({
        success: true,
        message: 'No active overdue transactions requiring SMS reminders at this time.',
        sentCount: 0,
        results: []
      });
    }

    const result = await smsService.sendBulkOverdueSMS(ids, req.user);
    res.json(result);
  } catch (err) {
    console.error('[Bulk SMS Dispatch Error]:', err.message);
    res.status(500).json({ error: 'Bulk Dispatch Failed', message: err.message });
  }
}

async function getSMSLogs(req, res) {
  try {
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
      LIMIT 100
    `;
    const logs = await db.query(sql);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('[Get SMS Logs Error]:', err.message);
    res.status(500).json({ error: 'Failed to retrieve logs', message: err.message });
  }
}

async function runAutoOverdueCheck(req, res) {
  try {
    const result = await checkAndDispatchOverdueReminders();
    res.json({
      success: true,
      message: 'Automatic overdue check completed',
      result
    });
  } catch (err) {
    console.error('[Run Auto Overdue Check Error]:', err.message);
    res.status(500).json({ error: 'Auto Check Failed', message: err.message });
  }
}

async function getSchedulerStatus(req, res) {
  try {
    const status = fetchSchedulerStatus();
    res.json({
      success: true,
      scheduler: status
    });
  } catch (err) {
    console.error('[Scheduler Status Error]:', err.message);
    res.status(500).json({ error: 'Status Failed', message: err.message });
  }
}

module.exports = {
  previewOverdueSMS,
  sendOverdueSMS,
  sendBulkOverdueSMS,
  getSMSLogs,
  runAutoOverdueCheck,
  getSchedulerStatus
};
