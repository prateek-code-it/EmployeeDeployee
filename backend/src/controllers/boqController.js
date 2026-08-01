const pool = require('../config/db');

// POST /api/boq  (Admin, Supervisor for their project)
async function createBOQItem(req, res) {
  const { project_id, item_no, description, unit, quantity, rate } = req.body;
  if (!project_id || !description) {
    return res.status(400).json({ error: 'project_id and description are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO boq_items (project_id, item_no, description, unit, quantity, rate, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [project_id, item_no || null, description, unit || null, quantity || 0, rate || 0, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create BOQ item error:', err);
    res.status(500).json({ error: 'Server error creating BOQ item' });
  }
}

// GET /api/boq?project_id=
async function listBOQItems(req, res) {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id is required' });

  try {
    const result = await pool.query(
      `SELECT *, (quantity * rate) AS amount FROM boq_items WHERE project_id = $1 ORDER BY item_no ASC, id ASC`,
      [project_id]
    );
    const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    res.json({ items: result.rows, total_amount: total });
  } catch (err) {
    console.error('List BOQ items error:', err);
    res.status(500).json({ error: 'Server error fetching BOQ items' });
  }
}

// PUT /api/boq/:id  (Admin, Supervisor)
async function updateBOQItem(req, res) {
  const { id } = req.params;
  const { item_no, description, unit, quantity, rate } = req.body;
  try {
    const result = await pool.query(
      `UPDATE boq_items SET
        item_no = COALESCE($1, item_no), description = COALESCE($2, description),
        unit = COALESCE($3, unit), quantity = COALESCE($4, quantity), rate = COALESCE($5, rate),
        updated_at = now()
       WHERE id = $6 RETURNING *, (quantity * rate) AS amount`,
      [item_no, description, unit, quantity, rate, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'BOQ item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update BOQ item error:', err);
    res.status(500).json({ error: 'Server error updating BOQ item' });
  }
}

// DELETE /api/boq/:id  (Admin only)
async function deleteBOQItem(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM boq_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'BOQ item not found' });
    res.json({ message: 'BOQ item deleted' });
  } catch (err) {
    console.error('Delete BOQ item error:', err);
    res.status(500).json({ error: 'Server error deleting BOQ item' });
  }
}

module.exports = { createBOQItem, listBOQItems, updateBOQItem, deleteBOQItem };

