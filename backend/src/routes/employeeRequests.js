const express = require('express');
const router = express.Router();
const {
  createRequest, listRequests, approveRequest, rejectRequest,
} = require('../controllers/employeeRequestsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth); // every route below requires login

router.get('/', requireRole('admin', 'supervisor'), listRequests);
router.post('/', requireRole('supervisor'), createRequest);
router.post('/:id/approve', requireRole('admin'), approveRequest);
router.post('/:id/reject', requireRole('admin'), rejectRequest);

module.exports = router;

