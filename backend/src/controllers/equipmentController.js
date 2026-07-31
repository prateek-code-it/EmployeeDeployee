const pool = require('../config/db');

// GET /api/equipment?project_id=&status=
async function listEquipment(req, res) {
  const { project_id, status } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (project_id) { conditions.push(`e.project_id = $${i++}`); values.push(project_id); }
  if (status) { conditions.push(`e.status = $${i++}`); values.push(status); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT e.*, p.name AS project_name
       FROM equipment e
       LEFT JOIN projects p ON p.id = e.project_id
       ${whereClause}
       ORDER BY e.name ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List equipment error:', err);
    res.status(500).json({ error: 'Server error fetching equipment' });
  }
}

// GET /api/equipment/:id  (includes fuel, maintenance, breakdown logs)
async function getEquipment(req, res) {
  const { id } = req.params;
  try {
    const eq = await pool.query(
      `SELECT e.*, p.name AS project_name FROM equipment e
       LEFT JOIN projects p ON p.id = e.project_id WHERE e.id = $1`,
      [id]
    );
    if (eq.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });

    const fuel = await pool.query(
      `SELECT f.*, u.full_name AS logged_by_name FROM equipment_fuel_logs f
       LEFT JOIN users u ON u.id = f.logged_by WHERE f.equipment_id = $1 ORDER BY f.fuel_date DESC`,
      [id]
    );
    const maintenance = await pool.query(
      `SELECT m.*, u.full_name AS logged_by_name FROM equipment_maintenance m
       LEFT JOIN users u ON u.id = m.logged_by WHERE m.equipment_id = $1 ORDER BY m.maintenance_date DESC`,
      [id]
    );
    const breakdowns = await pool.query(
      `SELECT b.*, u.full_name AS reported_by_name FROM equipment_breakdowns b
       LEFT JOIN users u ON u.id = b.reported_by WHERE b.equipment_id = $1 ORDER BY b.breakdown_date DESC`,
      [id]
    );

    res.json({
      ...eq.rows[0],
      fuel_logs: fuel.rows,
      maintenance_logs: maintenance.rows,
      breakdowns: breakdowns.rows,
    });
  } catch (err) {
    console.error('Get equipment error:', err);
    res.status(500).json({ error: 'Server error fetching equipment' });
  }
}

// POST /api/equipment  (Admin only)
async function createEquipment(req, res) {
  const { name, equipment_type, asset_code, project_id, purchase_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO equipment (name, equipment_type, asset_code, project_id, purchase_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, equipment_type || null, asset_code || null, project_id || null, purchase_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Asset code already exists' });
    console.error('Create equipment error:', err);
    res.status(500).json({ error: 'Server error creating equipment' });
  }
}

// PUT /api/equipment/:id  (Admin only)
async function updateEquipment(req, res) {
  const { id } = req.params;
  const { name, equipment_type, asset_code, project_id, status, purchase_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE equipment SET
        name = COALESCE($1, name), equipment_type = COALESCE($2, equipment_type),
        asset_code = COALESCE($3, asset_code), project_id = $4,
        status = COALESCE($5, status), purchase_date = COALESCE($6, purchase_date),
        updated_at = now()
       WHERE id = $7 RETURNING *`,
      [name, equipment_type, asset_code, project_id || null, status, purchase_date, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update equipment error:', err);
    res.status(500).json({ error: 'Server error updating equipment' });
  }
}

// POST /api/equipment/:id/fuel  (Admin, Supervisor)
async function addFuelLog(req, res) {
  const { id } = req.params;
  const { fuel_date, quantity, cost, notes } = req.body;
  if (!quantity) return res.status(400).json({ error: 'quantity is required' });
  try {
    const result = await pool.query(
      `INSERT INTO equipment_fuel_logs (equipment_id, fuel_date, quantity, cost, notes, logged_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6) RETURNING *`,
      [id, fuel_date || null, quantity, cost || null, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add fuel log error:', err);
    res.status(500).json({ error: 'Server error adding fuel log' });
  }
}

// POST /api/equipment/:id/maintenance  (Admin, Supervisor)
async function addMaintenanceLog(req, res) {
  const { id } = req.params;
  const { maintenance_date, description, cost, next_due_date } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });
  try {
    const result = await pool.query(
      `INSERT INTO equipment_maintenance (equipment_id, maintenance_date, description, cost, next_due_date, logged_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6) RETURNING *`,
      [id, maintenance_date || null, description, cost || null, next_due_date || null, req.user.id]
    );
    // A maintenance log implies the equipment was under maintenance
    await pool.query("UPDATE equipment SET status = 'maintenance', updated_at = now() WHERE id = $1", [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add maintenance log error:', err);
    res.status(500).json({ error: 'Server error adding maintenance log' });
  }
}

// POST /api/equipment/:id/breakdowns  (Admin, Supervisor)
async function reportBreakdown(req, res) {
  const { id } = req.params;
  const { breakdown_date, description } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });
  try {
    const result = await pool.query(
      `INSERT INTO equipment_breakdowns (equipment_id, breakdown_date, description, reported_by)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4) RETURNING *`,
      [id, breakdown_date || null, description, req.user.id]
    );
    await pool.query("UPDATE equipment SET status = 'breakdown', updated_at = now() WHERE id = $1", [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Report breakdown error:', err);
    res.status(500).json({ error: 'Server error reporting breakdown' });
  }
}

// PUT /api/equipment/breakdowns/:breakdownId/resolve  (Admin, Supervisor)
async function resolveBreakdown(req, res) {
  const { breakdownId } = req.params;
  const { resolution_notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE equipment_breakdowns
       SET resolved = true, resolved_date = CURRENT_DATE, resolution_notes = $1
       WHERE id = $2 RETURNING *`,
      [resolution_notes || null, breakdownId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Breakdown record not found' });

    await pool.query("UPDATE equipment SET status = 'active', updated_at = now() WHERE id = $1", [result.rows[0].equipment_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Resolve breakdown error:', err);
    res.status(500).json({ error: 'Server error resolving breakdown' });
  }
}

module.exports = {
  listEquipment, getEquipment, createEquipment, updateEquipment,
  addFuelLog, addMaintenanceLog, reportBreakdown, resolveBreakdown,
};
