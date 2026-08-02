const pool = require('../config/db');

// GET /api/sites
// Super Admin sees all (or filters by ?company_id=). Everyone else sees only their own company's sites.
async function listSites(req, res) {
  try {
    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query('SELECT * FROM sites WHERE company_id = $1 ORDER BY name ASC', [company_id]);
        return res.json(result.rows);
      }
      const result = await pool.query('SELECT * FROM sites ORDER BY name ASC');
      return res.json(result.rows);
    }
    const result = await pool.query('SELECT * FROM sites WHERE company_id = $1 ORDER BY name ASC', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('List sites error:', err);
    res.status(500).json({ error: 'Server error fetching sites' });
  }
}

// GET /api/sites/:id
async function getSite(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    const site = result.rows[0];
    if (req.user.role !== 'super_admin' && site.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to view this site' });
    }
    res.json(site);
  } catch (err) {
    console.error('Get site error:', err);
    res.status(500).json({ error: 'Server error fetching site' });
  }
}

// POST /api/sites  (Super Admin, Company Head)
async function createSite(req, res) {
  const { name, address, latitude, longitude, company_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required when creating a site as Super Admin' });
    }
    targetCompanyId = company_id;
  }

  try {
    const result = await pool.query(
      `INSERT INTO sites (name, address, latitude, longitude, company_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, address || null, latitude || null, longitude || null, targetCompanyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create site error:', err);
    res.status(500).json({ error: 'Server error creating site' });
  }
}

// PUT /api/sites/:id  (Super Admin, Company Head)
async function updateSite(req, res) {
  const { id } = req.params;
  const { name, address, latitude, longitude } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Site not found' });
    if (req.user.role !== 'super_admin' && existing.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'You do not have permission to edit this site' });
    }

    const result = await pool.query(
      `UPDATE sites
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude)
       WHERE id = $5 RETURNING *`,
      [name, address, latitude, longitude, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update site error:', err);
    res.status(500).json({ error: 'Server error updating site' });
  }
}

// POST /api/sites/:id/link/:projectId  (Super Admin, Company Head)
async function linkToProject(req, res) {
  const { id, projectId } = req.params;
  try {
    await pool.query(
      `INSERT INTO project_sites (project_id, site_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [projectId, id]
    );
    res.status(201).json({ message: 'Site linked to project' });
  } catch (err) {
    console.error('Link site error:', err);
    res.status(500).json({ error: 'Server error linking site to project' });
  }
}

// DELETE /api/sites/:id/link/:projectId  (Super Admin, Company Head)
async function unlinkFromProject(req, res) {
  const { id, projectId } = req.params;
  try {
    await pool.query(
      'DELETE FROM project_sites WHERE project_id = $1 AND site_id = $2',
      [projectId, id]
    );
    res.json({ message: 'Site unlinked from project' });
  } catch (err) {
    console.error('Unlink site error:', err);
    res.status(500).json({ error: 'Server error unlinking site from project' });
  }
}

module.exports = { listSites, getSite, createSite, updateSite, linkToProject, unlinkFromProject };
