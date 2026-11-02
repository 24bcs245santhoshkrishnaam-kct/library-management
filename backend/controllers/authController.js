const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  try {
    const { username, email, password, role: requestedRole } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: 'Email/Username and password are required' 
      });
    }

    // Match by username or email
    const rows = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', 
      [loginIdentifier, loginIdentifier]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ 
        error: 'Auth Error', 
        message: 'Invalid email or password' 
      });
    }

    const user = rows[0];

    // Check account status
    if (user.account_status === 'suspended') {
      return res.status(403).json({
        error: 'Account Suspended',
        message: 'Your library account has been suspended. Please contact the administrator.'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ 
        error: 'Auth Error', 
        message: 'Invalid email or password' 
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      department: user.department,
      contact_number: user.contact_number,
      account_status: user.account_status
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process login request' });
  }
}

async function getMe(req, res) {
  try {
    const rows = await db.query(
      'SELECT id, username, name, email, role, student_id, department, contact_number, account_status FROM users WHERE id = ?', 
      [req.user.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function getStudents(req, res) {
  try {
    const rows = await db.query(`
      SELECT id, username, name, email, student_id, department, contact_number, account_status
      FROM users 
      WHERE role = 'student' 
      ORDER BY name ASC
    `);
    res.json({ students: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, contact_number, department } = req.body;

    await db.query(`
      UPDATE users 
      SET 
        name = COALESCE(?, name),
        contact_number = COALESCE(?, contact_number),
        department = COALESCE(?, department)
      WHERE id = ?
    `, [name ? name.trim() : null, contact_number ? contact_number.trim() : null, department ? department.trim() : null, req.user.id]);

    const rows = await db.query(
      'SELECT id, username, name, email, role, student_id, department, contact_number, account_status FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile details updated successfully.',
      user: rows[0]
    });
  } catch (err) {
    console.error('[Update Profile Error]:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

module.exports = {
  login,
  getMe,
  getStudents,
  updateProfile
};
