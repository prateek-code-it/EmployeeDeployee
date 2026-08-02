const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');

// GET /api/users
// Super Admin sees all (or filters by ?company_id=). Company Head sees only their own company's users.
async function listUsers(req, res) {
  try {
    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query(
          `SELECT u.id, u.login_id, u.full_name, u.role, u.employee_id, u.is_active,
                  u.must_reset_password, u.created_at, u.company_id, e.trade_role, e.phone
           FROM users u
           LEFT JOIN employees e ON e.id = u.employee_id
           WHERE u.company_id = $1
           ORDER BY u.role ASC, u.full_name ASC`,
          [company_id]
        );
        return res.json(result.rows);
      }
      const result = await pool.query(
        `SELECT u.id, u.login_id, u.full_name, u.role, u.employee_id, u.is_active,
                u.must_reset_password, u.created_at, u.company_id, e.trade_role, e.phone
         FROM users u
         LEFT JOIN employees e ON e.id = u.employee_id
         ORDER BY u.role ASC, u.full_name ASC`
      );
      return res.json(result.rows);
    }

    // company_head: only their own company's users
    const result = await pool.query(
      `SELECT u.id, u.login_id, u.full_name, u.role, u.employee_id, u.is_active,
              u.must_reset_password, u.created_at, u.company_id, e.trade_role, e.phone
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
       WHERE u.company_id = $1
       ORDER BY u.role ASC, u.full_name ASC`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
}

// POST /api/users  (Super Admin, Company Head)
// Creates a login account (Supervisor or Employee), scoped to the creator's company
// (or a specified company_id if Super Admin).
async function createUser(req, res) {
  const { full_name, role, employee_id, company_id } = req.body;

  if (!full_name || !role) {
    return res.status(400).json({ error: 'full_name and role are required' });
  }
  if (!['supervisor', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'role must be supervisor or employee' });
  }

  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required when creating a user as Super Admin' });
    }
    targetCompanyId = company_id;
  }

  try {
    const base = full_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    let loginId = base;
    let suffix = 1;
    while (true) {
      const existing = await pool.query('SELECT id FROM users WHERE login_id = $1', [loginId]);
      if (existing.rows.length === 0) break;
      loginId = `${base}${suffix++}`;
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (login_id, password_hash, full_name, role, employee_id, company_id, must_reset_password, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING id, login_id, full_name, role, employee_id, company_id, is_active, created_at`,
      [loginId, passwordHash, full_name, role, employee_id || null, targetCompanyId, req.user.id]
    );

    res.status(201).json({ ...result.rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error creating user' });
  }
}

// Helper: checks whether the requesting user is allowed to act on the target user
async function canManage(req, targetUserId) {
  const target = await pool.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
  if (target.rows.length === 0) return { allowed: false, target: null };
  if (req.user.role === 'super_admin') return { allowed: true, target: target.rows[0] };
  return { allowed: target.rows[0].company_id === req.user.company_id, target: target.rows[0] };
}

// PUT /api/users/:id/deactivate  (Super Admin, Company Head - own company only)
async function deactivateUser(req, res) {
  const { id } = req.params;
  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  try {
    const { allowed, target } = await canManage(req, id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!allowed) return res.status(403).json({ error: 'You do not have permission to manage this user' });

    const result = await pool.query(
      'UPDATE users SET is_active = false, updated_at = now() WHERE id = $1 RETURNING id, login_id, full_name, is_active',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Deactivate user error:', err);
    res.status(500).json({ error: 'Server error deactivating user' });
  }
}

// PUT /api/users/:id/reactivate  (Super Admin, Company Head - own company only)
async function reactivateUser(req, res) {
  const { id } = req.params;
  try {
    const { allowed, target } = await canManage(req, id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!allowed) return res.status(403).json({ error: 'You do not have permission to manage this user' });

    const result = await pool.query(
      'UPDATE users SET is_active = true, updated_at = now() WHERE id = $1 RETURNING id, login_id, full_name, is_active',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reactivate user error:', err);
    res.status(500).json({ error: 'Server error reactivating user' });
  }
}

// PUT /api/users/:id/reset-password  (Super Admin, Company Head - own company only)
async function adminResetPassword(req, res) {
  const { id } = req.params;
  try {
    const { allowed, target } = await canManage(req, id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!allowed) return res.status(403).json({ error: 'You do not have permission to manage this user' });

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, must_reset_password = true, updated_at = now()
       WHERE id = $2 RETURNING id, login_id, full_name`,
      [passwordHash, id]
    );
    res.json({ ...result.rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
}

module.exports = { listUsers, createUser, deactivateUser, reactivateUser, adminResetPassword };
