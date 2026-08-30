const pool = require('../config/db');

async function verifyProjectAccess(projectId, req) {
  const result = await pool.query('SELECT company_id FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Project not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this project' };
  }
  return { ok: true };
}

async function verifyBOQItemAccess(itemId, req) {
  const result = await pool.query(
    `SELECT p.company_id FROM boq_items b JOIN projects p ON p.id = b.project_id WHERE b.id = $1`,
    [itemId]
  );
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'BOQ item not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this BOQ item' };
  }
  return { ok: true };
}

// POST /api/boq  (Admin, Supervisor for their project)
async function createBOQItem(req, res) {
  const { project_id, item_no, description, unit, quantity, rate } = req.body;
  if (!project_id || !description) {
    return res.status(400).json({ error: 'project_id and description are required' });
  }

  const access = await verifyProjectAccess(project_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

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

  const access = await verifyProjectAccess(project_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

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

  const access = await verifyBOQItemAccess(id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
      `UPDATE boq_items SET
        item_no = COALESCE($1, item_no), description = COALESCE($2, description),
        unit = COALESCE($3, unit), quantity = COALESCE($4, quantity), rate = COALESCE($5, rate),
        updated_at = now()
       WHERE id = $6 RETURNING *, (quantity * rate) AS amount`,
      [item_no, description, unit, quantity, rate, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update BOQ item error:', err);
    res.status(500).json({ error: 'Server error updating BOQ item' });
  }
}

// DELETE /api/boq/:id  (Admin only)
async function deleteBOQItem(req, res) {
  const { id } = req.params;

  const access = await verifyBOQItemAccess(id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    await pool.query('DELETE FROM boq_items WHERE id = $1', [id]);
    res.json({ message: 'BOQ item deleted' });
  } catch (err) {
    console.error('Delete BOQ item error:', err);
    res.status(500).json({ error: 'Server error deleting BOQ item' });
  }
}

module.exports = { createBOQItem, listBOQItems, updateBOQItem, deleteBOQItem };
