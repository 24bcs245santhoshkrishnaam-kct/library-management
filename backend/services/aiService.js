const https = require('https');

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';

/**
 * Standard Library Policies (Grounded Rules)
 */
const LIBRARY_POLICY = {
  borrowingPeriodDays: 14,
  maxBooksPerStudent: 3,
  renewalPolicy: "Books can be renewed once before the due date if no other student has placed a hold.",
  finePerDay: "₹2 per day for overdue items",
  returnProcedure: "Return physical books directly to the library circulation desk. The librarian inspects the book condition and records the return in the system.",
  hours: "Monday - Saturday: 8:30 AM to 6:00 PM. Closed on Sundays and institutional holidays."
};

/**
 * Calls Google Gemini REST API if configured
 */
async function callGemini(systemPrompt, userPrompt) {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY is not configured');
  }

  const payload = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 600
    }
  });

  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 6000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return resolve(text.trim());
            }
          }
          reject(new Error(`AI API returned status ${res.statusCode}: ${data}`));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Generates grounded response using deterministic application logic
 * Ensures 100% reliability, zero downtime, and strict grounding in live MySQL data
 */
function generateDeterministicResponse({ query, user, verifiedBooks = [], verifiedLoans = [], intent }) {
  const q = query.toLowerCase().trim();

  // 1. Return Status Claim: Student claims they returned a book
  if (q.includes('already returned') || q.includes('i returned it') || q.includes('i have returned it') || q.includes('i gave it back')) {
    const issuedLoans = verifiedLoans.filter(l => l.status === 'Issued');
    if (issuedLoans.length > 0) {
      const bookTitles = issuedLoans.map(l => `"${l.title}"`).join(', ');
      return `Your return has not yet been recorded in the library database for ${bookTitles}. Physical book returns require in-person verification at the circulation desk. Please bring the book to the librarian so they can record the return and update your account.`;
    }
    return `Our records do not show any pending book returns for your account. If you believe there is an error, please visit the circulation desk with your student ID.`;
  }

  // 2. Return Status Verification ("Has my return been updated?", "Have I returned my Java book?")
  if (q.includes('return') && (q.includes('update') || q.includes('status') || q.includes('have i') || q.includes('has my') || q.includes('did i'))) {
    // Check if user specified a subject/keyword
    const target = verifiedLoans.find(l => {
      const title = l.title.toLowerCase();
      return (q.includes('java') && title.includes('java')) ||
             (q.includes('python') && title.includes('python')) ||
             (q.includes('dbms') && (title.includes('database') || title.includes('dbms'))) ||
             (q.includes('ml') && title.includes('machine learning')) ||
             (q.includes('web') && title.includes('web'));
    });

    if (target) {
      if (target.status === 'Returned') {
        return `Yes, your return for "${target.title}" has been successfully recorded. Return date: ${target.return_date || 'recently recorded'}. You have no outstanding obligations for this book.`;
      } else {
        return `Your "${target.title}" is still recorded as Issued in the library system. The due date is ${target.due_date}. If you have already handed it in, please contact the librarian to verify the physical return.`;
      }
    }

    if (verifiedLoans.length > 0) {
      const active = verifiedLoans.filter(l => l.status === 'Issued');
      const returned = verifiedLoans.filter(l => l.status === 'Returned');
      let msg = `Here is your current return status:\n`;
      if (returned.length > 0) {
        msg += `• Returned: ${returned.map(l => `"${l.title}" on ${l.return_date}`).join('; ')}\n`;
      }
      if (active.length > 0) {
        msg += `• Still Recorded as Issued: ${active.map(l => `"${l.title}" (Due: ${l.due_date})`).join('; ')}\n`;
      }
      return msg;
    }

    return `You do not have any active or past borrowing records in the system.`;
  }

  // 3. Overdue inquiry ("Am I overdue?", "Do I have overdue books?")
  if (q.includes('overdue')) {
    const overdueLoans = verifiedLoans.filter(l => l.is_overdue);
    if (overdueLoans.length > 0) {
      const list = overdueLoans.map(l => `• "${l.title}" (Due Date: ${l.due_date}, ${l.days_overdue} day(s) overdue)`).join('\n');
      return `Yes, you currently have ${overdueLoans.length} overdue book(s):\n${list}\n\nPlease return them promptly to the library to prevent additional fines (${LIBRARY_POLICY.finePerDay}).`;
    }
    return `Good news! You do not have any overdue books recorded. All your borrowed items are within their permitted borrowing period.`;
  }

  // 4. Issued books inquiry ("Show my currently issued books", "When is my book due?", "active loans")
  if (q.includes('issued') || q.includes('active loan') || q.includes('my books') || q.includes('due date') || q.includes('when is my book due')) {
    const active = verifiedLoans.filter(l => l.status === 'Issued');
    if (active.length === 0) {
      return `You currently have no books issued to your account. You can borrow up to ${LIBRARY_POLICY.maxBooksPerStudent} books at a time from our catalogue.`;
    }
    const list = active.map(l => {
      const urgency = l.is_overdue ? `[OVERDUE by ${l.days_overdue}d]` : (l.status_label === 'Due Soon' ? '[DUE SOON]' : '[Active]');
      return `• "${l.title}" - Due: ${l.due_date} ${urgency}`;
    }).join('\n');
    return `You have ${active.length} book(s) currently issued:\n${list}`;
  }

  // 5. Borrowing history inquiry ("Show my recent borrowing history")
  if (q.includes('history') || q.includes('past loans') || q.includes('all loans')) {
    if (verifiedLoans.length === 0) {
      return `You do not have any borrowing history recorded in the library yet.`;
    }
    const list = verifiedLoans.map(l => {
      const statusText = l.status === 'Returned' ? `Returned on ${l.return_date}` : `Issued (Due: ${l.due_date})`;
      return `• "${l.title}" - Status: ${statusText}`;
    }).join('\n');
    return `Here is your borrowing history:\n${list}`;
  }

  // 6. Library Procedures & Rules ("How can I borrow a book?", "What is the return procedure?", "rules", "policy")
  if (q.includes('how can i borrow') || q.includes('borrowing procedure') || q.includes('how to borrow')) {
    return `To borrow a book:\n1. Search for an available book in our catalogue.\n2. Note the shelf location (e.g., A1-04) or bring the physical book to the circulation desk.\n3. Present your verified Student ID to the librarian.\n4. Standard loan period is ${LIBRARY_POLICY.borrowingPeriodDays} days. Students may borrow up to ${LIBRARY_POLICY.maxBooksPerStudent} books at a time.`;
  }

  if (q.includes('return procedure') || q.includes('how to return')) {
    return `Return procedure:\n${LIBRARY_POLICY.returnProcedure}\nLate returns incur ${LIBRARY_POLICY.finePerDay}.`;
  }

  // 7. Book Search / Recommendations ("Find books about...", "Which Python books are available?")
  if (verifiedBooks.length > 0) {
    const availableOnly = q.includes('available');
    const filtered = availableOnly ? verifiedBooks.filter(b => b.available_copies > 0) : verifiedBooks;

    if (filtered.length === 0 && availableOnly) {
      return `We found relevant titles in the catalogue, but none are currently on shelf. All copies are currently issued to other students. You can ask the librarian to place a hold.`;
    }

    const bookList = filtered.slice(0, 3).map(b => {
      const stock = b.available_copies > 0 ? `${b.available_copies} of ${b.total_copies} copies available` : `Currently Out of Stock (0/${b.total_copies})`;
      return `• "${b.title}" by ${b.author} [Category: ${b.category}] — ${stock}. Location: ${b.shelf_location || 'Main Stacks'}`;
    }).join('\n');

    return `Here are the relevant books matching your request from our library database:\n${bookList}\n\nYou can view full details or check availability directly in the catalogue.`;
  }

  // Default helpful message
  return `I can help you search our book collection, verify book availability, check your issued loans, monitor due dates, and understand library policies. What would you like to know?`;
}

