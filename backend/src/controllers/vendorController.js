const pool = require('../config/db');

// GET /api/vendors
async function listVendors(req, res) {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('List vendors error:', err);
    res.status(500).json({ error: 'Server error fetching vendors' });
  }
}

// POST /api/vendors  (Admin only)
async function createVendor(req, res) {
  const { name, contact_person, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO vendors (name, contact_person, phone, email, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact_person || null, phone || null, email || null, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create vendor error:', err);
    res.status(500).json({ error: 'Server error creating vendor' });
  }
}

module.exports = { listVendors, createVendor };

