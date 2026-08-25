const express = require('express');
const router = express.Router();
const {
  listUsers, createUser, deactivateUser, reactivateUser, adminResetPassword,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole('super_admin', 'company_head','hr'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id/deactivate', deactivateUser);
router.put('/:id/reactivate', reactivateUser);
router.put('/:id/reset-password', adminResetPassword);

module.exports = router;
