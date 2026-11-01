const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function addExtraStudentEmails() {
  console.log('[Users] Checking and adding extra 5 student email accounts for Parama, Prawin, and Rupak...');
  await db.testConnection();

  const passwordHash = await bcrypt.hash('12345', 10);

  const extraStudents = [
    {
      name: 'Parama',
      email: 'parama@kct.ac.in',
      username: 'parama',
      student_id: '24BCS119',
      department: 'Mechanical Engineering',
      contact_number: '+91 98405 67891'
    },
    {
      name: 'Paramasivam (Parama)',
      email: 'parama.student@kct.ac.in',
      username: 'parama.student',
      student_id: '24BCS120',
      department: 'Mechanical Engineering',
      contact_number: '+91 98405 67892'
    },
    {
      name: 'Prawin S',
      email: 'prawin.student@kct.ac.in',
      username: 'prawin.student',
      student_id: '24BCS121',
      department: 'Electronics & Communication Engineering',
      contact_number: '+91 98404 56780'
    },
    {
      name: 'Prawin Kumar',
      email: 'prawin.kct@gmail.com',
      username: 'prawin.kct',
      student_id: '24BCS122',
      department: 'Electronics & Communication Engineering',
      contact_number: '+91 98404 56781'
    },
    {
      name: 'Rupak K',
      email: 'rupak.kct@gmail.com',
      username: 'rupak.kct',
      student_id: '24BCS123',
      department: 'AI & Data Science',
      contact_number: '+91 98403 45679'
    }
  ];

  for (const s of extraStudents) {
    const existing = await db.query('SELECT id, email FROM users WHERE email = ? OR username = ?', [s.email, s.username]);
    if (existing.length === 0) {
      await db.query(`
        INSERT INTO users (username, password_hash, name, email, role, student_id, department, contact_number, account_status, is_demo)
        VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 'Active', TRUE)
      `, [s.username, passwordHash, s.name, s.email, s.student_id, s.department, s.contact_number]);
      console.log(`  + Inserted student account: ${s.name} (${s.email})`);
    } else {
      console.log(`  = Student account already exists: ${s.email}`);
    }
  }

  console.log('[Users] Extra student accounts verified.');
}

if (require.main === module) {
  addExtraStudentEmails().then(() => process.exit(0)).catch(err => {
    console.error('Failed to add extra student accounts:', err);
    process.exit(1);
  });
}

module.exports = { addExtraStudentEmails };

