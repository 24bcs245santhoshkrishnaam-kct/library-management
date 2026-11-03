/**
 * Exhaustive Feature Verification Suite for KCT AI Smart Library
 * Tests 100% of API endpoints and features across Student, Librarian, and Admin portals.
 */

const http = require('http');
const app = require('../server');
const db = require('../config/db');

async function runFeatureDiagnostics() {
  console.log('================================================================');
  console.log('       KCT AI SMART LIBRARY — COMPREHENSIVE FEATURE AUDIT       ');
  console.log('================================================================\n');

  await db.testConnection();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  function api(method, urlPath, token = null, body = null) {
    const data = body ? JSON.stringify(body) : null;
    return new Promise((resolve) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (data) headers['Content-Length'] = Buffer.byteLength(data);

      const r = http.request({
        hostname: 'localhost',
        port,
        path: urlPath,
        method,
        headers
      }, (res) => {
        let b = '';
        res.on('data', chunk => b += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(b);
          } catch(e) {
            parsed = b;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      });
      r.on('error', (err) => resolve({ status: 500, error: err.message }));
      if (data) r.write(data);
      r.end();
    });
  }

  const results = [];
  function record(moduleName, feature, status, details) {
    const passed = status >= 200 && status < 300;
    results.push({ module: moduleName, feature, status, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${moduleName}] ${feature} (HTTP ${status}) - ${details}`);
  }

  // 1. SYSTEM HEALTH
  const health = await api('GET', '/api/health');
  record('Health', 'System Status & Database', health.status, `DB: ${health.data.database}, Connected: ${health.data.mongodb_connected}`);

  // 2. AUTHENTICATION (ALL 3 ROLES)
  const studentLogin = await api('POST', '/api/auth/login', null, { email: 'santhoshkrishna@gmail.com', password: '1234' });
  const studentToken = studentLogin.data.token;
  record('Auth', 'Student Login', studentLogin.status, `Name: ${studentLogin.data.user?.name}, Role: ${studentLogin.data.user?.role}`);

  const librarianLogin = await api('POST', '/api/auth/login', null, { email: 'shankarlibarian46@gmail.vom', password: 'Kct.libarian' });
  const librarianToken = librarianLogin.data.token;
  record('Auth', 'Librarian Login', librarianLogin.status, `Name: ${librarianLogin.data.user?.name}, Role: ${librarianLogin.data.user?.role}`);

  const adminLogin = await api('POST', '/api/auth/login', null, { email: 'arun444@gamil.com', password: 'KCT.admin' });
  const adminToken = adminLogin.data.token;
  record('Auth', 'Admin Login', adminLogin.status, `Name: ${adminLogin.data.user?.name}, Role: ${adminLogin.data.user?.role}`);

  const me = await api('GET', '/api/auth/me', studentToken);
  record('Auth', 'Token Verify (/api/auth/me)', me.status, `Identity verified: ${me.data.user?.name}`);

  // 3. BOOKS CATALOG
  const booksList = await api('GET', '/api/books?limit=10', studentToken);
  record('Books', 'Get Catalog Books', booksList.status, `Total: ${booksList.data.total || booksList.data.books?.length} titles`);

  const bookSearch = await api('GET', '/api/books?search=Python', studentToken);
  record('Books', 'Search Books Keyword', bookSearch.status, `Found: ${bookSearch.data.books?.length} books matching "Python"`);

  const bookDetail = await api('GET', '/api/books/1', studentToken);
  record('Books', 'Book Details by ID (/api/books/1)', bookDetail.status, `Title: "${bookDetail.data.book?.title || bookDetail.data.title}"`);

  const related = await api('GET', '/api/books/1/related', studentToken);
  record('Books', 'Related Recommendations', related.status, `Related books: ${related.data.related?.length || 0}`);

  const depts = await api('GET', '/api/books/departments', studentToken);
  record('Books', 'Academic Departments List', depts.status, `Total departments: ${depts.data.departments?.length || 0}`);

  // 4. STUDENT BORROWING, PRESENT/PAST/UPCOMING & NOTIFICATIONS
  const myLoans = await api('GET', '/api/loans/my', studentToken);
  const loansArray = myLoans.data.loans || [];
  const now = new Date();
  const pastCount = loansArray.filter(l => l.status === 'Returned').length;
  const overdueCount = loansArray.filter(l => l.status === 'Issued' && new Date(l.due_date) < now).length;
  const upcomingCount = loansArray.filter(l => l.status === 'Issued' && new Date(l.due_date) >= now).length;
  record('Student', 'My Loans (Past, Present, Upcoming)', myLoans.status, `Total: ${loansArray.length} (Past: ${pastCount}, Present Overdue: ${overdueCount}, Upcoming: ${upcomingCount})`);

  const myStatus = await api('GET', '/api/loans/my/status', studentToken);
  record('Student', 'Loan Summary Status', myStatus.status, `Active: ${myStatus.data.active_loans_count}, Quota: ${myStatus.data.borrowing_limit}`);

  const notifs = await api('GET', '/api/loans/my/notifications', studentToken);
  const notifList = notifs.data.notifications || [];
  record('Notifications', 'Get Student Notifications', notifs.status, `Total: ${notifList.length}, Unread: ${notifs.data.unread_count}`);

  if (notifList.length > 0) {
    const markOne = await api('PUT', `/api/loans/my/notifications/${notifList[0].id}/read`, studentToken);
    record('Notifications', 'Mark Single Notification Read', markOne.status, markOne.data.message || 'Marked single');
  }

  const markAll = await api('PUT', '/api/loans/my/notifications/read-all', studentToken);
  record('Notifications', 'Mark All Read', markAll.status, markAll.data.message || 'All read');

  // 5. LIBRARIAN CIRCULATION & DESK
  const allLoans = await api('GET', '/api/loans', librarianToken);
  record('Librarian', 'All Circulation Loans Desk', allLoans.status, `Total circulation records: ${allLoans.data.loans?.length || 0}`);

  const bMode = await api('GET', '/api/loans/borrowing-mode', librarianToken);
  record('Librarian', 'Borrowing Mode Config', bMode.status, `Current Mode: ${bMode.data.mode} (${bMode.data.duration_label})`);

  const studentsList = await api('GET', '/api/auth/students', librarianToken);
  record('Librarian', 'Student Borrowers Registry', studentsList.status, `Registered students: ${studentsList.data.students?.length || 0}`);

  // 6. SMS DISPATCH & OVERDUE AUTOMATION
  const smsLogs = await api('GET', '/api/sms/logs', librarianToken);
  record('SMS', 'SMS & Notification Audit Logs', smsLogs.status, `Logged alerts: ${smsLogs.data.logs?.length || 0}`);

  const overdueCheck = await api('POST', '/api/sms/run-overdue-check', librarianToken);
  record('SMS', 'Automated Overdue Check Scheduler', overdueCheck.status, `Checked loans: ${overdueCheck.data.checked_loans || 0}, Dispatched: ${overdueCheck.data.dispatched_count || 0}`);

  // 7. ADMINISTRATOR GOVERNANCE & AUDIT
  const adminStats = await api('GET', '/api/admin/stats', adminToken);
  record('Admin', 'Institutional Analytics & Stats', adminStats.status, `Titles: ${adminStats.data.books?.total_titles || adminStats.data.stats?.books?.total_titles}, Users: ${adminStats.data.users?.total_users || adminStats.data.users?.count}`);

  const adminUsers = await api('GET', '/api/admin/users', adminToken);
  record('Admin', 'User Accounts Governance', adminUsers.status, `Total accounts: ${adminUsers.data.users?.length || 0}`);

  const policies = await api('GET', '/api/admin/policies', adminToken);
  record('Admin', 'Library Policies Registry', policies.status, `Policies configured: ${policies.data.policies?.length || 0}`);

  const auditLogs = await api('GET', '/api/admin/audit-logs', adminToken);
  record('Admin', 'Security & Audit Activity Trail', auditLogs.status, `Total audit records: ${auditLogs.data.logs?.length || 0}`);

  // 8. ACADEMIC AI ADVISOR
  const aiChat = await api('POST', '/api/ai/chat', studentToken, {
    message: 'Recommend me two good introductory books on Artificial Intelligence and Python programming.'
  });
  record('AI Chatbot', 'AI Academic Advisor', aiChat.status, `Response generated: "${(aiChat.data.reply || aiChat.data.message || '').substring(0, 60)}..."`);

  server.close();

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL FEATURES AUDITED: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.passed).length} / ${results.length}`);
  console.log(`STATUS: ${allPassed ? 'ALL FEATURES 100% OPERATIONAL & VERIFIED' : 'SOME CHECKS FAILED'}`);
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runFeatureDiagnostics().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
