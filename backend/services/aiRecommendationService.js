const db = require('../config/db');

/**
 * AI-Assisted Recommendation Engine for College Library
 * Uses TF-IDF, Subject Semantic Mapping, and Category Cosine Similarity
 */

// Domain topic graph mapping cross-subject recommendations
const TOPIC_ASSOCIATION_GRAPH = {
  'machine learning': ['Artificial Intelligence', 'Deep Learning', 'Python', 'Statistics', 'Data Science', 'Neural Networks'],
  'artificial intelligence': ['Machine Learning', 'Reinforcement Learning', 'Robotics AI', 'Computer Vision', 'NLP', 'Python'],
  'operating systems': ['Linux', 'Computer Architecture', 'Distributed Systems', 'Systems Programming', 'Computer Networks', 'UNIX'],
  'computer networks': ['Operating Systems', 'TCP/IP', 'Cybersecurity', 'Cloud Computing', 'Network Automation'],
  'database': ['Data Architecture', 'SQL', 'Distributed Systems', 'Cloud Computing', 'Web Development'],
  'web development': ['JavaScript', 'React', 'Node.js', 'Database Management', 'Cloud Native', 'API Design'],
  'circuits': ['Analog Electronics', 'VLSI Design', 'Microprocessors', 'Signal Processing', 'Embedded Systems'],
  'power systems': ['Electrical Machines', 'Power Electronics', 'Renewable Energy', 'High Voltage Engineering'],
  'thermodynamics': ['Fluid Mechanics', 'Heat Transfer', 'Internal Combustion Engines', 'Energy Systems'],
  'robotics': ['Control Systems', 'Computer Vision', 'Mechanics', 'Embedded Systems', 'Artificial Intelligence']
};

/**
 * Tokenize and normalize text into clean terms
 */
function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Calculate Term Frequency - Inverse Document Frequency (TF-IDF) similarity
 */
function computeTFIDFSimilarity(queryTokens, docTokens, corpusTermFreqs, totalDocs) {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;

  const docFreq = {};
  docTokens.forEach(t => {
    docFreq[t] = (docFreq[t] || 0) + 1;
  });

  let score = 0;
  queryTokens.forEach(t => {
    if (docFreq[t]) {
      const tf = docFreq[t] / docTokens.length;
      const df = corpusTermFreqs[t] || 1;
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      score += tf * idf;
    }
  });

  return score;
}

/**
 * Generate AI search recommendations for a student search query
 */
async function getSearchRecommendations(query = '', department = null, limit = 12) {
  const allBooks = await db.query('SELECT * FROM books');
  if (!allBooks || allBooks.length === 0) return { exactMatches: [], recommendations: [], alternatives: [] };

  const qLower = query.toLowerCase().trim();
  const qTokens = tokenize(qLower);

  // Build corpus term frequency
  const corpusTermFreqs = {};
  allBooks.forEach(b => {
    const tokens = new Set(tokenize(`${b.title} ${b.category} ${b.department} ${b.description || ''}`));
    tokens.forEach(t => {
      corpusTermFreqs[t] = (corpusTermFreqs[t] || 0) + 1;
    });
  });

  // Identify related cross-subject tags from association graph
  const relatedTags = [];
  for (const [key, tags] of Object.entries(TOPIC_ASSOCIATION_GRAPH)) {
    if (qLower.includes(key) || key.includes(qLower)) {
      relatedTags.push(...tags);
    }
  }

  // Score each book
  const scoredBooks = allBooks.map(b => {
    const bTokens = tokenize(`${b.title} ${b.category} ${b.department} ${b.description || ''}`);
    const tfidfScore = computeTFIDFSimilarity(qTokens, bTokens, corpusTermFreqs, allBooks.length);

    let matchType = 'related';
    let boost = 0;
    let reason = 'Recommended based on subject relevance to your search query.';

    // Exact or strong title match
    if (b.title.toLowerCase().includes(qLower)) {
      matchType = 'exact';
      boost += 50;
      reason = 'Direct match for your search title.';
    } else if (b.category.toLowerCase().includes(qLower)) {
      matchType = 'category_match';
      boost += 30;
      reason = `Direct match in category "${b.category}".`;
    } else if (relatedTags.some(tag => b.category.toLowerCase().includes(tag.toLowerCase()) || b.title.toLowerCase().includes(tag.toLowerCase()))) {
      matchType = 'ai_recommended';
      boost += 25;
      const matchingTag = relatedTags.find(tag => b.category.toLowerCase().includes(tag.toLowerCase()) || b.title.toLowerCase().includes(tag.toLowerCase()));
      reason = `Recommended because it covers "${matchingTag}", which is closely related to your search for "${query}".`;
    } else if (qTokens.some(t => b.author.toLowerCase().includes(t))) {
      matchType = 'author_match';
      boost += 20;
      reason = `Author match for "${b.author}".`;
    }

    if (department && department !== 'All' && b.department === department) {
      boost += 10;
    }

    if (b.available_copies > 0) {
      boost += 2;
    }

    const totalScore = tfidfScore * 10 + boost;

    return {
      ...b,
      similarity_score: Math.round(totalScore * 10) / 10,
      match_type: matchType,
      recommendation_reason: reason
    };
  });

  // Sort descending by score
  scoredBooks.sort((a, b) => b.similarity_score - a.similarity_score);

  const exactMatches = scoredBooks.filter(b => b.match_type === 'exact' || b.match_type === 'category_match');
  const recommendations = scoredBooks.filter(b => b.similarity_score > 5 && b.match_type !== 'exact').slice(0, limit);
  const alternatives = scoredBooks.filter(b => b.available_copies > 0 && b.similarity_score > 3).slice(0, 6);

  return {
    query,
    totalCatalog: allBooks.length,
    exactMatches: exactMatches.slice(0, limit),
    recommendations,
    alternatives,
    relatedSubjects: Array.from(new Set(relatedTags)).slice(0, 6)
  };
}

