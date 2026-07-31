const express = require('express');
const router = express.Router();
const {
  listMaterials, createMaterial, createReceipt, listReceipts,
  createIssue, listIssues, getStock,
} = require('../controllers/materialController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth);

router.get('/', listMaterials);
router.post('/', requireRole('admin'), createMaterial);

router.get('/receipts', listReceipts);
router.post('/receipts', requireRole('admin', 'supervisor'), requireProjectAccess, createReceipt);

router.get('/issues', listIssues);
router.post('/issues', requireRole('admin', 'supervisor'), requireProjectAccess, createIssue);

router.get('/stock', getStock);

module.exports = router;
