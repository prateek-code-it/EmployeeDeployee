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

async function addProgressUpdate(req, res) {
  const { id } = req.params;
  const { note, progress_percent } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'note is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO project_progress_updates (project_id, note, progress_percent, posted_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, note, progress_percent ?? null, req.user.id]
    );

    if (progress_percent !== undefined && progress_percent !== null) {
      await pool.query(
        'UPDATE projects SET progress_percent = $1, updated_at = now() WHERE id = $2',
        [progress_percent, id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add progress update error:', err);
    res.status(500).json({ error: 'Server error adding progress update' });
  }
}

// GET /api/projects/:id/progress
async function listProgressUpdates(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ppu.*, u.full_name AS posted_by_name
       FROM project_progress_updates ppu
       LEFT JOIN users u ON u.id = ppu.posted_by
       WHERE ppu.project_id = $1
       ORDER BY ppu.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List progress updates error:', err);
    res.status(500).json({ error: 'Server error fetching progress updates' });
  }
}

// POST /api/projects/:id/employees  (Admin only) - assign an employee to this project
async function assignEmployee(req, res) {
  const { id } = req.params;
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  try {
    await pool.query(
      `INSERT INTO project_employees (project_id, employee_id)
       VALUES ($1, $2)
       ON CONFLICT (project_id, employee_id)
       DO UPDATE SET removed_date = NULL, assigned_date = CURRENT_DATE`,
      [id, employee_id]
    );
    res.status(201).json({ message: 'Employee assigned to project' });
  } catch (err) {
    console.error('Assign employee error:', err);
    res.status(500).json({ error: 'Server error assigning employee' });
  }
}

// DELETE /api/projects/:id/employees/:employeeId  (Admin only)
async function removeEmployee(req, res) {
  const { id, employeeId } = req.params;
  try {
    await pool.query(
      `UPDATE project_employees SET removed_date = CURRENT_DATE
       WHERE project_id = $1 AND employee_id = $2`,
      [id, employeeId]
    );
    res.json({ message: 'Employee removed from project' });
  } catch (err) {
    console.error('Remove employee error:', err);
    res.status(500).json({ error: 'Server error removing employee' });
  }
}

// POST /api/projects/:id/supervisors  (Admin only) - assign a Supervisor user to this project
async function assignSupervisor(req, res) {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    await pool.query(
      `INSERT INTO project_supervisors (project_id, user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, user_id]
    );
    res.status(201).json({ message: 'Supervisor assigned to project' });
  } catch (err) {
    console.error('Assign supervisor error:', err);
    res.status(500).json({ error: 'Server error assigning supervisor' });
  }
}

// DELETE /api/projects/:id/supervisors/:userId  (Admin only)
async function removeSupervisor(req, res) {
  const { id, userId } = req.params;
  try {
    await pool.query(
      'DELETE FROM project_supervisors WHERE project_id = $1 AND user_id = $2',
      [id, userId]
    );
    res.json({ message: 'Supervisor removed from project' });
  } catch (err) {
    console.error('Remove supervisor error:', err);
    res.status(500).json({ error: 'Server error removing supervisor' });
  }
}

// DELETE /api/projects/:id  (Admin only)
// Refuses to delete if it has sub-projects or bills, to avoid accidental data loss.
async function deleteProject(req, res) {
  const { id } = req.params;
  try {
    const children = await pool.query('SELECT id FROM projects WHERE parent_project_id = $1', [id]);
    if (children.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete a project that has sub-projects. Delete those first.' });
    }

    const bills = await pool.query('SELECT id FROM bills WHERE project_id = $1', [id]);
    if (bills.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete a project that has bills attached to it.' });
    }

    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Server error deleting project' });
  }
}

module.exports = {
  listProjects, getProject, createProject, updateProject,
  addProgressUpdate, listProgressUpdates, assignEmployee, removeEmployee,
  assignSupervisor, removeSupervisor, deleteProject,
};
