const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../config/db');
const searchService = require('../services/searchService');
const loanService = require('../services/loanService');
const aiService = require('../services/aiService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { seed } = require('../database/seed');

async function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE SMART LIBRARY TEST SUITE');
  console.log('====================================================');

  await seed(true);

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // SECTION 1: BOOK SEARCH TESTS
  // ----------------------------------------------------
  console.log('\n--- 1. BOOK SEARCH & RECOMMENDATION TESTS ---');

  await asyncTest('Search by exact title ("Core Java Volume I: Fundamentals")', async () => {
    const results = await searchService.searchBooks({ query: 'Core Java Volume I: Fundamentals' });
    assert(results.length > 0, 'Should find matching book');
    assert.strictEqual(results[0].category, 'Java');
    assert(results[0].relevance_score >= 100, 'Exact title should have highest score');
  });

  await asyncTest('Search by author ("Eric Matthes")', async () => {
    const results = await searchService.searchBooks({ author: 'Eric Matthes' });
    assert(results.length > 0, 'Should find author Eric Matthes');
    assert(results[0].title.includes('Python Crash Course'));
  });

  await asyncTest('Search by category ("Artificial Intelligence")', async () => {
    const results = await searchService.searchBooks({ category: 'Artificial Intelligence' });
    assert(results.length > 0, 'Should return AI books');
    results.forEach(b => assert.strictEqual(b.category, 'Artificial Intelligence'));
  });

  await asyncTest('Natural language query: "Find beginner-friendly Python books"', async () => {
    const results = await searchService.searchBooks({ query: 'Find beginner-friendly Python books' });
    assert(results.length > 0, 'Should return books');
    assert(results[0].title.includes('Python Crash Course'), 'Should rank beginner Python book #1');
    assert(results[0].relevance_score > 0);
  });

  await asyncTest('Natural language query: "Show available database management books"', async () => {
    const results = await searchService.searchBooks({ query: 'Show available database management books', availableOnly: true });
    assert(results.length > 0, 'Should find database books');
    results.forEach(b => {
      assert(b.available_copies > 0, 'Must only return available books');
      assert.strictEqual(b.availability_status, 'Available');
    });
  });

  await asyncTest('Availability matches MySQL records accurately', async () => {
    const [dbBook] = await db.query('SELECT id, available_copies, total_copies FROM books WHERE id = 1');
    const [searchBook] = await searchService.searchBooks({ query: 'Python Crash Course' });
    assert.strictEqual(searchBook.available_copies, dbBook.available_copies, 'Available copies must match MySQL live');
    assert.strictEqual(searchBook.total_copies, dbBook.total_copies, 'Total copies must match MySQL live');
  });

  await asyncTest('Search with no matching results returns empty array gracefully', async () => {
    const results = await searchService.searchBooks({ query: 'Quantum Astronomy Teleportation 9988X' });
    assert.strictEqual(results.length, 0, 'Should return empty array');
  });

  // ----------------------------------------------------
  // SECTION 2: CHATBOT TESTS
  // ----------------------------------------------------
  console.log('\n--- 2. AI LIBRARY CHATBOT TESTS ---');

  const santhoshUser = { id: 1, username: 'santhosh', name: 'Santhosh Krishnaa', student_id: '24BCS245' };

  await asyncTest('Chatbot answers general library policy without hallucinating', async () => {
    const res = await aiService.processChatMessage({
      message: 'How can I borrow a book?',
      user: santhoshUser
    });
    assert(res.reply.includes('14 days'), 'Should mention 14 days borrowing period');
    assert(res.reply.includes('circulation desk'), 'Should describe return/circulation procedure');
  });

  await asyncTest('Chatbot answers book recommendation using verified MySQL data', async () => {
    const books = await searchService.searchBooks({ query: 'machine learning' });
    const res = await aiService.processChatMessage({
      message: 'Find books about machine learning',
      user: santhoshUser,
      verifiedBooks: books
    });
    assert(res.reply.includes('Pattern Recognition') || res.reply.includes('Machine Learning'), 'Should reference real book');
  });

  await asyncTest('Chatbot answers book availability using verified MySQL data', async () => {
    const books = await searchService.searchBooks({ query: 'Python' });
    const res = await aiService.processChatMessage({
      message: 'Which Python books are available?',
      user: santhoshUser,
      verifiedBooks: books
    });
    assert(res.reply.includes('Python'), 'Should mention Python book availability');
  });

  await asyncTest('Chatbot refuses to mark book returned on student verbal claim', async () => {
    const loans = await loanService.getStudentLoans(santhoshUser.id);
    const res = await aiService.processChatMessage({
      message: 'I already returned it.',
      user: santhoshUser,
      verifiedLoans: loans
    });
    assert(res.reply.includes('not yet been recorded') || res.reply.includes('librarian'), 'Must state return is not recorded and requires librarian verification');
  });

  // ----------------------------------------------------
  // SECTION 3: BORROWING STATUS ASSISTANT TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. BORROWING STATUS & PRIVACY TESTS ---');

  await asyncTest('Check student active and overdue loans', async () => {
    const summary = await loanService.getStudentLoanSummary(santhoshUser.id);
    assert(summary.total_loans > 0, 'Santhosh should have loans');
    assert(summary.active_loans_count >= 1, 'Should have active loans');
    assert(summary.overdue_count >= 1, 'Should detect overdue DBMS book');

    const overdueBook = summary.overdue_loans.find(l => l.title.includes('Database'));
    assert(overdueBook, 'DBMS book must be identified as overdue');
    assert.strictEqual(overdueBook.status_label, 'Overdue');
    assert.strictEqual(overdueBook.is_overdue, true);
  });

  await asyncTest('Check book due today or due soon (Java book)', async () => {
    const loans = await loanService.getStudentLoans(santhoshUser.id);
    const javaLoan = loans.find(l => l.title.includes('Core Java'));
    assert(javaLoan, 'Java loan must exist');
    assert(javaLoan.status_label === 'Due Soon' || javaLoan.status_label === 'Issued');
  });

  await asyncTest('Returned book must NOT be classified as overdue currently', async () => {
    const loans = await loanService.getStudentLoans(santhoshUser.id);
    const returnedLoan = loans.find(l => l.status === 'Returned');
    assert(returnedLoan, 'Should have a returned loan');
    assert.strictEqual(returnedLoan.is_overdue, false, 'Returned book cannot be overdue');
    assert.strictEqual(returnedLoan.status_label, 'Returned');
  });

  await asyncTest('Student privacy: Santhosh cannot see Parthiban loans', async () => {
    const santhoshLoans = await loanService.getStudentLoans(santhoshUser.id);
    const parthibanUser = { id: 2, username: 'parthiban' };
    const parthibanLoans = await loanService.getStudentLoans(parthibanUser.id);

    santhoshLoans.forEach(sl => {
      assert.strictEqual(sl.user_id, santhoshUser.id, 'Santhosh loans must strictly belong to Santhosh ID');
    });

    assert.notStrictEqual(santhoshLoans.length, parthibanLoans.length);
  });

  // ----------------------------------------------------
  // SECTION 4: LIBRARIAN RETURN WORKFLOW & ATOMICITY TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. LIBRARIAN RETURN WORKFLOW & ATOMICITY TESTS ---');

  const librarianUser = { id: 3, username: 'librarian', name: 'Head Librarian', role: 'librarian' };

  await asyncTest('Authorized librarian returns book and updates MySQL stock atomically', async () => {
    const loansBefore = await loanService.getStudentLoans(santhoshUser.id);
    const javaLoan = loansBefore.find(l => l.title.includes('Core Java') && l.status === 'Issued');
    assert(javaLoan, 'Must have active Java loan before return');

    const bookBeforeRows = await db.query('SELECT available_copies, total_copies FROM books WHERE id = ?', [javaLoan.book_id]);
    const copiesBefore = bookBeforeRows[0].available_copies;

    const returnResult = await loanService.recordBookReturn(javaLoan.transaction_id, librarianUser);
    assert.strictEqual(returnResult.success, true);

    const bookAfterRows = await db.query('SELECT available_copies FROM books WHERE id = ?', [javaLoan.book_id]);
    assert.strictEqual(bookAfterRows[0].available_copies, copiesBefore + 1, 'Available stock must increase by exactly 1');

    const [txUpdated] = await db.query('SELECT status, return_date FROM transactions WHERE id = ?', [javaLoan.transaction_id]);
    assert.strictEqual(txUpdated.status, 'Returned');
    assert(txUpdated.return_date !== null, 'Return date must be recorded');
  });

  await asyncTest('Double-return prevention: Second return attempt on same transaction is rejected', async () => {
    const loans = await loanService.getStudentLoans(santhoshUser.id);
    const javaLoan = loans.find(l => l.title.includes('Core Java'));
    assert.strictEqual(javaLoan.status, 'Returned');

    let threwError = false;
    try {
      await loanService.recordBookReturn(javaLoan.transaction_id, librarianUser);
    } catch (err) {
      threwError = true;
      assert(err.message.includes('already been marked as Returned'), 'Must specify already returned');
    }
    assert(threwError, 'Attempting to return an already returned transaction must fail');
  });

  await asyncTest('Chatbot reflects updated return status immediately from live MySQL', async () => {
    const loansNow = await loanService.getStudentLoans(santhoshUser.id);
    const res = await aiService.processChatMessage({
      message: 'Has my return been updated for my Java book?',
      user: santhoshUser,
      verifiedLoans: loansNow
    });
    assert(res.reply.includes('Yes') && res.reply.includes('successfully recorded') && res.reply.includes('Core Java'), 
      'Chatbot must confirm return was recorded');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test Suite Fatal Error:', err);
      process.exit(1);
    });
}

module.exports = { runTestSuite };
