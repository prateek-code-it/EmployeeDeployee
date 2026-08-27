const pool = require('../config/db');

async function verifyProjectAccess(projectId, req) {
  const result = await pool.query('SELECT company_id FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Project not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this project' };
  }
  return { ok: true };
}

// POST /api/attendance
async function markAttendance(req, res) {
  const { employee_id, project_id, attendance_date, status } = req.body;

  if (!employee_id || !project_id || !attendance_date || !status) {
    return res.status(400).json({ error: 'employee_id, project_id, attendance_date, and status are required' });
  }

  const validStatuses = ['present', 'absent', 'half_day', 'leave'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const access = await verifyProjectAccess(project_id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const result = await pool.query(
      `INSERT INTO attendance (employee_id, project_id, attendance_date, status, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, project_id, attendance_date)
       DO UPDATE SET status = $4, marked_by = $5
       RETURNING *`,
      [employee_id, project_id, attendance_date, status, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Server error marking attendance' });
  }
}

// POST /api/attendance/bulk
async function markAttendanceBulk(req, res) {
  const { project_id, attendance_date, entries } = req.body;

  if (!project_id || !attendance_date || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'project_id, attendance_date, and a non-empty entries array are required' });
  }

  const access = await verifyProjectAccess(project_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const validStatuses = ['present', 'absent', 'half_day', 'leave'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];

    for (const entry of entries) {
      if (!entry.employee_id || !validStatuses.includes(entry.status)) {
        throw new Error(`Invalid entry: ${JSON.stringify(entry)}`);
      }
      const result = await client.query(
        `INSERT INTO attendance (employee_id, project_id, attendance_date, status, marked_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (employee_id, project_id, attendance_date)
         DO UPDATE SET status = $4, marked_by = $5
         RETURNING *`,
        [entry.employee_id, project_id, attendance_date, entry.status, req.user.id]
      );
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk mark attendance error:', err);
    res.status(400).json({ error: err.message || 'Server error marking bulk attendance' });
  } finally {
    client.release();
  }
}

// GET /api/attendance?project_id=&employee_id=&from_date=&to_date=
async function listAttendance(req, res) {
  const { project_id, employee_id, from_date, to_date } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role !== 'super_admin') {
    conditions.push(`p.company_id = $${i++}`);
    values.push(req.user.company_id);
  }
  if (project_id) {
    conditions.push(`a.project_id = $${i++}`);
    values.push(project_id);
  }
  if (employee_id) {
    conditions.push(`a.employee_id = $${i++}`);
    values.push(employee_id);
  }
  if (from_date) {
    conditions.push(`a.attendance_date >= $${i++}`);
    values.push(from_date);
  }
  if (to_date) {
    conditions.push(`a.attendance_date <= $${i++}`);
    values.push(to_date);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT a.*, e.full_name AS employee_name, p.name AS project_name
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       JOIN projects p ON p.id = a.project_id
       ${whereClause}
       ORDER BY a.attendance_date DESC, e.full_name ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List attendance error:', err);
    res.status(500).json({ error: 'Server error fetching attendance' });
  }
}

// GET /api/attendance/summary?employee_id=&month=&year=
async function attendanceSummary(req, res) {
  const { employee_id, month, year } = req.query;

  if (!employee_id || !month || !year) {
    return res.status(400).json({ error: 'employee_id, month, and year are required' });
  }

  try {
    if (req.user.role !== 'super_admin') {
      const empCheck = await pool.query('SELECT company_id FROM employees WHERE id = $1', [employee_id]);
      if (empCheck.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
      if (empCheck.rows[0].company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'You do not have permission to view this employee' });
      }
    }

    const result = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM attendance
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM attendance_date) = $2
         AND EXTRACT(YEAR FROM attendance_date) = $3
       GROUP BY status`,
      [employee_id, month, year]
    );

    const summary = { present: 0, absent: 0, half_day: 0, leave: 0 };
    result.rows.forEach((row) => {
      summary[row.status] = parseInt(row.count, 10);
    });

    res.json(summary);
  } catch (err) {
    console.error('Attendance summary error:', err);
    res.status(500).json({ error: 'Server error fetching attendance summary' });
  }
}

module.exports = { markAttendance, markAttendanceBulk, listAttendance, attendanceSummary };
