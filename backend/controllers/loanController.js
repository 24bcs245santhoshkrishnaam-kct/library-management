const loanService = require('../services/loanService');

async function getMyLoans(req, res) {
  try {
    const loans = await loanService.getStudentLoans(req.user.id);
    res.json({
      success: true,
      student: {
        id: req.user.id,
        name: req.user.name,
        student_id: req.user.student_id
      },
      count: loans.length,
      loans
    });
  } catch (err) {
    console.error('[Get My Loans Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getMyStatus(req, res) {
  try {
    const summary = await loanService.getStudentLoanSummary(req.user.id);
    res.json({
      success: true,
      student: {
        id: req.user.id,
        name: req.user.name,
        student_id: req.user.student_id
      },
      ...summary
    });
  } catch (err) {
    console.error('[Get My Status Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getAllLoans(req, res) {
  try {
    const { status, search, overdueFilter, department } = req.query;
    const loans = await loanService.getAllLoans({ status, search, overdueFilter, department });
    res.json({
      success: true,
      count: loans.length,
      loans
    });
  } catch (err) {
    console.error('[Get All Loans Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function returnLoan(req, res) {
  try {
    const transactionId = parseInt(req.params.id, 10);
    if (!transactionId || isNaN(transactionId)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid transaction ID required' });
    }

    const result = await loanService.recordBookReturn(transactionId, req.user);
    res.json(result);
  } catch (err) {
    console.error('[Return Loan Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: 'Return Operation Failed',
      message: err.message
    });
  }
}

async function issueLoan(req, res) {
  try {
    const { bookId, studentUserId, dueDate, notes } = req.body;

    if (!bookId || !studentUserId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Book ID and Student User ID are required to issue a book'
      });
    }

    const result = await loanService.issueBook({
      bookId: parseInt(bookId, 10),
      studentUserId: parseInt(studentUserId, 10),
      dueDate,
      notes
    }, req.user);

    res.json(result);
  } catch (err) {
    console.error('[Issue Loan Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: 'Issue Operation Failed',
      message: err.message
    });
  }
}

async function borrowOnline(req, res) {
  try {
    const { bookId, duration } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Book ID is required to borrow online' });
    }

    const result = await loanService.borrowBookOnline(parseInt(bookId, 10), req.user, duration);
    res.json(result);
  } catch (err) {
    console.error('[Borrow Online Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: 'Online Borrow Failed',
      message: err.message
    });
  }
}

async function getStudentNotifications(req, res) {
  try {
    const notifications = await loanService.getStudentNotifications(req.user.id);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    res.json({
      success: true,
      count: notifications.length,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    console.error('[Get Student Notifications Error]:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid notification ID required' });
    }
    await loanService.markNotificationAsRead(notificationId, req.user.id);
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    console.error('[Mark Notification Read Error]:', err.message);
    res.status(500).json({ error: 'Failed to update notification', message: err.message });
  }
}

async function markAllNotificationsAsRead(req, res) {
  try {
    await loanService.markAllNotificationsAsRead(req.user.id);
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    console.error('[Mark All Notifications Read Error]:', err.message);
    res.status(500).json({ error: 'Failed to update notifications', message: err.message });
  }
}

async function renewLoan(req, res) {
  try {
    const transactionId = parseInt(req.params.id, 10);
    if (!transactionId || isNaN(transactionId)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid transaction ID required' });
    }

    const result = await loanService.renewLoan(transactionId, req.user);
    res.json(result);
  } catch (err) {
    console.error('[Renew Loan Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: 'Renew Operation Failed',
      message: err.message
    });
  }
}

async function updateLoan(req, res) {
  try {
    const transactionId = parseInt(req.params.id, 10);
    if (!transactionId || isNaN(transactionId)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid transaction ID required' });
    }

    const result = await loanService.updateLoanDetails(transactionId, req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error('[Update Loan Error]:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: 'Update Loan Failed',
      message: err.message
    });
  }
}

async function getBorrowingMode(req, res) {
  try {
    const config = await loanService.getBorrowingConfig();
    res.json({
      success: true,
      ...config
    });
  } catch (err) {
    console.error('[Get Borrowing Mode Error]:', err.message);
    res.status(500).json({ error: 'Failed to retrieve configuration', message: err.message });
  }
}

async function updateBorrowingMode(req, res) {
  try {
    const { mode } = req.body;
    if (!mode || (mode !== 'production' && mode !== 'testing')) {
      return res.status(400).json({ error: 'Validation Error', message: 'Mode must be "production" or "testing"' });
    }
    const updated = await loanService.setBorrowingMode(mode);
    res.json({
      success: true,
      message: `Borrowing duration mode updated to ${updated.mode} (${updated.duration_label})`,
      ...updated
    });
  } catch (err) {
    console.error('[Update Borrowing Mode Error]:', err.message);
    res.status(500).json({ error: 'Failed to update mode', message: err.message });
  }
}

module.exports = {
  getMyLoans,
  getMyStatus,
  getAllLoans,
  returnLoan,
  issueLoan,
  borrowOnline,
  renewLoan,
  updateLoan,
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getBorrowingMode,
  updateBorrowingMode
};
