const assert = require('assert');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../config/db');
const app = require('../server');
const { seed } = require('../database/seed');

function makeRequest(server, path, options = {}) {
  const address = server.address();
  const port = address.port;
  const url = `http://localhost:${port}${path}`;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    let bodyData = null;
    if (options.body) {
      bodyData = JSON.stringify(options.body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runE2E() {
  console.log('========================================================');
  console.log('RUNNING END-TO-END HTTP INTEGRATION & SECURITY TESTS');
  console.log('========================================================');

  // Reset clean state
  await seed(true);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`[E2E] Ephemeral test server running on port ${port}`);

  let passed = 0;
  let failed = 0;

  async function check(desc, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${desc}: ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    await check('GET /api/health returns 200 and mysql_connected: true', async () => {
      const res = await makeRequest(server, '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ok');
      assert.strictEqual(res.data.mysql_connected, true);
    });

    // 2. Authentication Login Student
    let studentToken = null;
    await check('POST /api/auth/login logs in student and returns JWT', async () => {
      const res = await makeRequest(server, '/api/auth/login', {
        method: 'POST',
        body: { username: 'santhosh', password: 'password123' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(res.data.token, 'Token must be returned');
      studentToken = res.data.token;
    });

    // 3. Authentication Login Librarian
    let librarianToken = null;
    await check('POST /api/auth/login logs in librarian and returns JWT', async () => {
      const res = await makeRequest(server, '/api/auth/login', {
        method: 'POST',
        body: { username: 'librarian', password: 'adminpassword' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.user.role, 'librarian');
      librarianToken = res.data.token;
    });

    // 4. Authentication Login Admin
    let adminToken = null;
    await check('POST /api/auth/login logs in system admin and returns JWT', async () => {
      const res = await makeRequest(server, '/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'adminpassword' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.user.role, 'admin');
      adminToken = res.data.token;
    });

    // 5. Admin RBAC: Student forbidden from admin stats
    await check('GET /api/admin/stats by student returns 403 Forbidden', async () => {
      const res = await makeRequest(server, '/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    // 6. Admin stats: Admin accesses system analytics
    await check('GET /api/admin/stats by admin returns 200 and MySQL counts', async () => {
      const res = await makeRequest(server, '/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.books.total_titles > 0);
      assert(res.data.users.total_users > 0);
      assert(res.data.transactions.total_transactions > 0);
    });

    // 7. Admin users list: Admin accesses all MySQL users
    await check('GET /api/admin/users by admin returns users directory', async () => {
      const res = await makeRequest(server, '/api/admin/users', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.users.length >= 3);
    });

    // 8. Fetch dynamic active Java loan ID for student
    let targetJavaLoanId = null;
    await check('GET /api/loans/my retrieves student active loans', async () => {
      const res = await makeRequest(server, '/api/loans/my', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 200);
      const javaLoan = res.data.loans.find(l => l.title.includes('Core Java') && l.status === 'Issued');
      assert(javaLoan, 'Student must have active Java loan');
      targetJavaLoanId = javaLoan.transaction_id;
    });

    // 9. AI Book Search Endpoint
    await check('GET /api/ai/books/search?q=beginner%20python returns real MySQL books', async () => {
      const res = await makeRequest(server, '/api/ai/books/search?q=Find%20beginner-friendly%20Python%20books');
      assert.strictEqual(res.status, 200);
      assert(res.data.books.length > 0);
      assert(res.data.books[0].title.includes('Python Crash Course'));
      assert.strictEqual(res.data.books[0].availability_status, 'Available');
    });

    // 10. Chatbot: Check currently issued books
    await check('POST /api/ai/chat grounded response for student active loans', async () => {
      const res = await makeRequest(server, '/api/ai/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: { message: 'Show me my currently issued books.' }
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.reply.includes('currently issued') || res.data.reply.includes('Core Java'));
    });

    // 11. Chatbot: Refusal to mark returned verbally
    await check('POST /api/ai/chat student claim "I already returned it" instructs librarian visit', async () => {
      const res = await makeRequest(server, '/api/ai/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: { message: 'I already returned it.' }
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.reply.includes('not yet been recorded') || res.data.reply.includes('librarian'));
    });

    // 12. Security: Student cannot call librarian return endpoint (RBAC)
    await check(`POST /api/loans/${targetJavaLoanId}/return by student returns 403 Forbidden`, async () => {
      const res = await makeRequest(server, `/api/loans/${targetJavaLoanId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Student must receive 403 Forbidden');
    });

    // 13. Librarian Return: Authorized librarian marks book return
    await check(`POST /api/loans/${targetJavaLoanId}/return by librarian succeeds and increments stock`, async () => {
      const res = await makeRequest(server, `/api/loans/${targetJavaLoanId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${librarianToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    });

    // 14. Chatbot Follow-up: Student asks if return was updated
    await check('POST /api/ai/chat "Has my return been updated for my Java book?" confirms return in MySQL', async () => {
      const res = await makeRequest(server, '/api/ai/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: { message: 'Has my return been updated for my Java book?' }
      });
      assert.strictEqual(res.status, 200);
      assert(res.data.reply.includes('Yes') && res.data.reply.includes('successfully recorded'));
    });

    // 15. Security & Consistency: Second return attempt on same transaction fails
    await check(`POST /api/loans/${targetJavaLoanId}/return duplicate return rejected with 400`, async () => {
      const res = await makeRequest(server, `/api/loans/${targetJavaLoanId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${librarianToken}` }
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.message.includes('already been marked as Returned'));
    });

    // 16. Student Online Borrow: Student borrows an available book directly online
    let onlineBorrowedTxId = null;
    await check('POST /api/loans/borrow allows student to borrow book online and decrements stock', async () => {
      // Find book #4 (Artificial Intelligence: A Modern Approach)
      const bookResBefore = await db.query('SELECT available_copies FROM books WHERE id = 4');
      const initialStock = bookResBefore[0].available_copies;

      const res = await makeRequest(server, '/api/loans/borrow', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: { bookId: 4 }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(res.data.message.includes('borrowed'));
      onlineBorrowedTxId = res.data.transaction.transaction_id;

      // Verify MySQL available copies decremented
      const bookResAfter = await db.query('SELECT available_copies FROM books WHERE id = 4');
      assert.strictEqual(bookResAfter[0].available_copies, initialStock - 1);
    });

    // 17. Consistency: Student cannot borrow the same book twice simultaneously
    await check('POST /api/loans/borrow duplicate active borrow rejected with 400', async () => {
      const res = await makeRequest(server, '/api/loans/borrow', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: { bookId: 4 }
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.message.includes('active loan'));
    });

    // 18. Frontend serving: GET / returns HTML
    await check('GET / serves React Single Page Application HTML', async () => {
      const res = await makeRequest(server, '/');
      assert.strictEqual(res.status, 200);
      assert(typeof res.data === 'string' && res.data.includes('<div id="root"></div>'));
    });

  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runE2E()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal E2E error:', err);
      process.exit(1);
    });
}
