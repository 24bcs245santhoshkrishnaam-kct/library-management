const db = require('../config/db');

/**
 * Common stop words to strip out from search intent
 */
const STOP_WORDS = new Set([
  'find', 'show', 'me', 'books', 'book', 'about', 'for', 'the', 'a', 'an', 
  'written', 'which', 'are', 'is', 'available', 'learning', 'learn', 'please', 
  'can', 'you', 'give', 'get', 'recommend', 'some', 'any', 'by', 'of', 'in'
]);

/**
 * Category mappings and synonyms
 */
const CATEGORY_SYNONYMS = {
  python: ['python', 'py'],
  java: ['java'],
  'artificial intelligence': ['ai', 'artificial intelligence', 'intelligent', 'agents'],
  'machine learning': ['ml', 'machine learning', 'pattern recognition', 'deep learning'],
  'database management': ['database', 'databases', 'dbms', 'sql', 'relational'],
  'web development': ['web', 'web development', 'frontend', 'backend', 'full stack', 'fullstack', 'react', 'node', 'javascript'],
  'cloud computing': ['cloud', 'cloud computing', 'virtualization', 'aws', 'azure'],
  'operating systems': ['operating system', 'operating systems', 'os', 'processes', 'memory']
};

/**
 * Analyzes natural language query
 */
function analyzeQuery(rawQuery) {
  const normalized = (rawQuery || '').toLowerCase().trim();
  
  // Extract availability intent
  const requiresAvailability = normalized.includes('available') || 
                                normalized.includes('in stock') || 
                                normalized.includes('can i borrow');

  // Extract skill level
  let skillLevel = null;
  if (normalized.includes('beginner') || normalized.includes('beginner-friendly') || normalized.includes('fundamentals') || normalized.includes('intro') || normalized.includes('basics')) {
    skillLevel = 'beginner';
  } else if (normalized.includes('advanced') || normalized.includes('expert') || normalized.includes('in-depth') || normalized.includes('effective')) {
    skillLevel = 'advanced';
  }

  // Detect matching category from query
  let detectedCategory = null;
  for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some(s => normalized.includes(s))) {
      detectedCategory = catName;
      break;
    }
  }

  // Tokenize and remove stop words
  const rawTokens = normalized
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  const keywords = rawTokens.filter(t => !STOP_WORDS.has(t));

  return {
    rawQuery,
    normalized,
    keywords,
    skillLevel,
    detectedCategory,
    requiresAvailability
  };
}

/**
 * Search books in MySQL with intelligent relevance ranking
 */
async function searchBooks({ query, category, department, author, availableOnly } = {}) {
  const analysis = analyzeQuery(query);
  
  // Fetch all books from MySQL to compute live scoring and availability
  let sql = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (department && department !== 'All') {
    sql += ' AND department = ?';
    params.push(department);
  }

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (author) {
    sql += ' AND author LIKE ?';
    params.push(`%${author}%`);
  }

  if (availableOnly === true || availableOnly === 'true' || analysis.requiresAvailability) {
    sql += ' AND available_copies > 0';
  }

  const books = await db.query(sql, params);

  // If no query string, return all matching books
  if (!query || query.trim() === '') {
    return books.map(book => ({
      ...book,
      availability_status: book.available_copies > 0 ? 'Available' : 'Out of Stock',
      relevance_score: 1.0
    }));
  }

  // Calculate relevance score for each book
  const scoredBooks = books.map(book => {
    let score = 0;
    const titleLower = book.title.toLowerCase();
    const authorLower = book.author.toLowerCase();
    const catLower = book.category.toLowerCase();
    const descLower = (book.description || '').toLowerCase();

    // Exact title match
    if (titleLower.includes(analysis.normalized)) {
      score += 100;
    }

    // Category match
    if (analysis.detectedCategory && catLower.includes(analysis.detectedCategory)) {
      score += 60;
    }

    // Skill level match
    if (analysis.skillLevel === 'beginner') {
      if (titleLower.includes('beginner') || titleLower.includes('crash course') || titleLower.includes('fundamentals') || titleLower.includes('learning')) {
        score += 40;
      }
      if (descLower.includes('beginner') || descLower.includes('fundamentals')) {
        score += 25;
      }
    } else if (analysis.skillLevel === 'advanced') {
      if (titleLower.includes('effective') || titleLower.includes('advanced') || titleLower.includes('powerful')) {
        score += 40;
      }
      if (descLower.includes('in-depth') || descLower.includes('advanced')) {
        score += 25;
      }
    }

    // Keyword matching
    analysis.keywords.forEach(kw => {
      if (titleLower.includes(kw)) score += 30;
      if (catLower.includes(kw)) score += 25;
      if (authorLower.includes(kw)) score += 20;
      if (descLower.includes(kw)) score += 10;
    });

    // Availability bonus only if the book already matched query intent
    if (score > 0 && book.available_copies > 0) {
      score += 5;
    }

    return {
      ...book,
      availability_status: book.available_copies > 0 ? 'Available' : 'Out of Stock',
      relevance_score: score
    };
  });

  // Filter out completely irrelevant books if query has keywords
  const filtered = analysis.keywords.length > 0 || analysis.detectedCategory
    ? scoredBooks.filter(b => b.relevance_score > 0)
    : scoredBooks;

  // Sort by score descending, then by available copies descending
  filtered.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return b.available_copies - a.available_copies;
  });

  return filtered;
}

/**
 * Get distinct categories for filters
 */
async function getCategories() {
  const rows = await db.query('SELECT DISTINCT category FROM books ORDER BY category ASC');
  return rows.map(r => r.category);
}

/**
 * Get distinct authors for filters
 */
async function getAuthors() {
  const rows = await db.query('SELECT DISTINCT author FROM books ORDER BY author ASC');
  return rows.map(r => r.author);
}

/**
 * Get single book details
 */
async function getBookById(id) {
  const rows = await db.query('SELECT * FROM books WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return null;
  const book = rows[0];
  return {
    ...book,
    availability_status: book.available_copies > 0 ? 'Available' : 'Out of Stock'
  };
}

async function getDepartments() {
  const rows = await db.query('SELECT DISTINCT department FROM books ORDER BY department ASC');
  return rows.map(r => r.department);
}

module.exports = {
  analyzeQuery,
  searchBooks,
  getCategories,
  getAuthors,
  getDepartments,
  getBookById
};
