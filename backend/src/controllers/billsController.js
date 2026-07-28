const pool = require('../config/db');

// GET /api/bills?project_id=&bill_type=&from_date=&to_date=
async function listBills(req, res) {
  const { project_id, bill_type, from_date, to_date } = req.query;

  const conditions = [];
  const values = [];
  let i = 1;

  if (project_id) {
    conditions.push(`b.project_id = $${i++}`);
    values.push(project_id);
  }
  if (bill_type) {
    conditions.push(`b.bill_type = $${i++}`);
    values.push(bill_type);
  }
  if (from_date) {
    conditions.push(`b.bill_date >= $${i++}`);
    values.push(from_date);
  }
  if (to_date) {
    conditions.push(`b.bill_date <= $${i++}`);
    values.push(to_date);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name, u.full_name AS created_by_name
       FROM bills b
       JOIN projects p ON p.id = b.project_id
       LEFT JOIN users u ON u.id = b.created_by
       ${whereClause}
       ORDER BY b.bill_date DESC, b.created_at DESC`,
      values
    );

    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(b.amount), 0) AS total
       FROM bills b
       ${whereClause}`,
      values
    );

    res.json({
      bills: result.rows,
      total_amount: parseFloat(totalResult.rows[0].total),
    });
  } catch (err) {
    console.error('List bills error:', err);
    res.status(500).json({ error: 'Server error fetching bills' });
  }
}

// GET /api/bills/:id
async function getBill(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT b.*, p.name AS project_name, u.full_name AS created_by_name
       FROM bills b
       JOIN projects p ON p.id = b.project_id
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Server error fetching bill' });
  }
}

// POST /api/bills  (Admin, or Supervisor for their own project)
// Uses multer - req.file will contain the uploaded image if provided
async function createBill(req, res) {
  const { project_id, bill_type, description, vendor_name, amount, bill_date, payment_status } = req.body;

  if (!project_id || !bill_type || !description || !amount) {
    return res.status(400).json({ error: 'project_id, bill_type, description, and amount are required' });
  }

  const validTypes = ['material', 'vendor', 'salary', 'misc'];
  if (!validTypes.includes(bill_type)) {
    return res.status(400).json({ error: `bill_type must be one of: ${validTypes.join(', ')}` });
  }

  const imagePath = req.file ? `/uploads/bills/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO bills (project_id, bill_type, description, vendor_name, amount, bill_date, payment_status, image_path, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), COALESCE($7, 'pending'), $8, $9, $9)
       RETURNING *`,
      [project_id, bill_type, description, vendor_name || null, amount, bill_date || null,
       payment_status || null, imagePath, req.user.id]
    );

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('bills', $1, 'create', $2, $3)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ bill_type, amount, project_id })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Server error creating bill' });
  }
}

// PUT /api/bills/:id
// Admin can always edit. Supervisor can only edit their own entries within 24 hours.
async function updateBill(req, res) {
  const { id } = req.params;
  const { description, vendor_name, amount, bill_date, payment_status, bill_type } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    const bill = existing.rows[0];

    if (req.user.role === 'supervisor') {
      const isOwner = bill.created_by === req.user.id;
      const hoursSinceCreated = (Date.now() - new Date(bill.created_at).getTime()) / (1000 * 60 * 60);
      if (!isOwner || hoursSinceCreated > 24) {
        return res.status(403).json({
          error: 'You can only edit your own bill entries within 24 hours. Ask an Admin to make this change.',
        });
      }
    }

    const imagePath = req.file ? `/uploads/bills/${req.file.filename}` : bill.image_path;

    const result = await pool.query(
      `UPDATE bills
       SET description = COALESCE($1, description),
           vendor_name = COALESCE($2, vendor_name),
           amount = COALESCE($3, amount),
           bill_date = COALESCE($4, bill_date),
           payment_status = COALESCE($5, payment_status),
           bill_type = COALESCE($6, bill_type),
           image_path = $7,
           updated_by = $8,
           updated_at = now()
       WHERE id = $9 RETURNING *`,
      [description, vendor_name, amount, bill_date, payment_status, bill_type, imagePath, req.user.id, id]
    );

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('bills', $1, 'update', $2, $3)`,
      [id, req.user.id, JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(500).json({ error: 'Server error updating bill' });
  }
}

// DELETE /api/bills/:id  (Admin only)
async function deleteBill(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM bills WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('bills', $1, 'delete', $2, $3)`,
      [id, req.user.id, JSON.stringify({ deleted_bill: result.rows[0].description })]
    );

    res.json({ message: 'Bill deleted' });
  } catch (err) {
    console.error('Delete bill error:', err);
    res.status(500).json({ error: 'Server error deleting bill' });
  }
}

module.exports = { listBills, getBill, createBill, updateBill, deleteBill };

