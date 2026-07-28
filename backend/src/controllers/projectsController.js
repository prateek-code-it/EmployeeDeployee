const pool = require('../config/db');

// GET /api/projects
// Returns a flat list of all projects (with parent_project_id) - frontend builds the tree.
// Admin sees everything. Supervisor sees only projects they're linked to (directly assigned).
async function listProjects(req, res) {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query(
        `SELECT * FROM projects ORDER BY parent_project_id NULLS FIRST, name ASC`
      );
      return res.json(result.rows);
    }

    // Supervisors: for now, show all projects (read-only visibility of the tree helps
    // navigation), but write actions are still restricted per-project via requireProjectAccess.
    const result = await pool.query(
      `SELECT * FROM projects ORDER BY parent_project_id NULLS FIRST, name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
}

// GET /api/projects/:id
// Returns one project with its sites, assigned employees, direct children,
// and a rolled-up total spend (this project + all descendants).
async function getProject(req, res) {
  const { id } = req.params;
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const sites = await pool.query(
      `SELECT s.* FROM sites s
       JOIN project_sites ps ON ps.site_id = s.id
       WHERE ps.project_id = $1`,
      [id]
    );

    const employees = await pool.query(
      `SELECT e.* FROM employees e
       JOIN project_employees pe ON pe.employee_id = e.id
       WHERE pe.project_id = $1 AND pe.removed_date IS NULL`,
      [id]
    );

    const children = await pool.query(
      'SELECT * FROM projects WHERE parent_project_id = $1 ORDER BY name ASC',
      [id]
    );

    // Recursive rollup: sum of bills for this project + all descendants at any depth
    const rollup = await pool.query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM projects WHERE id = $1
         UNION ALL
         SELECT p.id FROM projects p
         JOIN subtree s ON p.parent_project_id = s.id
       )
       SELECT COALESCE(SUM(b.amount), 0) AS total_spend
       FROM bills b
       WHERE b.project_id IN (SELECT id FROM subtree)`,
      [id]
    );

    res.json({
      ...project,
      sites: sites.rows,
      employees: employees.rows,
      children: children.rows,
      total_spend: parseFloat(rollup.rows[0].total_spend),
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Server error fetching project' });
  }
}

// POST /api/projects  (Admin only)
async function createProject(req, res) {
  const {
    parent_project_id, name, description, client_name,
    tender_reference, start_date, end_date, site_ids,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO projects (parent_project_id, name, description, client_name, tender_reference, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [parent_project_id || null, name, description || null, client_name || null,
       tender_reference || null, start_date || null, end_date || null, req.user.id]
    );
    const project = result.rows[0];

    if (Array.isArray(site_ids)) {
      for (const siteId of site_ids) {
        await client.query(
          'INSERT INTO project_sites (project_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [project.id, siteId]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('projects', $1, 'create', $2, $3)`,
      [project.id, req.user.id, JSON.stringify({ name, parent_project_id })]
    );

    await client.query('COMMIT');
    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error creating project' });
  } finally {
    client.release();
  }
}

// PUT /api/projects/:id  (Admin only)
async function updateProject(req, res) {
  const { id } = req.params;
  const { name, description, client_name, tender_reference, status, start_date, end_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           client_name = COALESCE($3, client_name),
           tender_reference = COALESCE($4, tender_reference),
           status = COALESCE($5, status),
           start_date = COALESCE($6, start_date),
           end_date = COALESCE($7, end_date),
           updated_at = now()
       WHERE id = $8 RETURNING *`,
      [name, description, client_name, tender_reference, status, start_date, end_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query(
      `INSERT INTO audit_log (table_name, record_id, action, changed_by, details)
       VALUES ('projects', $1, 'update', $2, $3)`,
      [id, req.user.id, JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Server error updating project' });
  }
}

// POST /api/projects/:id/progress
