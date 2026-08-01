const express = require('express');
const router = express.Router();
const { listVendors, createVendor } = require('../controllers/vendorController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', listVendors);
router.post('/', requireRole('admin'), createVendor);

module.exports = router;
