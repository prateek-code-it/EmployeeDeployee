const express = require('express');
const router = express.Router();
const {
  createRequest, listRequests, approveRequest, rejectRequest,
} = require('../controllers/employeeRequestsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', requireRole('super_admin', 'company_head', 'supervisor'), listRequests);
router.post('/', requireRole('supervisor'), createRequest);
router.post('/:id/approve', requireRole('super_admin', 'company_head'), approveRequest);
router.post('/:id/reject', requireRole('super_admin', 'company_head'), rejectRequest);

module.exports = router;
