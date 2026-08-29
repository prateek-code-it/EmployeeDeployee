const pool = require('../config/db');

async function verifyProjectAccess(projectId, req) {
  const result = await pool.query('SELECT company_id FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Project not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this project' };
  }
  return { ok: true };
}

// POST /api/purchase/requests  (Admin, Supervisor for their project)
async function createPR(req, res) {
  const { project_id, description, estimated_cost } = req.body;
  if (!project_id || !description) {
    return res.status(400).json({ error: 'project_id and description are required' });
  }
  try {
    const access = await verifyProjectAccess(project_id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const result = await pool.query(
      `INSERT INTO purchase_requests (project_id, description, estimated_cost, requested_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, description, estimated_cost || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create PR error:', err);
    res.status(500).json({ error: 'Server error creating purchase request' });
  }
}

// GET /api/purchase/requests?project_id=&status=
async function listPRs(req, res) {
  const { project_id, status } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role !== 'super_admin') {
    conditions.push(`p.company_id = $${i++}`);
    values.push(req.user.company_id);
  }
  if (project_id) { conditions.push(`pr.project_id = $${i++}`); values.push(project_id); }
  if (status) { conditions.push(`pr.status = $${i++}`); values.push(status); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT pr.*, p.name AS project_name, u.full_name AS requested_by_name, rv.full_name AS reviewed_by_name
       FROM purchase_requests pr
       JOIN projects p ON p.id = pr.project_id
       LEFT JOIN users u ON u.id = pr.requested_by
       LEFT JOIN users rv ON rv.id = pr.reviewed_by
       ${whereClause}
       ORDER BY pr.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List PRs error:', err);
    res.status(500).json({ error: 'Server error fetching purchase requests' });
  }
}

async function verifyPRAccess(prId, req) {
  const result = await pool.query(
    `SELECT p.company_id FROM purchase_requests pr JOIN projects p ON p.id = pr.project_id WHERE pr.id = $1`,
    [prId]
  );
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Purchase request not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this request' };
  }
  return { ok: true };
}

// POST /api/purchase/requests/:id/approve  (Admin only)
async function approvePR(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyPRAccess(id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const result = await pool.query(
      `UPDATE purchase_requests SET status = 'approved', reviewed_by = $1, reviewed_at = now()
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [req.user.id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Approve PR error:', err);
    res.status(500).json({ error: 'Server error approving purchase request' });
  }
}

// POST /api/purchase/requests/:id/reject  (Admin only)
async function rejectPR(req, res) {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  try {
    const access = await verifyPRAccess(id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const result = await pool.query(
      `UPDATE purchase_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2
       WHERE id = $3 AND status = 'pending' RETURNING *`,
      [req.user.id, rejection_reason || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pending request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reject PR error:', err);
    res.status(500).json({ error: 'Server error rejecting purchase request' });
  }
}

// POST /api/purchase/orders  (Admin only)
async function createPO(req, res) {
  const { pr_id, project_id, vendor_id, po_number, description, amount } = req.body;
  if (!project_id || !vendor_id || !description || !amount) {
    return res.status(400).json({ error: 'project_id, vendor_id, description, and amount are required' });
  }

  const access = await verifyProjectAccess(project_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO purchase_orders (pr_id, project_id, vendor_id, po_number, description, amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [pr_id || null, project_id, vendor_id, po_number || null, description, amount, req.user.id]
    );
    if (pr_id) {
      await client.query("UPDATE purchase_requests SET status = 'converted' WHERE id = $1", [pr_id]);
    }
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'PO number already exists' });
    console.error('Create PO error:', err);
    res.status(500).json({ error: 'Server error creating purchase order' });
  } finally {
    client.release();
  }
}

// GET /api/purchase/orders?project_id=&status=&vendor_id=
async function listPOs(req, res) {
  const { project_id, status, vendor_id } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role !== 'super_admin') {
    conditions.push(`p.company_id = $${i++}`);
    values.push(req.user.company_id);
  }
  if (project_id) { conditions.push(`po.project_id = $${i++}`); values.push(project_id); }
  if (status) { conditions.push(`po.status = $${i++}`); values.push(status); }
  if (vendor_id) { conditions.push(`po.vendor_id = $${i++}`); values.push(vendor_id); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT po.*, p.name AS project_name, v.name AS vendor_name, u.full_name AS created_by_name
       FROM purchase_orders po
       JOIN projects p ON p.id = po.project_id
       JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN users u ON u.id = po.created_by
       ${whereClause}
       ORDER BY po.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List POs error:', err);
    res.status(500).json({ error: 'Server error fetching purchase orders' });
  }
}

// GET /api/purchase/orders/:id  (includes GRNs against this PO)
async function getPO(req, res) {
  const { id } = req.params;
  try {
    const po = await pool.query(
      `SELECT po.*, p.name AS project_name, p.company_id AS project_company_id, v.name AS vendor_name
       FROM purchase_orders po
       JOIN projects p ON p.id = po.project_id
       JOIN vendors v ON v.id = po.vendor_id
       WHERE po.id = $1`,
      [id]
    );
    if (po.rows.length === 0) return res.status(404).json({ error: 'Purchase order not found' });
    const order = po.rows[0];
    if (req.user.role !== 'super_admin' && order.project_company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to view this purchase order' });
    }
    delete order.project_company_id;

    const grns = await pool.query(
      `SELECT g.*, u.full_name AS received_by_name FROM grns g
       LEFT JOIN users u ON u.id = g.received_by WHERE g.po_id = $1 ORDER BY g.received_date DESC`,
      [id]
    );

    res.json({ ...order, grns: grns.rows });
  } catch (err) {
    console.error('Get PO error:', err);
    res.status(500).json({ error: 'Server error fetching purchase order' });
  }
}

async function verifyPOAccess(poId, req) {
  const result = await pool.query(
    `SELECT p.company_id FROM purchase_orders po JOIN projects p ON p.id = po.project_id WHERE po.id = $1`,
    [poId]
  );
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Purchase order not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this purchase order' };
  }
  return { ok: true };
}

// POST /api/purchase/grn  (Admin, Supervisor)
async function createGRN(req, res) {
  const { po_id, received_date, description, notes } = req.body;
  if (!po_id || !description) {
    return res.status(400).json({ error: 'po_id and description are required' });
  }

  const access = await verifyPOAccess(po_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO grns (po_id, received_date, description, notes, received_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5) RETURNING *`,
      [po_id, received_date || null, description, notes || null, req.user.id]
    );
    await client.query(
      "UPDATE purchase_orders SET status = 'partially_received' WHERE id = $1 AND status = 'open'",
      [po_id]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create GRN error:', err);
    res.status(500).json({ error: 'Server error creating GRN' });
  } finally {
    client.release();
  }
}

// PUT /api/purchase/orders/:id/close  (Admin only)
async function closePO(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyPOAccess(id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const result = await pool.query(
      "UPDATE purchase_orders SET status = 'closed' WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Close PO error:', err);
    res.status(500).json({ error: 'Server error closing purchase order' });
  }
}

module.exports = {
  createPR, listPRs, approvePR, rejectPR,
  createPO, listPOs, getPO, closePO,
  createGRN,
};
