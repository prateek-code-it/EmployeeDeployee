const pool = require('../config/db');

// GET /api/audit-log?table_name=&record_id=&changed_by=
// Admin only. Returns the audit trail, most recent first.
async function listAuditLog(req, res) {
  const { table_name, record_id, changed_by } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

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
