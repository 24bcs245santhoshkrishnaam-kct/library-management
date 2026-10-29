const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');

// Student borrowing status endpoints (Strictly protected - student sees only their own data)
router.get('/my', authenticateToken, loanController.getMyLoans);
router.get('/my/status', authenticateToken, loanController.getMyStatus);
router.post('/borrow', authenticateToken, loanController.borrowOnline);
router.post('/:id/renew', authenticateToken, loanController.renewLoan);

// Librarian management endpoints (Requires librarian authorization)
router.get('/', authenticateToken, requireLibrarian, loanController.getAllLoans);
router.put('/:id', authenticateToken, requireLibrarian, loanController.updateLoan);
router.post('/:id/return', authenticateToken, requireLibrarian, loanController.returnLoan);
router.post('/issue', authenticateToken, requireLibrarian, loanController.issueLoan);

module.exports = router;
