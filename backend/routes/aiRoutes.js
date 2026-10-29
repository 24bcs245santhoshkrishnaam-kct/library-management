const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bookController = require('../controllers/bookController');
const chatController = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/auth');

// Rate limiting for AI endpoints: max 40 requests per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: {
    error: 'Too Many Requests',
    message: 'Too many AI requests. Please slow down and try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// AI Search endpoint
router.get('/books/search', bookController.searchBooks);

// AI Chatbot endpoint with rate limiting and optional authenticated user context
router.post('/chat', aiLimiter, optionalAuth, chatController.handleChat);

module.exports = router;
