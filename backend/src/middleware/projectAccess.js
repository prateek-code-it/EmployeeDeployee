const pool = require('../config/db');

/**
 * Ensures a Supervisor can only act on projects they're assigned to.
 * Admin always passes through. Employee role is blocked entirely (this
 * middleware is only used on write routes that Employees can't reach anyway).
 *
 * Expects the project id to be available as req.body.project_id (for creates)
 * or req.params.id / req.params.project_id (for routes scoped to a project).
 */
function requireProjectAccess(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'You do not have permission to do this' });
  }

  const projectId = req.body.project_id || req.params.project_id || req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: 'project_id is required' });
  }

  pool.query(
    'SELECT 1 FROM project_supervisors WHERE project_id = $1 AND user_id = $2',
    [projectId, req.user.id]
  )
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this project' });
      }
      next();
    })
    .catch((err) => {
      console.error('Project access check error:', err);
      res.status(500).json({ error: 'Server error checking project access' });
    });
}

module.exports = { requireProjectAccess };
