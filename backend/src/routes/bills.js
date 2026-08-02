const express = require('express');
const router = express.Router();
const { listBills, getBill, createBill, updateBill, deleteBill } = require('../controllers/billsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const upload = require('../middleware/upload');

router.use(requireAuth);

router.get('/', listBills);
router.get('/:id', getBill);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, upload.single('image'), createBill);
router.put('/:id', requireRole('super_admin', 'company_head', 'supervisor'), upload.single('image'), updateBill);
router.delete('/:id', requireRole('super_admin', 'company_head'), deleteBill);

module.exports = router;
