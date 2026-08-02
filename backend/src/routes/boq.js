const express = require('express');
const router = express.Router();
const { createBOQItem, listBOQItems, updateBOQItem, deleteBOQItem } = require('../controllers/boqController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth);

router.get('/', listBOQItems);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, createBOQItem);
router.put('/:id', requireRole('super_admin', 'company_head', 'supervisor'), updateBOQItem);
router.delete('/:id', requireRole('super_admin', 'company_head'), deleteBOQItem);

module.exports = router;
