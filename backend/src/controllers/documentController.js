const pool = require('../config/db');

async function verifyProjectAccess(projectId, req) {
  const result = await pool.query('SELECT company_id FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Project not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this project' };
  }
  return { ok: true };
}

async function verifyDocumentAccess(docId, req) {
  const result = await pool.query(
    `SELECT p.company_id FROM documents d JOIN projects p ON p.id = d.project_id WHERE d.id = $1`,
    [docId]
  );
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Document not found' };
  if (req.user.role !== 'super_admin' && result.rows[0].company_id !== req.user.company_id) {
    return { ok: false, status: 403, error: 'You do not have permission to act on this document' };
  }
  return { ok: true };
}

// POST /api/documents  (Admin, Supervisor for their project)
async function createDocument(req, res) {
  const { project_id, document_type, title, doc_number, category } = req.body;
  if (!project_id || !title) {
    return res.status(400).json({ error: 'project_id and title are required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'A file (image or PDF) is required' });
  }

  const access = await verifyProjectAccess(project_id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  const filePath = `/uploads/documents/${req.file.filename}`;
  try {
    const result = await pool.query(
      `INSERT INTO documents (project_id, document_type, title, doc_number, category, file_path, file_type, uploaded_by)
       VALUES ($1, COALESCE($2, 'drawing'), $3, $4, $5, $6, $7, $8) RETURNING *`,
      [project_id, document_type || null, title, doc_number || null, category || null, filePath, fileType, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Server error creating document' });
  }
}

// GET /api/documents?project_id=&document_type=&category=
async function listDocuments(req, res) {
  const { project_id, document_type, category } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;

  if (req.user.role !== 'super_admin') {
    conditions.push(`p.company_id = $${i++}`);
    values.push(req.user.company_id);
  }
  if (project_id) { conditions.push(`d.project_id = $${i++}`); values.push(project_id); }
  if (document_type) { conditions.push(`d.document_type = $${i++}`); values.push(document_type); }
  if (category) { conditions.push(`d.category = $${i++}`); values.push(category); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT d.*, p.name AS project_name, u.full_name AS uploaded_by_name
       FROM documents d
       JOIN projects p ON p.id = d.project_id
       LEFT JOIN users u ON u.id = d.uploaded_by
       ${whereClause}
       ORDER BY d.updated_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Server error fetching documents' });
  }
}

// GET /api/documents/:id  (includes revision history)
async function getDocument(req, res) {
  const { id } = req.params;
  try {
    const access = await verifyDocumentAccess(id, req);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const doc = await pool.query(
      `SELECT d.*, p.name AS project_name, u.full_name AS uploaded_by_name
       FROM documents d
       JOIN projects p ON p.id = d.project_id
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.id = $1`,
      [id]
    );

    const revisions = await pool.query(
      `SELECT r.*, u.full_name AS uploaded_by_name FROM document_revisions r
       LEFT JOIN users u ON u.id = r.uploaded_by
       WHERE r.document_id = $1 ORDER BY r.revision_number DESC`,
      [id]
    );
    res.json({ ...doc.rows[0], revisions: revisions.rows });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Server error fetching document' });
  }
}

// POST /api/documents/:id/revise  (Admin, Supervisor)
async function addRevision(req, res) {
  const { id } = req.params;
  const { notes } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'A file (image or PDF) is required' });
  }

  const access = await verifyDocumentAccess(id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const docResult = await client.query('SELECT * FROM documents WHERE id = $1 FOR UPDATE', [id]);
    const doc = docResult.rows[0];

    await client.query(
      `INSERT INTO document_revisions (document_id, revision_number, file_path, file_type, notes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, doc.current_revision, doc.file_path, doc.file_type, notes || null, req.user.id]
    );

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    const filePath = `/uploads/documents/${req.file.filename}`;
    const newRevisionNumber = doc.current_revision + 1;
    const updated = await client.query(
      `UPDATE documents SET file_path = $1, file_type = $2, current_revision = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [filePath, fileType, newRevisionNumber, id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add revision error:', err);
    res.status(500).json({ error: 'Server error adding revision' });
  } finally {
    client.release();
  }
}

// PUT /api/documents/:id/status  (Admin only)
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['approved', 'under_review', 'superseded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const access = await verifyDocumentAccess(id, req);
  if (!access.ok) return res.status(access.status).json({ error: access.error });

  try {
    const result = await pool.query(
      'UPDATE documents SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update document status error:', err);
    res.status(500).json({ error: 'Server error updating status' });
  }
}

module.exports = { createDocument, listDocuments, getDocument, addRevision, updateStatus };
