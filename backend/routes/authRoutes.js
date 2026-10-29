const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.get('/students', authenticateToken, requireLibrarian, authController.getStudents);

module.exports = router;
