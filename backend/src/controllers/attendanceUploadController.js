const pool = require('../config/db');

async function verifySiteAccess(siteId, req) {
  const result = await pool.query('SELECT company_id FROM sites WHERE id = $1', [siteId]);
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Site not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this site' };
  }
  return { ok: true };
}

// POST /api/attendance-uploads  (Admin, Supervisor)
async function createUpload(req, res) {
  const { site_id, upload_date, notes } = req.body;
  if (!site_id) {
    return res.status(400).json({ error: 'site_id is required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'A file (image or PDF) is required' });
  }

  const access = await verifySiteAccess(site_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  const filePath = `/uploads/attendance-sheets/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO attendance_uploads (site_id, upload_date, file_path, file_type, notes, uploaded_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6) RETURNING *`,
      [site_id, upload_date || null, filePath, fileType, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create attendance upload error:', err);
    res.status(500).json({ error: 'Server error uploading attendance sheet' });
  }
}

// GET /api/attendance-uploads?site_id=&from_date=&to_date=
async function listUploads(req, res) {
  const { site_id, from_date, to_date } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role !== 'super_admin') {
    conditions.push(`s.company_id = $${i++}`);
    values.push(req.user.company_id);
  }
  if (site_id) { conditions.push(`au.site_id = $${i++}`); values.push(site_id); }
  if (from_date) { conditions.push(`au.upload_date >= $${i++}`); values.push(from_date); }
  if (to_date) { conditions.push(`au.upload_date <= $${i++}`); values.push(to_date); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT au.*, s.name AS site_name, u.full_name AS uploaded_by_name
       FROM attendance_uploads au
       JOIN sites s ON s.id = au.site_id
       LEFT JOIN users u ON u.id = au.uploaded_by
       ${whereClause}
       ORDER BY au.upload_date DESC, au.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List attendance uploads error:', err);
    res.status(500).json({ error: 'Server error fetching attendance uploads' });
  }
}

module.exports = { createUpload, listUploads };
