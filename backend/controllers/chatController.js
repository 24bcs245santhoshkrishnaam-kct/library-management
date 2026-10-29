const aiService = require('../services/aiService');
const searchService = require('../services/searchService');
const loanService = require('../services/loanService');

async function handleChat(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Validation Error', message: 'Message content is required' });
    }

    const trimmedMsg = message.trim();

    // 1. Retrieve verified books from MySQL relevant to user's question
    const verifiedBooks = await searchService.searchBooks({
      query: trimmedMsg,
      availableOnly: false
    });

    // 2. Retrieve verified loans for the authenticated student
    let verifiedLoans = [];
    if (req.user && req.user.id) {
      verifiedLoans = await loanService.getStudentLoans(req.user.id);
    }

    // 3. Process question with AI service (grounded in MySQL data)
    const result = await aiService.processChatMessage({
      message: trimmedMsg,
      user: req.user || null,
      verifiedBooks,
      verifiedLoans
    });

    res.json({
      success: true,
      reply: result.reply,
      source: result.source,
      verifiedBooks: result.verifiedBooks,
      verifiedLoans: result.verifiedLoans,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Chat Controller Error]:', err);
    res.status(500).json({
      error: 'Chat Processing Error',
      message: 'Failed to process chat message. Please try again.'
    });
  }
}

module.exports = {
  handleChat
};
