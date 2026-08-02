const express = require('express');
const router = express.Router();
const {
  generateMonthlySalaries, listSalaries, getSalary, addPayment,
} = require('../controllers/salaryController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', requireRole('super_admin', 'company_head', 'supervisor'), listSalaries);
router.get('/:id', requireRole('super_admin', 'company_head', 'supervisor'), getSalary);
router.post('/generate', requireRole('super_admin', 'company_head'), generateMonthlySalaries);
router.post('/:id/payments', requireRole('super_admin', 'company_head'), addPayment);

module.exports = router;
