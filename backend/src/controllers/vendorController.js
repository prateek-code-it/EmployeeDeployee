const pool = require('../config/db');

// GET /api/vendors
async function listVendors(req, res) {
  try {
    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query('SELECT * FROM vendors WHERE company_id = $1 ORDER BY name ASC', [company_id]);
        return res.json(result.rows);
      }
      const result = await pool.query('SELECT * FROM vendors ORDER BY name ASC');
      return res.json(result.rows);
    }
    const result = await pool.query('SELECT * FROM vendors WHERE company_id = $1 ORDER BY name ASC', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('List vendors error:', err);
    res.status(500).json({ error: 'Server error fetching vendors' });
  }
}

// POST /api/vendors  (Super Admin, Company Head)
async function createVendor(req, res) {
  const { name, contact_person, phone, email, address, company_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required when creating a vendor as Super Admin' });
    }
    targetCompanyId = company_id;
  }

  try {
    const result = await pool.query(
      `INSERT INTO vendors (name, contact_person, phone, email, address, company_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, contact_person || null, phone || null, email || null, address || null, targetCompanyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create vendor error:', err);
    res.status(500).json({ error: 'Server error creating vendor' });
  }
}

module.exports = { listVendors, createVendor };