/**
 * Get AI recommendations related to a specific book (for Book Details modal)
 */
async function getRelatedBooksForBook(bookId, limit = 6) {
  const allBooks = await db.query('SELECT * FROM books');
  const target = allBooks.find(b => b.id === parseInt(bookId, 10));
  if (!target) return [];

  const targetTokens = tokenize(`${target.title} ${target.category} ${target.department} ${target.description || ''}`);

  const scored = allBooks
    .filter(b => b.id !== target.id)
    .map(b => {
      let score = 0;
      let reason = `Recommended because it shares the "${b.category}" discipline with ${target.title}.`;

      if (b.category === target.category) score += 30;
      if (b.department === target.department) score += 15;
      if (b.author === target.author) {
        score += 25;
        reason = `Also written by ${target.author}.`;
      }

      // Check cross-topic graph
      for (const [key, related] of Object.entries(TOPIC_ASSOCIATION_GRAPH)) {
        if (target.category.toLowerCase().includes(key) && related.some(r => b.category.toLowerCase().includes(r.toLowerCase()))) {
          score += 20;
          reason = `Covers related concepts in ${b.category} complementary to ${target.title}.`;
        }
      }

      return {
        ...b,
        recommendation_reason: reason,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Get personalized student recommendations based on borrowing history & active books
 */
async function getPersonalizedStudentRecommendations(userId, limit = 8) {
  // Fetch student's loan categories
  const userLoans = await db.query(`
    SELECT b.category, b.department, b.title
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.user_id = ?
  `, [userId]);

  const allBooks = await db.query('SELECT * FROM books');
  const borrowedCategories = new Set(userLoans.map(l => l.category));
  const borrowedDepartments = new Set(userLoans.map(l => l.department));

  if (borrowedCategories.size === 0) {
    // If new student with no loans, recommend trending introductory books across CSE and AI
    return allBooks
      .filter(b => b.department === 'CSE' || b.department === 'AI AND MACHINE LEARNING')
      .slice(0, limit)
      .map(b => ({
        ...b,
        recommendation_reason: 'Top essential textbook for engineering students.'
      }));
  }

  const recommendations = allBooks
    .filter(b => b.available_copies > 0)
    .map(b => {
      let score = 0;
      let reason = 'Curated recommendation for your academic curriculum.';

      if (borrowedCategories.has(b.category)) {
        score += 35;
        reason = `Recommended based on your interest in ${b.category}.`;
      } else if (borrowedDepartments.has(b.department)) {
        score += 15;
        reason = `Popular in your ${b.department} department.`;
      }

      return {
        ...b,
        score,
        recommendation_reason: reason
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return recommendations;
}

module.exports = {
  getSearchRecommendations,
  getRelatedBooksForBook,
  getPersonalizedStudentRecommendations
};

