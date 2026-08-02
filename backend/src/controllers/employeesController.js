const pool = require('../config/db');

// GET /api/employees
// Super Admin sees all (or filters by ?company_id=). Company Head sees their own company.
// Supervisor sees only employees assigned to their projects, within their company.
async function listEmployees(req, res) {
  try {
    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query(
          'SELECT * FROM employees WHERE company_id = $1 ORDER BY full_name ASC',
          [company_id]
        );
        return res.json(result.rows);
      }
      const result = await pool.query('SELECT * FROM employees ORDER BY full_name ASC');
      return res.json(result.rows);
    }

    if (req.user.role === 'company_head') {
      const result = await pool.query(
        'SELECT * FROM employees WHERE company_id = $1 ORDER BY full_name ASC',
        [req.user.company_id]
      );
      return res.json(result.rows);
    }

    if (req.user.role === 'supervisor') {
      const result = await pool.query(
        `SELECT DISTINCT e.*
         FROM employees e
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
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
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

// POST /api/employees  (Super Admin, Company Head, or Supervisor)
async function createEmployee(req, res) {
  const { full_name, phone, trade_role, monthly_salary, company_id } = req.body;

  if (!full_name || monthly_salary === undefined) {
    return res.status(400).json({ error: 'full_name and monthly_salary are required' });
  }

  // Super Admin must specify which company; everyone else uses their own company automatically.
  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required when creating an employee as Super Admin' });
    }
    targetCompanyId = company_id;
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees (full_name, phone, trade_role, monthly_salary, company_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [full_name, phone || null, trade_role || null, monthly_salary, targetCompanyId]
    );

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('employees', $1, 'create', $2, $3)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ full_name, monthly_salary })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error creating employee' });
  }
}

// PUT /api/employees/:id  (Super Admin, Company Head)
async function updateEmployee(req, res) {
  const { id } = req.params;
  const { full_name, phone, trade_role, monthly_salary, is_active } = req.body;

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
           trade_role = COALESCE($3, trade_role),
           monthly_salary = COALESCE($4, monthly_salary),
           is_active = COALESCE($5, is_active),
           updated_at = now()
       WHERE id = $6 RETURNING *`,
      [full_name, phone, trade_role, monthly_salary, is_active, id]
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
