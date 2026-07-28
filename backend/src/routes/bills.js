const express = require('express');
const router = express.Router();
const { listBills, getBill, createBill, updateBill, deleteBill } = require('../controllers/billsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const upload = require('../middleware/upload');

router.use(requireAuth); // every route below requires login

router.get('/', listBills);
router.get('/:id', getBill);
router.post('/', requireRole('admin', 'supervisor'), requireProjectAccess, upload.single('image'), createBill);
router.put('/:id', requireRole('admin', 'supervisor'), upload.single('image'), updateBill);
router.delete('/:id', requireRole('admin'), deleteBill);

module.exports = router;
