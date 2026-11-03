const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');

// All SMS routes require Librarian or Admin authorization
router.use(authenticateToken, requireLibrarian);

router.get('/preview/:id', smsController.previewOverdueSMS);
router.get('/preview/:transactionId', smsController.previewOverdueSMS);

router.post('/send/:id', smsController.sendOverdueSMS);
router.post('/send', smsController.sendOverdueSMS);

router.post('/send-bulk', smsController.sendBulkOverdueSMS);
router.post('/bulk', smsController.sendBulkOverdueSMS);

router.get('/logs', smsController.getSMSLogs);
router.post(['/run-auto-check', '/run-overdue-check', '/check-overdue'], smsController.runAutoOverdueCheck);
router.get('/scheduler-status', smsController.getSchedulerStatus);

module.exports = router;
