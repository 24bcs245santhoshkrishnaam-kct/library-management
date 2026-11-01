const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');

// Public / Student endpoints
router.get('/', bookController.searchBooks);
router.get('/filters', bookController.getFilters);
router.get('/departments', bookController.getDepartments);
router.get('/recommendations', bookController.getRecommendations);
router.get('/personalized', authenticateToken, bookController.getPersonalizedBooks);
router.get('/career-guidance', bookController.getCareerGuidance);
router.get('/career-roadmap', bookController.getCareerRoadmap);
router.get('/:id/cover.svg', bookController.getBookCoverSvg);
router.get('/:id', bookController.getBookById);
router.get('/:id/related', bookController.getRelatedBooks);

// Staff book management
router.post('/', authenticateToken, requireLibrarian, bookController.createBook);
router.put('/:id', authenticateToken, requireLibrarian, bookController.updateBook);
router.delete('/:id', authenticateToken, requireLibrarian, bookController.deleteBook);

module.exports = router;
