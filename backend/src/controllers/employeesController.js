const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');

async function generateEmpCode(client, companyId) {
  let seq = 1;
  while (true) {
    const code = `EMP-${String(seq).padStart(4, '0')}`;
    const existing = await client.query(
      'SELECT id FROM employees WHERE company_id = $1 AND emp_code = $2',
      [companyId, code]
    );
    if (existing.rows.length === 0) return code;
    seq++;
  }
}

async function generateLoginId(client, base) {
  let loginId = base;
  let suffix = 1;
  while (true) {
    const existing = await client.query('SELECT id FROM users WHERE login_id = $1', [loginId]);
    if (existing.rows.length === 0) return loginId;
    loginId = `${base}${suffix++}`;
  }
}

// GET /api/employees
async function listEmployees(req, res) {
  try {
    const baseQuery = `
      SELECT e.*, po.name AS post_name
      FROM employees e
      LEFT JOIN posts po ON po.id = e.post_id
    `;

    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query(`${baseQuery} WHERE e.company_id = $1 ORDER BY e.full_name ASC`, [company_id]);
        return res.json(result.rows);
      }
      const result = await pool.query(`${baseQuery} ORDER BY e.full_name ASC`);
      return res.json(result.rows);
    }

    if (req.user.role === 'company_head') {
      const result = await pool.query(`${baseQuery} WHERE e.company_id = $1 ORDER BY e.full_name ASC`, [req.user.company_id]);
      return res.json(result.rows);
    }

    if (req.user.role === 'supervisor') {
      const result = await pool.query(
        `SELECT DISTINCT e.*, po.name AS post_name
         FROM employees e
         LEFT JOIN posts po ON po.id = e.post_id
         JOIN project_employees pe ON pe.employee_id = e.id
         JOIN projects p ON p.id = pe.project_id
         WHERE pe.removed_date IS NULL AND e.company_id = $1
         ORDER BY e.full_name ASC`,
        [req.user.company_id]
      );
      return res.json(result.rows);
    }

    return res.status(403).json({ error: 'You do not have permission to view this' });
  } catch (err) {
    console.error('List employees error:', err);
    res.status(500).json({ error: 'Server error fetching employees' });
  }
}

// GET /api/employees/:id
async function getEmployee(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT e.*, po.name AS post_name FROM employees e
       LEFT JOIN posts po ON po.id = e.post_id
       WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const employee = result.rows[0];

    if (req.user.role !== 'super_admin' && employee.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to view this employee' });
    }

    res.json(employee);
  } catch (err) {
    console.error('Get employee error:', err);
    res.status(500).json({ error: 'Server error fetching employee' });
  }
}

// POST /api/employees  (Super Admin, Company Head, Supervisor)
// Creates the employee record AND a login account automatically (role='employee').
async function createEmployee(req, res) {
  const { full_name, phone, email, trade_role, post_id, monthly_salary, company_id } = req.body;

  if (!full_name || monthly_salary === undefined) {
    return res.status(400).json({ error: 'full_name and monthly_salary are required' });
  }

  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required when creating an employee as Super Admin' });
    }
    targetCompanyId = company_id;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const empCode = await generateEmpCode(client, targetCompanyId);

    const empResult = await client.query(
      `INSERT INTO employees (full_name, phone, email, trade_role, post_id, monthly_salary, company_id, emp_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [full_name, phone || null, email || null, trade_role || null, post_id || null, monthly_salary, targetCompanyId, empCode]
    );
    const employee = empResult.rows[0];

    // Auto-create a login account for this employee
    const loginBase = empCode.toLowerCase().replace('-', '');
    const loginId = await generateLoginId(client, loginBase);
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const userResult = await client.query(
      `INSERT INTO users (login_id, password_hash, full_name, role, employee_id, company_id, must_reset_password, created_by)
       VALUES ($1, $2, $3, 'employee', $4, $5, true, $6)
       RETURNING id, login_id`,
      [loginId, passwordHash, full_name, employee.id, targetCompanyId, req.user.id]
    );

    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('employees', $1, 'create', $2, $3)`,
      [employee.id, req.user.id, JSON.stringify({ full_name, monthly_salary })]
    );

    await client.query('COMMIT');
    res.status(201).json({
      ...employee,
      login: { login_id: userResult.rows[0].login_id, temp_password: tempPassword },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error creating employee' });
  } finally {
    client.release();
  }
}

// PUT /api/employees/:id  (Super Admin, Company Head)
async function updateEmployee(req, res) {
  const { id } = req.params;
  const { full_name, phone, email, trade_role, post_id, monthly_salary, is_active } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (req.user.role !== 'super_admin' && existing.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to edit this employee' });
    }

    const result = await pool.query(
      `UPDATE employees
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           trade_role = COALESCE($4, trade_role),
           post_id = COALESCE($5, post_id),
           monthly_salary = COALESCE($6, monthly_salary),
           is_active = COALESCE($7, is_active),
           updated_at = now()
       WHERE id = $8 RETURNING *`,
      [full_name, phone, email, trade_role, post_id, monthly_salary, is_active, id]
    );

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('employees', $1, 'update', $2, $3)`,
      [id, req.user.id, JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Server error updating employee' });
  }
}

// DELETE /api/employees/:id  (Super Admin, Company Head - soft delete)
async function deactivateEmployee(req, res) {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (req.user.role !== 'super_admin' && existing.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to deactivate this employee' });
    }

    const result = await pool.query(
      `UPDATE employees SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );

    await pool.query('UPDATE users SET is_active = false WHERE employee_id = $1', [id]);

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('employees', $1, 'update', $2, $3)`,
      [id, req.user.id, JSON.stringify({ action: 'deactivated' })]
    );

    res.json({ message: 'Employee deactivated', employee: result.rows[0] });
  } catch (err) {
    console.error('Deactivate employee error:', err);
    res.status(500).json({ error: 'Server error deactivating employee' });
  }
}

module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, deactivateEmployee };
