const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function getStats(req, res) {
  try {
    // 1. Books stats
    const bookRows = await db.query(`
      SELECT 
        COUNT(*) as total_titles,
        COALESCE(SUM(total_copies), 0) as total_copies,
        COALESCE(SUM(available_copies), 0) as available_copies,
        COALESCE(SUM(total_copies - available_copies), 0) as borrowed_copies
      FROM books
    `);
    const bookStats = bookRows && bookRows.length > 0 ? bookRows[0] : {};

    // 2. Users stats
    const userRows = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students_count,
        SUM(CASE WHEN role = 'librarian' THEN 1 ELSE 0 END) as librarians_count,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins_count
      FROM users
    `);
    const userStats = userRows && userRows.length > 0 ? userRows[0] : {};

    // 3. Transactions stats
    const txRows = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'Issued' THEN 1 ELSE 0 END) as active_loans_count,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returned_count,
        SUM(CASE WHEN status = 'Issued' AND due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count,
        COALESCE(SUM(fine_amount), 0) as total_fines
      FROM transactions
    `);
    const txStats = txRows && txRows.length > 0 ? txRows[0] : {};

    // 4. SMS notifications sent
    const smsRows = await db.query(`
      SELECT COUNT(*) as total_sms_sent
      FROM notifications
    `).catch(() => [{ total_sms_sent: 0 }]);
    const smsCount = (smsRows && smsRows[0] && smsRows[0].total_sms_sent) || 0;

    // 5. Categories breakdown
    const categoryStats = await db.query(`
      SELECT category, COUNT(*) as count, SUM(total_copies) as total_copies
      FROM books
      GROUP BY category
      ORDER BY count DESC
    `);

    // 6. Department breakdown
    const deptStats = await db.query(`
      SELECT department, COUNT(*) as count
      FROM books
      GROUP BY department
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      mysql_connected: db.isConnected,
      books: bookStats,
      users: userStats,
      transactions: {
        ...txStats,
        total_sms_sent: smsCount
      },
      categories: categoryStats,
      departments: deptStats
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getUsers(req, res) {
  try {
    const { role, department, status, search } = req.query;

    let sql = `
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.email, 
        u.role, 
        u.student_id, 
        u.department,
        u.contact_number,
        u.account_status,
        u.is_demo,
        DATE_FORMAT(u.created_at, '%Y-%m-%d') as created_at,
        COUNT(t.id) as total_loans,
        SUM(CASE WHEN t.status = 'Issued' THEN 1 ELSE 0 END) as active_loans
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    if (department && department !== 'all') {
      sql += ' AND u.department = ?';
      params.push(department);
    }
    if (status && status !== 'all') {
      sql += ' AND u.account_status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' GROUP BY u.id ORDER BY u.role DESC, u.name ASC';

    const users = await db.query(sql, params);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('[Admin Get Users Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function createUser(req, res) {
  try {
    const { username, password, name, email, role, student_id, department, contact_number } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Validation Error', message: 'Name and email are required.' });
    }

    const validRoles = ['student', 'librarian', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'student';
    const finalUsername = (username || email.split('@')[0]).trim();
    const finalPassword = password || 'Welcome@123';

    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const result = await db.query(`
      INSERT INTO users (username, password_hash, name, email, role, student_id, department, contact_number, account_status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)
    `, [
      finalUsername, 
      passwordHash, 
      name.trim(), 
      email.trim(), 
      assignedRole, 
      student_id ? student_id.trim() : null,
      department || 'General',
      contact_number || '+91 98765 43210'
    ]);

    res.status(201).json({
      success: true,
      message: `User ${name} created successfully as ${assignedRole}.`,
      user_id: result.insertId
    });
  } catch (err) {
    console.error('[Admin Create User Error]:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Duplicate Error', message: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, email, role, department, contact_number, account_status, student_id } = req.body;

    if (userId === req.user.id && role && role !== 'admin') {
      return res.status(400).json({ error: 'Operation Rejected', message: 'You cannot demote your own administrator account.' });
    }

    await db.query(`
      UPDATE users 
      SET 
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        department = COALESCE(?, department),
        contact_number = COALESCE(?, contact_number),
        account_status = COALESCE(?, account_status),
        student_id = COALESCE(?, student_id)
      WHERE id = ?
    `, [name, email, role, department, contact_number, account_status, student_id, userId]);

    res.json({ success: true, message: `User #${userId} updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Operation Rejected', message: 'You cannot delete your own account.' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: `User #${userId} deleted from system.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

/**
 * Import students via CSV data
 * Accepts either:
 * - { csv_data: "name,email,student_id,department,contact\nJohn,john@kct.ac.in,STU101,CSE,+919999999999" }
 * - or { students: [{ name, email, student_id, department, contact_number }] }
 */
async function importStudentsCSV(req, res) {
  try {
    let studentList = [];

    if (req.body.students && Array.isArray(req.body.students)) {
      studentList = req.body.students;
    } else if (req.body.csv_data) {
      const lines = req.body.csv_data.trim().split('\n');
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || '';
        });

        const name = obj.name || obj.fullname || obj['student name'] || cols[0];
        const email = obj.email || obj['college email'] || cols[1];
        const student_id = obj.student_id || obj.id || obj['roll no'] || cols[2] || `STU${Date.now()}_${i}`;
        const department = obj.department || obj.dept || cols[3] || 'CSE';
        const contact_number = obj.contact_number || obj.contact || obj.phone || cols[4] || '+91 98765 00000';

        if (name && email) {
          studentList.push({ name, email, student_id, department, contact_number });
        }
      }
    } else {
      return res.status(400).json({ error: 'Validation Error', message: 'No CSV data or student list provided.' });
    }

    if (studentList.length === 0) {
      return res.status(400).json({ error: 'Empty Import', message: 'No valid student records found to import.' });
    }

    let importedCount = 0;
    const defaultPassword = 'Student@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    for (const s of studentList) {
      const username = s.email.split('@')[0] || s.student_id;
      try {
        await db.query(`
          INSERT INTO users (username, password_hash, name, email, role, student_id, department, contact_number, account_status, is_demo)
          VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 'active', 0)
          ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            department = VALUES(department),
            contact_number = VALUES(contact_number)
        `, [
          username,
          passwordHash,
          s.name,
          s.email,
          s.student_id,
          s.department,
          s.contact_number
        ]);
        importedCount++;
      } catch (err) {
        console.warn(`[CSV Import warning for ${s.email}]:`, err.message);
      }
    }

    // Log audit event
    await db.query(`
      INSERT INTO audit_logs (user_id, user_name, action, details)
      VALUES (?, ?, 'IMPORT_STUDENTS_CSV', ?)
    `, [req.user.id, req.user.name || 'Admin', `Imported ${importedCount} student records via CSV.`]).catch(() => {});

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} student records. Default password: "${defaultPassword}"`,
      importedCount
    });
  } catch (err) {
    console.error('[CSV Import Error]:', err);
    res.status(500).json({ error: 'CSV Import Failed', message: err.message });
  }
}

async function getPolicies(req, res) {
  try {
    const policies = await db.query('SELECT * FROM policies ORDER BY policy_key ASC');
    res.json({ success: true, policies });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function updatePolicy(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Validation Error', message: 'Policy value is required.' });
    }

    await db.query(`
      INSERT INTO policies (policy_key, policy_value, description)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        policy_value = VALUES(policy_value),
        description = COALESCE(VALUES(description), description)
    `, [key, String(value), description || null]);

    // Log audit
    await db.query(`
      INSERT INTO audit_logs (user_id, user_name, action, details)
      VALUES (?, ?, 'UPDATE_POLICY', ?)
    `, [req.user.id, req.user.name || 'Admin', `Updated policy ${key} to ${value}`]).catch(e => console.warn('Audit error:', e.message));

    res.json({ success: true, message: `Policy "${key}" updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getAuditLogs(req, res) {
  try {
    const logs = await db.query(`
      SELECT 
        a.id, 
        a.action, 
        COALESCE(a.details, '') as details, 
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') as created_at,
        COALESCE(u.name, a.user_name, 'System') as actor_name,
        COALESCE(u.role, 'admin') as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

module.exports = {
  getStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  importStudentsCSV,
  getPolicies,
  updatePolicy,
  getAuditLogs
};
