const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require valid admin role
router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Student CSV Import
router.post('/students/import-csv', adminController.importStudentsCSV);

// Library Policies
router.get('/policies', adminController.getPolicies);
router.put('/policies/:key', adminController.updatePolicy);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
