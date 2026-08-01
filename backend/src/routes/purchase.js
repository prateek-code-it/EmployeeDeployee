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
router.post('/requests', requireRole('admin', 'supervisor'), requireProjectAccess, createPR);
router.post('/requests/:id/approve', requireRole('admin'), approvePR);
router.post('/requests/:id/reject', requireRole('admin'), rejectPR);

router.get('/orders', listPOs);
router.get('/orders/:id', getPO);
router.post('/orders', requireRole('admin'), createPO);
router.put('/orders/:id/close', requireRole('admin'), closePO);

router.post('/grn', requireRole('admin', 'supervisor'), createGRN);

module.exports = router;

