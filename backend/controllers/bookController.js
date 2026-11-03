const searchService = require('../services/searchService');
const aiRecommendationService = require('../services/aiRecommendationService');
const coverService = require('../services/coverService');
const db = require('../config/db');

async function searchBooks(req, res) {
  try {
    const { q, query, category, department, author, available, collection, language } = req.query;
    const searchQuery = q || query || '';
    const availableOnly = available === 'true' || available === true;

    const books = await searchService.searchBooks({
      query: searchQuery,
      category,
      department,
      author,
      collection,
      language,
      availableOnly
    });

    res.json({
      success: true,
      count: books.length,
      query: searchQuery,
      filters: { 
        category: category || 'All', 
        department: department || 'All',
        collection: collection || 'All',
        language: language || 'All',
        author: author || 'All', 
        availableOnly 
      },
      books
    });
  } catch (err) {
    console.error('[Book Search Controller Error]:', err);
    res.status(500).json({ error: 'Search Error', message: 'Failed to search catalogue' });
  }
}

async function getBookById(req, res) {
  try {
    const { id } = req.params;
    const book = await searchService.getBookById(id);

    if (!book) {
      return res.status(404).json({ error: 'Not Found', message: `Book #${id} not found in library catalogue` });
    }

    res.json({ success: true, book });
  } catch (err) {
    console.error('[Get Book Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getFilters(req, res) {
  try {
    const categories = await searchService.getCategories();
    const authors = await searchService.getAuthors();
    const departments = await searchService.getDepartments();
    const collections = await searchService.getCollections();
    res.json({
      success: true,
      departments: ['All', ...departments],
      categories: ['All', ...categories],
      authors: ['All', ...authors],
      collections: ['All', ...collections]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await searchService.getDepartments();
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getRecommendations(req, res) {
  try {
    const { q, query, department, limit } = req.query;
    const searchQuery = q || query || '';
    const result = await aiRecommendationService.getSearchRecommendations(
      searchQuery,
      department,
      parseInt(limit, 10) || 12
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Recommendations Error]:', err);
    res.status(500).json({ error: 'Recommendation Error', message: err.message });
  }
}

async function getRelatedBooks(req, res) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 6;
    const related = await aiRecommendationService.getRelatedBooksForBook(id, limit);
    res.json({ success: true, bookId: parseInt(id, 10), related });
  } catch (err) {
    console.error('[Related Books Error]:', err);
    res.status(500).json({ error: 'Related Books Error', message: err.message });
  }
}

async function getPersonalizedBooks(req, res) {
  try {
    const userId = req.user ? req.user.id : (req.query.user_id || 1);
    const limit = parseInt(req.query.limit, 10) || 12;
    const result = await aiRecommendationService.getPersonalizedStudentRecommendations(userId, limit);
    const recommendations = Array.isArray(result) ? result : (result.recommendations || []);
    const heading = result.heading || 'Recommended for You';
    const lastBorrowedTitle = result.last_borrowed_title || null;

    res.json({ 
      success: true, 
      userId, 
      heading,
      last_borrowed_title: lastBorrowedTitle,
      recommendations 
    });
  } catch (err) {
    console.error('[Personalized Recommendations Error]:', err);
    res.status(500).json({ error: 'Personalized Error', message: err.message });
  }
}

async function getCareerGuidance(req, res) {
  try {
    const { bookId, q, query } = req.query;
    const identifier = bookId || q || query || '';
    const guidance = await aiRecommendationService.getCareerGuidanceForBook(identifier);
    res.json({ success: true, ...guidance });
  } catch (err) {
    console.error('[Career Guidance Error]:', err);
    res.status(500).json({ error: 'Career Guidance Error', message: err.message });
  }
}

async function getCareerRoadmap(req, res) {
  try {
    const { goal } = req.query;
    const roadmap = await aiRecommendationService.getCareerGoalRoadmap(goal || 'aiml_engineer');
    res.json({ success: true, ...roadmap });
  } catch (err) {
    console.error('[Career Roadmap Error]:', err);
    res.status(500).json({ error: 'Career Roadmap Error', message: err.message });
  }
}

async function createBook(req, res) {
  try {
    const { 
      title, 
      author, 
      department, 
      category, 
      isbn, 
      description, 
      cover_image, 
      total_copies, 
      shelf_location, 
      published_year,
      publisher 
    } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title, Author, and Category are required.' });
    }

    const copies = parseInt(total_copies, 10) || 1;

    const [result] = await db.query(`
      INSERT INTO books (title, author, department, category, isbn, description, cover_image, total_copies, available_copies, shelf_location, published_year, publisher)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(), 
      author.trim(), 
      department || 'CSE', 
      category.trim(), 
      isbn || null, 
      description || '', 
      cover_image || null, 
      copies, 
      copies, 
      shelf_location || 'A1', 
      published_year || 2024,
      publisher || 'Technical Publications'
    ]);

    res.status(201).json({
      success: true,
      message: `Book "${title}" added to catalogue successfully.`,
      book_id: result.insertId
    });
  } catch (err) {
    console.error('[Create Book Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function updateBook(req, res) {
  try {
    const bookId = parseInt(req.params.id, 10);
    const { 
      title, 
      author, 
      department, 
      category, 
      isbn, 
      description, 
      cover_image, 
      total_copies, 
      available_copies, 
      shelf_location, 
      published_year,
      publisher,
      is_damaged,
      is_lost
    } = req.body;

    await db.query(`
      UPDATE books 
      SET 
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        department = COALESCE(?, department),
        category = COALESCE(?, category),
        isbn = COALESCE(?, isbn),
        description = COALESCE(?, description),
        cover_image = COALESCE(?, cover_image),
        total_copies = COALESCE(?, total_copies),
        available_copies = COALESCE(?, available_copies),
        shelf_location = COALESCE(?, shelf_location),
        published_year = COALESCE(?, published_year),
        publisher = COALESCE(?, publisher),
        is_damaged = COALESCE(?, is_damaged),
        is_lost = COALESCE(?, is_lost)
      WHERE id = ?
    `, [
      title, author, department, category, isbn, description, cover_image, 
      total_copies, available_copies, shelf_location, published_year, publisher, 
      is_damaged, is_lost, bookId
    ]);

    res.json({ success: true, message: `Book #${bookId} updated successfully.` });
  } catch (err) {
    console.error('[Update Book Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getBookCoverSvg(req, res) {
  try {
    const bookId = parseInt(req.params.id, 10);
    const rows = await db.query('SELECT id, title, author, category, department FROM books WHERE id = ?', [bookId]);
    const book = rows && rows.length > 0 ? rows[0] : { id: bookId, title: req.query.title || `Library Book #${bookId}` };
    const svg = coverService.generateBookCoverSvg(book);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(svg);
  } catch (err) {
    console.error('[Get Book Cover Error]:', err);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#1e293b"/></svg>');
  }
}

async function deleteBook(req, res) {
  try {
    const bookId = parseInt(req.params.id, 10);
    await db.query('DELETE FROM books WHERE id = ?', [bookId]);
    res.json({ success: true, message: `Book #${bookId} removed from library catalogue.` });
  } catch (err) {
    console.error('[Delete Book Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

module.exports = {
  searchBooks,
  getBookById,
  getBookCoverSvg,
  getFilters,
  getDepartments,
  getRecommendations,
  getRelatedBooks,
  getPersonalizedBooks,
  getCareerGuidance,
  getCareerRoadmap,
  createBook,
  updateBook,
  deleteBook
};
