const pool = require('../config/db');

// GET /api/posts
async function listPosts(req, res) {
  try {
    if (req.user.role === 'super_admin') {
      const { company_id } = req.query;
      if (company_id) {
        const result = await pool.query('SELECT * FROM posts WHERE company_id = $1 ORDER BY name ASC', [company_id]);
        return res.json(result.rows);
      }
      const result = await pool.query('SELECT * FROM posts ORDER BY name ASC');
      return res.json(result.rows);
    }
    const result = await pool.query('SELECT * FROM posts WHERE company_id = $1 ORDER BY name ASC', [req.user.company_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ error: 'Server error fetching posts' });
  }
}

// POST /api/posts  (Super Admin, Company Head)
async function createPost(req, res) {
  const { name, company_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  let targetCompanyId = req.user.company_id;
  if (req.user.role === 'super_admin') {
    if (!company_id) return res.status(400).json({ error: 'company_id is required when creating a post as Super Admin' });
    targetCompanyId = company_id;
  }

  try {
    const result = await pool.query(
      'INSERT INTO posts (company_id, name) VALUES ($1, $2) RETURNING *',
      [targetCompanyId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'A post with this name already exists' });
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error creating post' });
  }
}

// DELETE /api/posts/:id  (Super Admin, Company Head)
async function deletePost(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE employees SET post_id = NULL WHERE post_id = $1', [id]);
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Server error deleting post' });
  }
}

module.exports = { listPosts, createPost, deletePost };
