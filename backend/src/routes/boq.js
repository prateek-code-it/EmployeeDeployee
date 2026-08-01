const express = require('express');
const router = express.Router();
const { createBOQItem, listBOQItems, updateBOQItem, deleteBOQItem } = require('../controllers/boqController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth);

router.get('/', listBOQItems);
router.post('/', requireRole('admin', 'supervisor'), requireProjectAccess, createBOQItem);
router.put('/:id', requireRole('admin', 'supervisor'), updateBOQItem);
router.delete('/:id', requireRole('admin'), deleteBOQItem);

module.exports = router;

