const pool = require('../config/db');

// GET /api/audit-log?table_name=&record_id=&changed_by=
// Super Admin sees all (or filters by ?company_id=). Company Head sees only their own company.
async function listAuditLog(req, res) {
  const { table_name, record_id, changed_by, company_id } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role === 'super_admin') {
    if (company_id) {
      conditions.push(`u.company_id = $${i++}`);
      values.push(company_id);
    }
  } else {
    conditions.push(`u.company_id = $${i++}`);
    values.push(req.user.company_id);
  }

  if (table_name) {
    conditions.push(`al.table_name = $${i++}`);
    values.push(table_name);
  }
  if (record_id) {
    conditions.push(`al.record_id = $${i++}`);
    values.push(record_id);
  }
  if (changed_by) {
    conditions.push(`al.changed_by = $${i++}`);
    values.push(changed_by);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT al.*, u.full_name AS changed_by_name
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.changed_by
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT 200`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List audit log error:', err);
    res.status(500).json({ error: 'Server error fetching audit log' });
  }
}

module.exports = { listAuditLog };
