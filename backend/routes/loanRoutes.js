const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');

// Configuration mode endpoints
router.get('/borrowing-mode', authenticateToken, loanController.getBorrowingMode);
router.post('/borrowing-mode', authenticateToken, requireLibrarian, loanController.updateBorrowingMode);

// Student borrowing status endpoints (Strictly protected - student sees only their own data)
router.get('/my', authenticateToken, loanController.getMyLoans);
router.get('/my/status', authenticateToken, loanController.getMyStatus);
router.get('/my/notifications', authenticateToken, loanController.getStudentNotifications);
router.put('/my/notifications/read-all', authenticateToken, loanController.markAllNotificationsAsRead);
router.put('/my/notifications/:id/read', authenticateToken, loanController.markNotificationAsRead);
router.post('/borrow', authenticateToken, loanController.borrowOnline);
router.post('/:id/renew', authenticateToken, loanController.renewLoan);
router.post('/:id/return', authenticateToken, loanController.returnLoan);

// Librarian management endpoints (Requires librarian authorization)
router.get('/', authenticateToken, requireLibrarian, loanController.getAllLoans);
router.put('/:id', authenticateToken, requireLibrarian, loanController.updateLoan);
router.post('/issue', authenticateToken, requireLibrarian, loanController.issueLoan);

module.exports = router;
