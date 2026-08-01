const pool = require('../config/db');

// POST /api/dpr  (Admin, Supervisor for their project)
async function createDPR(req, res) {
  const { project_id, report_date, work_summary, weather, manpower_count, notes } = req.body;
  if (!project_id || !work_summary) {
    return res.status(400).json({ error: 'project_id and work_summary are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO dpr_entries (project_id, report_date, work_summary, weather, manpower_count, notes, submitted_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, report_date || null, work_summary, weather || null, manpower_count || null, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A DPR already exists for this project on this date' });
    }
    console.error('Create DPR error:', err);
    res.status(500).json({ error: 'Server error creating DPR' });
  }
}

// GET /api/dpr?project_id=&from_date=&to_date=
async function listDPRs(req, res) {
  const { project_id, from_date, to_date } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (project_id) { conditions.push(`d.project_id = $${i++}`); values.push(project_id); }
  if (from_date) { conditions.push(`d.report_date >= $${i++}`); values.push(from_date); }
  if (to_date) { conditions.push(`d.report_date <= $${i++}`); values.push(to_date); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, u.full_name AS submitted_by_name,
              (SELECT COUNT(*) FROM dpr_photos WHERE dpr_id = d.id) AS photo_count
       FROM dpr_entries d
       JOIN projects p ON p.id = d.project_id
       LEFT JOIN users u ON u.id = d.submitted_by
       ${whereClause}
       ORDER BY d.report_date DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List DPRs error:', err);
    res.status(500).json({ error: 'Server error fetching DPRs' });
  }
}

// GET /api/dpr/:id  (includes photos)
async function getDPR(req, res) {
  const { id } = req.params;
  try {
    const dpr = await pool.query(
      `SELECT d.*, p.name AS project_name, u.full_name AS submitted_by_name
       FROM dpr_entries d
       JOIN projects p ON p.id = d.project_id
       LEFT JOIN users u ON u.id = d.submitted_by
       WHERE d.id = $1`,
      [id]
    );
    if (dpr.rows.length === 0) return res.status(404).json({ error: 'DPR not found' });

    const photos = await pool.query(
      'SELECT * FROM dpr_photos WHERE dpr_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({ ...dpr.rows[0], photos: photos.rows });
  } catch (err) {
    console.error('Get DPR error:', err);
    res.status(500).json({ error: 'Server error fetching DPR' });
  }
}


// POST /api/dpr/:id/photos  (Admin, Supervisor) - accepts multiple files at once
async function addPhotos(req, res) {
  const { id } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'At least one photo is required' });
  }

  try {
    const inserted = [];
    for (const file of req.files) {
      const imagePath = `/uploads/dpr-photos/${file.filename}`;
      const result = await pool.query(
        `INSERT INTO dpr_photos (dpr_id, image_path, uploaded_by) VALUES ($1, $2, $3) RETURNING *`,
        [id, imagePath, req.user.id]
      );
      inserted.push(result.rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Add DPR photos error:', err);
    res.status(500).json({ error: 'Server error uploading photos' });
  }
}

// DELETE /api/dpr/photos/:photoId  (Admin only)
async function deletePhoto(req, res) {
  const { photoId } = req.params;
  try {
    const result = await pool.query('DELETE FROM dpr_photos WHERE id = $1 RETURNING *', [photoId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Photo not found' });
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('Delete DPR photo error:', err);
    res.status(500).json({ error: 'Server error deleting photo' });
  }
}

module.exports = { createDPR, listDPRs, getDPR, addPhotos, deletePhoto };


