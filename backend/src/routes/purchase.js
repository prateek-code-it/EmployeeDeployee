const express = require('express');
const router = express.Router();
const {
  createPR, listPRs, approvePR, rejectPR,
  createPO, listPOs, getPO, closePO,
  createGRN,
} = require('../controllers/purchaseController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth);

router.get('/requests', listPRs);
router.post('/requests', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, createPR);
router.post('/requests/:id/approve', requireRole('super_admin', 'company_head'), approvePR);
router.post('/requests/:id/reject', requireRole('super_admin', 'company_head'), rejectPR);

router.get('/orders', listPOs);
router.get('/orders/:id', getPO);
router.post('/orders', requireRole('super_admin', 'company_head'), createPO);
router.put('/orders/:id/close', requireRole('super_admin', 'company_head'), closePO);

router.post('/grn', requireRole('super_admin', 'company_head', 'supervisor'), createGRN);

module.exports = router;
