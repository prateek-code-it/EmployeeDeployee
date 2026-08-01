const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');

// GET /api/users  (Admin only)
async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.login_id, u.full_name, u.role, u.employee_id, u.is_active,
              u.must_reset_password, u.created_at, e.trade_role, e.phone
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
       ORDER BY u.role ASC, u.full_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
}

// POST /api/users  (Admin only)
// Creates a login account (Supervisor or Employee), optionally linked to an existing employee record.
// Auto-generates a login_id and a temporary password.
async function createUser(req, res) {
  const { full_name, role, employee_id } = req.body;

  if (!full_name || !role) {
    return res.status(400).json({ error: 'full_name and role are required' });
  }
  if (!['supervisor', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'role must be supervisor or employee' });
  }

  try {
    // Generate a login_id from the name, ensuring uniqueness
    const base = full_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    let loginId = base;
    let suffix = 1;
    while (true) {
      const existing = await pool.query('SELECT id FROM users WHERE login_id = $1', [loginId]);
      if (existing.rows.length === 0) break;
      loginId = `${base}${suffix++}`;
    }

    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8-char temp password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (login_id, password_hash, full_name, role, employee_id, must_reset_password, created_by)
       VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id, login_id, full_name, role, employee_id, is_active, created_at`,
      [loginId, passwordHash, full_name, role, employee_id || null, req.user.id]
    );

    res.status(201).json({ ...result.rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error creating user' });
  }
}

// PUT /api/users/:id/deactivate  (Admin only)
async function deactivateUser(req, res) {
  const { id } = req.params;
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 RETURNING id, login_id, full_name, is_active',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Server error deactivating user' });
  }
}

// PUT /api/users/:id/reactivate  (Admin only)
async function reactivateUser(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = true, updated_at = now() WHERE id = $1 RETURNING id, login_id, full_name, is_active',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reactivate user error:', err);
    res.status(500).json({ error: 'Server error reactivating user' });
  }
}

// PUT /api/users/:id/reset-password  (Admin only) - generates a new temp password
async function adminResetPassword(req, res) {
  const { id } = req.params;
  try {
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, must_reset_password = true, updated_at = now()
       WHERE id = $2 RETURNING id, login_id, full_name`,
      [passwordHash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ...result.rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
}

module.exports = { listUsers, createUser, deactivateUser, reactivateUser, adminResetPassword };