/**
 * Main chat handling function
 */
async function processChatMessage({ message, user, verifiedBooks = [], verifiedLoans = [] }) {
  // If an AI API key is configured, generate with Gemini
  if (AI_API_KEY && AI_API_KEY.trim().length > 0) {
    try {
      const systemPrompt = `
You are the Smart Library Assistant for an academic library.
Current Date: 2026-10-28.
Authenticated Student: ${user ? `${user.name} (Student ID: ${user.student_id || user.username})` : 'Guest / Unauthenticated'}.

CRITICAL GROUNDING RULES:
1. Answer ONLY using the verified database records and library policy provided below.
2. DO NOT fabricate books, transaction IDs, return dates, or availability.
3. If information is not in the verified data, state clearly: "I could not verify this information in the library records."
4. If a student claims they have returned a book, check the verified loans list. If it is still recorded as 'Issued', inform them: "Your return has not yet been recorded. Please contact the librarian to verify the physical return." You must NEVER mark or claim a book is returned based solely on a user's statement.
5. Availability must always come from current MySQL records, not AI invention.
6. Library Policy:
   - Borrowing duration: ${LIBRARY_POLICY.borrowingPeriodDays} days
   - Maximum allowed books: ${LIBRARY_POLICY.maxBooksPerStudent}
   - Fines: ${LIBRARY_POLICY.finePerDay}
   - Return procedure: ${LIBRARY_POLICY.returnProcedure}

VERIFIED DATABASE DATA:
Matching Books in MySQL:
${JSON.stringify(verifiedBooks, null, 2)}

Student's Borrowing Loans in MySQL:
${JSON.stringify(verifiedLoans, null, 2)}
`;
      const aiResponse = await callGemini(systemPrompt, message);
      return {
        reply: aiResponse,
        source: 'ai_gemini',
        verifiedBooks: verifiedBooks.slice(0, 5),
        verifiedLoans: verifiedLoans.slice(0, 5)
      };
    } catch (err) {
      console.warn(`[AI Service] AI provider unavailable (${err.message}). Using deterministic grounded fallback.`);
    }
  }

  // Fallback to grounded deterministic response
  const fallbackReply = generateDeterministicResponse({
    query: message,
    user,
    verifiedBooks,
    verifiedLoans
  });

  return {
    reply: fallbackReply,
    source: 'grounded_deterministic',
    verifiedBooks: verifiedBooks.slice(0, 5),
    verifiedLoans: verifiedLoans.slice(0, 5)
  };
}

module.exports = {
  processChatMessage,
  LIBRARY_POLICY
};
