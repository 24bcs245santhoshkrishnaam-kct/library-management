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
    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Book ID is required to borrow online' });
    }

    const result = await loanService.borrowBookOnline(parseInt(bookId, 10), req.user);
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

module.exports = {
  getMyLoans,
  getMyStatus,
  getAllLoans,
  returnLoan,
  issueLoan,
  borrowOnline,
  renewLoan,
  updateLoan
};
