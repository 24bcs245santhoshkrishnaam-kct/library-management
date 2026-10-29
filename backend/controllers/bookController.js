const searchService = require('../services/searchService');
const aiRecommendationService = require('../services/aiRecommendationService');
const db = require('../config/db');

async function searchBooks(req, res) {
  try {
    const { q, query, category, department, author, available } = req.query;
    const searchQuery = q || query || '';
    const availableOnly = available === 'true' || available === true;

    const books = await searchService.searchBooks({
      query: searchQuery,
      category,
      department,
      author,
      availableOnly
    });

    res.json({
      success: true,
      count: books.length,
      query: searchQuery,
      filters: { 
        category: category || 'All', 
        department: department || 'All',
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
    res.json({
      success: true,
      departments: ['All', ...departments],
      categories: ['All', ...categories],
      authors: ['All', ...authors]
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
    const limit = parseInt(req.query.limit, 10) || 8;
    const recommendations = await aiRecommendationService.getPersonalizedStudentRecommendations(userId, limit);
    res.json({ success: true, userId, recommendations });
  } catch (err) {
    console.error('[Personalized Recommendations Error]:', err);
    res.status(500).json({ error: 'Personalized Error', message: err.message });
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
  getFilters,
  getDepartments,
  getRecommendations,
  getRelatedBooks,
  getPersonalizedBooks,
  createBook,
  updateBook,
  deleteBook
};
