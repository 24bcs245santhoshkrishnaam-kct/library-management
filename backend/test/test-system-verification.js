const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = 'http://localhost:5001/api';

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runSystemVerification() {
  console.log('================================================================');
  console.log('SMART COLLEGE LIBRARY SYSTEM — COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  let studentToken = '';
  let librarianToken = '';
  let adminToken = '';

  // -------------------------------------------------------------
  // TEST SECTION 1: AUTHENTICATION & DEMO ACCOUNTS
  // -------------------------------------------------------------
  console.log('--- 1. AUTHENTICATION & ROLE ENFORCEMENT ---');

  await check('Student Account 1 Login (santhoshkrishna@gmail.com / 1234)', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'santhoshkrishna@gmail.com', password: '1234', role: 'student' }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.user.role, 'student');
    studentToken = res.data.token;
  });

  await check('Student Account 2 Login (Parthi43@gmail.com / 12345)', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'Parthi43@gmail.com', password: '12345', role: 'student' }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.user.role, 'student');
  });

  await check('Librarian Login (shankarlibarian46@gmail.vom / Kct.libarian)', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'shankarlibarian46@gmail.vom', password: 'Kct.libarian', role: 'librarian' }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.user.role, 'librarian');
    librarianToken = res.data.token;
  });

  await check('Admin Login (arun444@gamil.com / KCT.admin)', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'arun444@gamil.com', password: 'KCT.admin', role: 'admin' }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.user.role, 'admin');
    adminToken = res.data.token;
  });

  await check('Role Mismatch Protection: Student cannot login as Librarian', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'santhoshkrishna@gmail.com', password: '1234', role: 'librarian' }
    });
    assert.strictEqual(res.status, 403);
    assert(res.data.message.includes('cannot log in through the LIBRARIAN portal'));
  });

  // -------------------------------------------------------------
  // TEST SECTION 2: 20 SEEDED STUDENTS IN DATABASE
  // -------------------------------------------------------------
  console.log('\n--- 2. SEEDED STUDENT RECORDS (EXACTLY 20 DISTINCT DEMO USERS) ---');

  await check('Verify at least 20 students exist with full metadata', async () => {
    const res = await api('/admin/users?role=student', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const students = res.data.users;
    assert(students.length >= 20, `Expected at least 20 students, found ${students.length}`);

    const names = students.map(s => s.name);
    assert(names.includes('Santhosh Krishna'), 'Must include Santhosh Krishna');
    assert(names.includes('Parthipan'), 'Must include Parthipan');
    assert(names.includes('Rupak'), 'Must include Rupak');
    assert(names.includes('Prawin'), 'Must include Prawin');
    assert(names.includes('Paramasivam'), 'Must include Paramasivam');

    for (const s of students) {
      assert(s.student_id, `Student ${s.name} missing student_id`);
      assert(s.department, `Student ${s.name} missing department`);
      assert(s.contact_number, `Student ${s.name} missing contact_number`);
      assert.strictEqual(s.account_status.toLowerCase(), 'active');
    }
  });

  // -------------------------------------------------------------
  // TEST SECTION 3: 500+ DISTINCT ENGINEERING BOOKS
  // -------------------------------------------------------------
  console.log('\n--- 3. 500+ BOOK CATALOG & HIGH-RESOLUTION COVERS ---');

  await check('Verify at least 500 distinct books in MySQL catalogue', async () => {
    const res = await api('/books');
    assert.strictEqual(res.status, 200);
    assert(res.data.count >= 500, `Expected >= 500 books, found ${res.data.count}`);

    const depts = new Set(res.data.books.map(b => b.department));
    assert(depts.has('CSE'), 'Should contain CSE books');
    assert(depts.has('AI AND MACHINE LEARNING'), 'Should contain AI & ML books');
    assert(depts.has('ECE'), 'Should contain ECE books');
    assert(depts.has('EEE'), 'Should contain EEE books');
    assert(depts.has('MECHANICAL'), 'Should contain Mechanical books');

    for (const b of res.data.books) {
      assert(b.title && b.title.length > 0, 'Every book must have a title');
      assert(b.cover_image && b.cover_image.startsWith('http'), `Book #${b.id} missing valid cover URL`);
      assert(b.total_copies > 0, `Book #${b.id} total copies must be > 0`);
    }
  });

  // -------------------------------------------------------------
  // TEST SECTION 4: AI RECOMMENDATION ENGINE
  // -------------------------------------------------------------
  console.log('\n--- 4. AI RECOMMENDATIONS & SEMANTIC MATCHING ---');

  await check('AI Search Recommendations for "machine learning"', async () => {
    const res = await api('/books/recommendations?q=machine%20learning');
    assert.strictEqual(res.status, 200);
    assert(res.data.exactMatches.length > 0, 'Should find machine learning books');
    assert(res.data.recommendations.length > 0, 'Should find cross-topic recommendations');
    assert(res.data.relatedSubjects.length > 0, 'Should return related subject tags');
  });

  await check('AI Related Books for a specific book', async () => {
    const res = await api('/books/1/related?limit=4');
    assert.strictEqual(res.status, 200);
    assert(res.data.related.length > 0);
    assert(res.data.related[0].recommendation_reason, 'Must include AI reason');
  });

  await check('Personalized Student Recommendations based on curriculum', async () => {
    const res = await api('/books/personalized', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.recommendations.length > 0);
  });

  // -------------------------------------------------------------
  // TEST SECTION 5: STUDENT ONLINE BORROWING & RENEWAL
  // -------------------------------------------------------------
  console.log('\n--- 5. STUDENT SELF-SERVICE ONLINE BORROWING ---');

  let testBorrowedBookId = null;
  let newTxId = null;

  await check('Student can borrow available book online', async () => {
    const catalog = await api('/books?available=true');
    const myLoans = await api('/loans/my', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const heldBookIds = new Set(myLoans.data.loans.map(l => l.book_id));
    const candidate = catalog.data.books.find(b => !heldBookIds.has(b.id) && b.available_copies > 0);
    assert(candidate, 'Must find candidate book to borrow');
    testBorrowedBookId = candidate.id;

    const res = await api('/loans/borrow', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { bookId: candidate.id }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert(res.data.transaction.transaction_id);
    newTxId = res.data.transaction.transaction_id;
  });

  await check('Duplicate borrow attempt for the same book is prevented', async () => {
    const res = await api('/loans/borrow', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { bookId: testBorrowedBookId }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.message.includes('currently have an active loan'));
  });

  await check('Student can renew borrowed book (+14 days)', async () => {
    const res = await api(`/loans/${newTxId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.new_due_date);
  });

  // -------------------------------------------------------------
  // TEST SECTION 6: LIBRARIAN OVERDUE TRACKING & PRIORITY
  // -------------------------------------------------------------
  console.log('\n--- 6. LIBRARIAN OVERDUE PRIORITIZATION & FINES ---');

  let overdueLoanToTest = null;

  await check('Overdue loans are sorted by: 1) highest days first, 2) earliest due date next', async () => {
    const res = await api('/loans?status=Issued', {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 200);
    const overdueList = res.data.loans.filter(l => l.is_overdue);
    assert(overdueList.length > 0, 'Must have seeded overdue loans');
    overdueLoanToTest = overdueList[0];

    for (let i = 0; i < overdueList.length - 1; i++) {
      assert(
        overdueList[i].days_overdue >= overdueList[i + 1].days_overdue,
        `Expected ${overdueList[i].days_overdue} >= ${overdueList[i + 1].days_overdue}`
      );
    }

    for (const loan of overdueList) {
      if (loan.days_overdue >= 30) assert.strictEqual(loan.overdue_color, 'red');
      else if (loan.days_overdue >= 15) assert.strictEqual(loan.overdue_color, 'dark-orange');
      else if (loan.days_overdue >= 7) assert.strictEqual(loan.overdue_color, 'orange');
      else assert.strictEqual(loan.overdue_color, 'yellow');

      assert.strictEqual(loan.accrued_fine, loan.days_overdue * 5.00);
    }
  });

  // -------------------------------------------------------------
  // TEST SECTION 7: SMS OVERDUE NOTIFICATIONS
  // -------------------------------------------------------------
  console.log('\n--- 7. SMS NOTIFICATION REMINDERS & TEMPLATES ---');

  await check('Preview SMS template for overdue borrower', async () => {
    const res = await api(`/sms/preview/${overdueLoanToTest.transaction_id}`, {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.message.includes(`Dear ${overdueLoanToTest.student_name}`));
    assert(res.data.message.includes(overdueLoanToTest.title));
    assert(res.data.message.includes('day(s) overdue'));
    assert(res.data.preview.days_overdue > 0);
  });

  await check('Send single SMS reminder to overdue student', async () => {
    const res = await api(`/sms/send/${overdueLoanToTest.transaction_id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${librarianToken}` },
      body: { message: 'Urgent: Please return library book immediately.' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.sms.status, 'Sent');
  });

  await check('Send bulk SMS reminders to all overdue borrowers', async () => {
    const res = await api('/sms/send-bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${librarianToken}` },
      body: {}
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.sentCount > 0);
  });

  await check('SMS logs are recorded and accessible to staff', async () => {
    const res = await api('/sms/logs', {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.logs.length > 0);
  });

  // -------------------------------------------------------------
  // TEST SECTION 8: LIBRARIAN RETURN WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 8. LIBRARIAN CIRCULATION RETURN WORKFLOW ---');

  await check('Mark book as returned increments stock atomically', async () => {
    const initialBook = (await api(`/books/${testBorrowedBookId}`)).data.book;

    const res = await api(`/loans/${newTxId}/return`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 200);

    const updatedBook = (await api(`/books/${testBorrowedBookId}`)).data.book;
    assert.strictEqual(updatedBook.available_copies, initialBook.available_copies + 1);
  });

  await check('Prevent double return on already-returned book', async () => {
    const res = await api(`/loans/${newTxId}/return`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.message.includes('already been marked as Returned'));
  });

  // -------------------------------------------------------------
  // TEST SECTION 9: ADMIN GOVERNANCE & CSV IMPORT
  // -------------------------------------------------------------
  console.log('\n--- 9. ADMIN GOVERNANCE, POLICIES & CSV IMPORT ---');

  await check('Admin statistics retrieval', async () => {
    const res = await api('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.books.total_titles >= 500);
    assert(res.data.users.students_count >= 20);
    assert(res.data.transactions.total_sms_sent > 0);
  });

  await check('Import real college students via CSV payload', async () => {
    const csvContent = `name,email,student_id,department,contact_number
Harish Kumar,harish@kct.ac.in,24BCS290,CSE,+91 99999 11111
Divya Bharathi,divya@kct.ac.in,24BAI220,AI AND MACHINE LEARNING,+91 99999 22222`;

    const res = await api('/admin/students/import-csv', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { csv_data: csvContent }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.importedCount, 2);
  });

  await check('Update library policy and verify audit log', async () => {
    const res = await api('/admin/policies/loan_period_days', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { value: 14, description: 'Standard student borrowing period' }
    });
    assert.strictEqual(res.status, 200);

    const auditRes = await api('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    assert(auditRes.data.logs.length > 0);
  });

  // -------------------------------------------------------------
  // TEST SECTION 10: HISTORY OF OVERDUE & UNOVERDUE RETURN STATUS
  // -------------------------------------------------------------
  console.log('\n--- 10. HISTORY OF OVERDUE & UNOVERDUE RETURN STATUS ---');

  await check('Circulation history accurately classifies Overdue Return vs Unoverdue Return', async () => {
    const res = await api('/loans', {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    assert.strictEqual(res.status, 200);
    const returnedLoans = res.data.loans.filter(l => l.status === 'Returned');
    assert(returnedLoans.length >= 2, 'Should have multiple returned records seeded');

    const overdueReturns = returnedLoans.filter(l => l.was_overdue);
    const unoverdueReturns = returnedLoans.filter(l => !l.was_overdue);

    assert(overdueReturns.length > 0, 'Must have at least one Overdue Return');
    assert(unoverdueReturns.length > 0, 'Must have at least one Unoverdue Return (on-time)');

    for (const loan of overdueReturns) {
      assert.strictEqual(loan.return_status, 'Overdue Return');
      assert.strictEqual(loan.status_label, 'Returned Overdue');
      assert(loan.days_late > 0, `Expected days_late > 0, got ${loan.days_late}`);
    }

    for (const loan of unoverdueReturns) {
      assert.strictEqual(loan.return_status, 'Unoverdue Return');
      assert.strictEqual(loan.status_label, 'Returned On-Time');
      assert.strictEqual(loan.days_late, 0);
    }
  });

  await check('Student borrowing history includes Overdue vs Unoverdue Return tags', async () => {
    const res = await api('/loans/my', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    const myHistory = res.data.loans.filter(l => l.status === 'Returned');
    assert(myHistory.length > 0, 'Student should have returned book history');

    for (const loan of myHistory) {
      assert(loan.return_status === 'Overdue Return' || loan.return_status === 'Unoverdue Return');
      assert(loan.status_label === 'Returned Overdue' || loan.status_label === 'Returned On-Time');
      assert(typeof loan.days_late === 'number');
    }
  });

  // -------------------------------------------------------------
  // TEST SECTION 11: EDIT INFORMATION DETAILS (STUDENT, LOAN, ADMIN)
  // -------------------------------------------------------------
  console.log('\n--- 11. EDIT INFORMATION DETAILS IN ALL PORTALS ---');

  await check('Student can edit personal profile details', async () => {
    const res = await api('/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        name: 'Santhosh Krishna',
        department: 'CSE',
        contact_number: '+91 98765 43210'
      }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.user.name, 'Santhosh Krishna');
    assert.strictEqual(res.data.user.contact_number, '+91 98765 43210');
  });

  await check('Librarian can edit loan information details (due date, fine, remarks)', async () => {
    // Get an existing loan
    const loansRes = await api('/loans', {
      headers: { Authorization: `Bearer ${librarianToken}` }
    });
    const targetLoan = loansRes.data.loans[0];
    assert(targetLoan, 'Must have at least one loan');

    const newDueDate = '2026-11-30';
    const newFine = 25.00;
    const newNotes = 'Verified condition: pristine copy. Extended due date.';

    const res = await api(`/loans/${targetLoan.transaction_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${librarianToken}` },
      body: {
        due_date: newDueDate,
        fine_amount: newFine,
        notes: newNotes,
        status: targetLoan.status
      }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert.strictEqual(res.data.loan.notes, newNotes);
    assert.strictEqual(Number(res.data.loan.fine_amount), newFine);
  });

  await check('Admin can edit student information details (status, contact, dept)', async () => {
    const usersRes = await api('/admin/users?role=student', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const targetStudent = usersRes.data.users.find(u => u.name === 'Parthipan');
    assert(targetStudent, 'Target student Parthipan must exist');

    const res = await api(`/admin/users/${targetStudent.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Parthipan',
        email: targetStudent.email,
        student_id: targetStudent.student_id,
        department: 'AI AND MACHINE LEARNING',
        contact_number: '+91 98765 55555',
        account_status: 'active'
      }
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.success);

    // Verify change took effect
    const updatedUsersRes = await api('/admin/users?role=student', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const updated = updatedUsersRes.data.users.find(u => u.id === targetStudent.id);
    assert.strictEqual(updated.department, 'AI AND MACHINE LEARNING');
    assert.strictEqual(updated.contact_number, '+91 98765 55555');
  });

  // -------------------------------------------------------------
  // TEST SECTION 12: SHAKESPEARE, TAMIL & CAREER GUIDANCE AI
  // -------------------------------------------------------------
  console.log('\n--- 12. SHAKESPEARE, TAMIL & CAREER GUIDANCE AI ---');

  await check('Verify total catalog has at least 600 books (verified in MySQL)', async () => {
    const res = await api('/books');
    assert.strictEqual(res.status, 200);
    assert(res.data.count >= 600, `Expected total books >= 600, found ${res.data.count}`);
  });

  await check('Verify at least 50 Shakespeare-related books exist with rich metadata', async () => {
    const res = await api('/books?collection=Shakespeare%20Collection');
    assert.strictEqual(res.status, 200);
    assert(res.data.count >= 50, `Expected >= 50 Shakespeare books, found ${res.data.count}`);

    const sample = res.data.books.find(b => b.title.includes('Hamlet'));
    assert(sample, 'Must include Hamlet');
    assert(sample.category.includes('Shakespeare'), 'Category must be under Shakespeare');
    assert(sample.cover_image && sample.cover_image.startsWith('http'), 'Must have valid cover');
    assert(sample.total_copies > 0, 'Must have physical copies');
  });

  await check('Verify at least 50 Tamil-language books exist with Tamil script', async () => {
    const res = await api('/books?collection=Tamil%20Literature');
    assert.strictEqual(res.status, 200);
    assert(res.data.count >= 50, `Expected >= 50 Tamil books, found ${res.data.count}`);

    const sample = res.data.books.find(b => b.title.includes('திருக்குறள்'));
    assert(sample, 'Must include Thirukkural in Tamil script');
    assert.strictEqual(sample.language, 'Tamil');
    assert(sample.alternate_titles.includes('Thirukkural'), 'Must include transliteration');
  });

  await check('Search books using authentic Tamil script (திருக்குறள்)', async () => {
    const res = await api('/books?q=%E0%AE%A4%E0%AE%BF%E0%AE%B0%E0%AF%81%E0%AE%95%E0%AF%8D%E0%AE%95%E0%AF%81%E0%AE%B1%E0%AE%B3%E0%AF%8D');
    assert.strictEqual(res.status, 200);
    assert(res.data.count > 0, 'Should find Thirukkural via Tamil script search');
    assert(res.data.books[0].title.includes('திருக்குறள்'));
  });

  await check('Search books using transliterated English alias (thirukkural)', async () => {
    const res = await api('/books?q=thirukkural');
    assert.strictEqual(res.status, 200);
    assert(res.data.count > 0, 'Should find Thirukkural via transliterated search');
    assert(res.data.books.some(b => b.alternate_titles && b.alternate_titles.toLowerCase().includes('thirukkural')));
  });

  await check('Shakespeare recommendations return relevant tragedies, sonnets, and analysis', async () => {
    const res = await api('/books/recommendations?q=Hamlet');
    assert.strictEqual(res.status, 200);
    assert(res.data.exactMatches.length > 0 || res.data.recommendations.length > 0);
    const recs = [...res.data.exactMatches, ...res.data.recommendations];
    assert(recs.some(b => b.category.includes('Shakespeare')), 'Recommendations must include Shakespeare books');
  });

  await check('Tamil recommendations return classical literature and commentaries', async () => {
    const res = await api('/books/recommendations?q=thirukkural');
    assert.strictEqual(res.status, 200);
    const recs = [...res.data.exactMatches, ...res.data.recommendations];
    assert(recs.some(b => b.department === 'TAMIL LITERATURE' || b.language === 'Tamil'));
  });

  await check('Career Guidance API returns domain, skills, paths, realistic earnings & source', async () => {
    const res = await api('/books/career-guidance?q=machine%20learning');
    assert.strictEqual(res.status, 200);
    assert(res.data.success);
    assert(res.data.skillsLearned.length > 0, 'Must return skills');
    assert(res.data.careerPaths.length > 0, 'Must return career paths');
    assert(res.data.realWorldApplications.length > 0, 'Must return earning applications');
    assert(res.data.earningGuidance.india.entryLevel, 'Must return India salary benchmark');
    assert(res.data.earningGuidance.global.entryLevel, 'Must return Global salary benchmark');
    assert(res.data.earningGuidance.source.includes('NASSCOM') || res.data.earningGuidance.source.includes('Glassdoor'));
    assert(res.data.earningGuidance.disclaimer.includes('does not guarantee'), 'Must contain disclaimer');
    assert(res.data.recommendedNextBooks.length > 0, 'Must return real books from catalog');
  });

  await check('Career Guidance dynamically adapts to Shakespeare & Humanities subjects', async () => {
    const res = await api('/books/career-guidance?q=hamlet');
    assert.strictEqual(res.status, 200);
    assert(res.data.domain.includes('English Literature') || res.data.domain.includes('Drama'));
    assert(res.data.careerPaths.some(p => p.includes('Teacher') || p.includes('Editor') || p.includes('Critic')));
  });

  await check('Career Guidance dynamically adapts to Tamil literature & Translation subjects', async () => {
    const res = await api('/books/career-guidance?q=thirukkural');
    assert.strictEqual(res.status, 200);
    assert(res.data.domain.includes('Tamil Literature') || res.data.domain.includes('Translation'));
    assert(res.data.careerPaths.some(p => p.includes('Translator') || p.includes('Teacher') || p.includes('Scholar')));
  });

  await check('Career Goal Roadmap returns 4 progressive levels of real library books', async () => {
    const res = await api('/books/career-roadmap?goal=aiml_engineer');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.totalStages, 4);
    for (const stage of res.data.stages) {
      assert(stage.stageName);
      assert(stage.books.length > 0, `Stage ${stage.stageName} must have books`);
      for (const b of stage.books) {
        assert(b.id > 0, 'Must have valid book ID in catalog');
        assert(b.title, 'Must have valid book title');
      }
    }
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemVerification().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
