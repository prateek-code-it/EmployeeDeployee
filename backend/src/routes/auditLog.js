const express = require('express');
const router = express.Router();
const { listAuditLog } = require('../controllers/auditController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', requireRole('super_admin', 'company_head'), listAuditLog);

module.exports = router;
