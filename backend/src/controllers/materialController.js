const pool = require('../config/db');

// GET /api/materials  (catalog - all material types)
async function listMaterials(req, res) {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('List materials error:', err);
    res.status(500).json({ error: 'Server error fetching materials' });
  }
}

// POST /api/materials  (Admin only) - add a new material type to the catalog
async function createMaterial(req, res) {
  const { name, unit, category } = req.body;
  if (!name || !unit) {
    return res.status(400).json({ error: 'name and unit are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO materials (name, unit, category) VALUES ($1, $2, $3) RETURNING *',
      [name, unit, category || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A material with this name already exists' });
    }
    console.error('Create material error:', err);
    res.status(500).json({ error: 'Server error creating material' });
  }
}

// POST /api/materials/receipts  (Admin, or Supervisor for their own project)
async function createReceipt(req, res) {
  const { project_id, material_id, quantity, vendor_name, receipt_date, notes } = req.body;
  if (!project_id || !material_id || !quantity) {
    return res.status(400).json({ error: 'project_id, material_id, and quantity are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO material_receipts (project_id, material_id, quantity, vendor_name, receipt_date, notes, received_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7) RETURNING *`,
      [project_id, material_id, quantity, vendor_name || null, receipt_date || null, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create receipt error:', err);
    res.status(500).json({ error: 'Server error creating receipt' });
  }
}

// GET /api/materials/receipts?project_id=&material_id=
async function listReceipts(req, res) {
  const { project_id, material_id } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (project_id) { conditions.push(`mr.project_id = $${i++}`); values.push(project_id); }
  if (material_id) { conditions.push(`mr.material_id = $${i++}`); values.push(material_id); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT mr.*, m.name AS material_name, m.unit, p.name AS project_name, u.full_name AS received_by_name
       FROM material_receipts mr
       JOIN materials m ON m.id = mr.material_id
       JOIN projects p ON p.id = mr.project_id
       LEFT JOIN users u ON u.id = mr.received_by
       ${whereClause}
       ORDER BY mr.receipt_date DESC, mr.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List receipts error:', err);
    res.status(500).json({ error: 'Server error fetching receipts' });
  }
}

// POST /api/materials/issues  (Admin, or Supervisor for their own project)
async function createIssue(req, res) {
  const { project_id, material_id, quantity, issued_to, issue_date, notes } = req.body;
  if (!project_id || !material_id || !quantity) {
    return res.status(400).json({ error: 'project_id, material_id, and quantity are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO material_issues (project_id, material_id, quantity, issued_to, issue_date, notes, issued_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7) RETURNING *`,
      [project_id, material_id, quantity, issued_to || null, issue_date || null, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create issue error:', err);
    res.status(500).json({ error: 'Server error creating issue' });
  }
}

// GET /api/materials/issues?project_id=&material_id=
async function listIssues(req, res) {
  const { project_id, material_id } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (project_id) { conditions.push(`mi.project_id = $${i++}`); values.push(project_id); }
  if (material_id) { conditions.push(`mi.material_id = $${i++}`); values.push(material_id); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT mi.*, m.name AS material_name, m.unit, p.name AS project_name, u.full_name AS issued_by_name
       FROM material_issues mi
       JOIN materials m ON m.id = mi.material_id
       JOIN projects p ON p.id = mi.project_id
       LEFT JOIN users u ON u.id = mi.issued_by
       ${whereClause}
       ORDER BY mi.issue_date DESC, mi.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List issues error:', err);
    res.status(500).json({ error: 'Server error fetching issues' });
  }
}

// GET /api/materials/stock?project_id=
// Current balance per material for a project: SUM(receipts) - SUM(issues)
async function getStock(req, res) {
  const { project_id } = req.query;
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  try {
    const result = await pool.query(
      `SELECT m.id AS material_id, m.name AS material_name, m.unit,
              COALESCE(r.total_in, 0) AS total_in,
              COALESCE(i.total_out, 0) AS total_out,
              COALESCE(r.total_in, 0) - COALESCE(i.total_out, 0) AS balance
       FROM materials m
       LEFT JOIN (
         SELECT material_id, SUM(quantity) AS total_in FROM material_receipts
         WHERE project_id = $1 GROUP BY material_id
       ) r ON r.material_id = m.id
       LEFT JOIN (
         SELECT material_id, SUM(quantity) AS total_out FROM material_issues
         WHERE project_id = $1 GROUP BY material_id
       ) i ON i.material_id = m.id
       WHERE r.total_in IS NOT NULL OR i.total_out IS NOT NULL
       ORDER BY m.name ASC`,
      [project_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get stock error:', err);
    res.status(500).json({ error: 'Server error fetching stock' });
  }
}

module.exports = {
  listMaterials, createMaterial, createReceipt, listReceipts,
  createIssue, listIssues, getStock,
};
