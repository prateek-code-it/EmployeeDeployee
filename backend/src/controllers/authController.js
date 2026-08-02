const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth/login
async function login(req, res) {
  const { login_id, password } = req.body;

  if (!login_id || !password) {
    return res.status(400).json({ error: 'login_id and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE login_id = $1 AND is_active = true',
      [login_id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid login ID or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        login_id: user.login_id,
        role: user.role,
        employee_id: user.employee_id,
        full_name: user.full_name,
        company_id: user.company_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        login_id: user.login_id,
        full_name: user.full_name,
        role: user.role,
        employee_id: user.employee_id,
        must_reset_password: user.must_reset_password,
        company_id: user.company_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
}

// POST /api/auth/reset-password  (for first-login forced reset, or voluntary change)
async function resetPassword(req, res) {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    const matches = await bcrypt.compare(current_password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2',
      [newHash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, resetPassword, me };
