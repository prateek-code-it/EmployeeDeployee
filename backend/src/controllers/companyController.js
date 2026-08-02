const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');

// GET /api/companies  (Super Admin only)
async function listCompanies(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM employees WHERE company_id = c.id) AS employee_count,
              (SELECT COUNT(*) FROM projects WHERE company_id = c.id) AS project_count
       FROM companies c
       ORDER BY c.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: 'Server error fetching companies' });
  }
}

// POST /api/companies  (Super Admin only)
// Creates a company AND its first Company Head account in one step.
async function createCompany(req, res) {
  const { company_name, head_full_name } = req.body;

  if (!company_name || !head_full_name) {
    return res.status(400).json({ error: 'company_name and head_full_name are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const companyResult = await client.query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING *',
      [company_name]
    );
    const company = companyResult.rows[0];

    const base = head_full_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    let loginId = base;
    let suffix = 1;
    while (true) {
      const existing = await client.query('SELECT id FROM users WHERE login_id = $1', [loginId]);
      if (existing.rows.length === 0) break;
      loginId = `${base}${suffix++}`;
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const userResult = await client.query(
      `INSERT INTO users (login_id, password_hash, full_name, role, company_id, must_reset_password, created_by)
       VALUES ($1, $2, $3, 'company_head', $4, true, $5)
       RETURNING id, login_id, full_name, role, company_id`,
      [loginId, passwordHash, head_full_name, company.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      company,
      company_head: { ...userResult.rows[0], temp_password: tempPassword },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Server error creating company' });
  } finally {
    client.release();
  }
}

// PUT /api/companies/:id/deactivate  (Super Admin only)
async function deactivateCompany(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE companies SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Deactivate company error:', err);
    res.status(500).json({ error: 'Server error deactivating company' });
  }
}

module.exports = { listCompanies, createCompany, deactivateCompany };

