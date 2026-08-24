const express = require('express');
const router = express.Router();
const { listPosts, createPost, deletePost } = require('../controllers/postController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listPosts);
router.post('/', requireRole('super_admin', 'company_head'), createPost);
router.delete('/:id', requireRole('super_admin', 'company_head'), deletePost);

module.exports = router;
