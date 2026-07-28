const pool = require('../config/db');

// POST /api/employee-requests  (Supervisor only)
async function createRequest(req, res) {
  const { full_name, phone, trade_role, monthly_salary, project_id } = req.body;

  if (!full_name || monthly_salary === undefined) {
    return res.status(400).json({ error: 'full_name and monthly_salary are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employee_requests (requested_by, full_name, phone, trade_role, monthly_salary, project_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, full_name, phone || null, trade_role || null, monthly_salary, project_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create employee request error:', err);
    res.status(500).json({ error: 'Server error creating employee request' });
  }
}

// GET /api/employee-requests?status=
// Admin sees all. Supervisor sees only their own requests.
async function listRequests(req, res) {
  const { status } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role === 'supervisor') {
    conditions.push(`er.requested_by = $${i++}`);
    values.push(req.user.id);
  }
  if (status) {
    conditions.push(`er.status = $${i++}`);
    values.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT er.*, u.full_name AS requested_by_name, p.name AS project_name,
              rv.full_name AS reviewed_by_name
       FROM employee_requests er
       LEFT JOIN users u ON u.id = er.requested_by
       LEFT JOIN projects p ON p.id = er.project_id
       LEFT JOIN users rv ON rv.id = er.reviewed_by
       ${whereClause}
       ORDER BY er.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List employee requests error:', err);
    res.status(500).json({ error: 'Server error fetching employee requests' });
  }
}

// POST /api/employee-requests/:id/approve  (Admin only)
// Creates the actual employee record, assigns to the requested project (if any),
// and marks the request approved.
async function approveRequest(req, res) {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqResult = await client.query(
      "SELECT * FROM employee_requests WHERE id = $1 AND status = 'pending' FOR UPDATE",
      [id]
    );
    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }
    const request = reqResult.rows[0];

    const empResult = await client.query(
      `INSERT INTO employees (full_name, phone, trade_role, monthly_salary)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [request.full_name, request.phone, request.trade_role, request.monthly_salary]
    );
    const employee = empResult.rows[0];

    if (request.project_id) {
      await client.query(
        `INSERT INTO project_employees (project_id, employee_id) VALUES ($1, $2)`,
        [request.project_id, employee.id]
      );
    }

    await client.query(
      `UPDATE employee_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = now()
       WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Request approved, employee created', employee });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve request error:', err);
    res.status(500).json({ error: 'Server error approving request' });
  } finally {
    client.release();
  }
}

// POST /api/employee-requests/:id/reject  (Admin only)
async function rejectRequest(req, res) {
  const { id } = req.params;
  const { rejection_reason } = req.body;

  try {
    const result = await pool.query(
      `UPDATE employee_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2
       WHERE id = $3 AND status = 'pending' RETURNING *`,
      [req.user.id, rejection_reason || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    res.json({ message: 'Request rejected', request: result.rows[0] });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Server error rejecting request' });
  }
}

module.exports = { createRequest, listRequests, approveRequest, rejectRequest };
