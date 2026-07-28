const express = require('express');
const router = express.Router();
const {
  generateMonthlySalaries, listSalaries, getSalary, addPayment,
} = require('../controllers/salaryController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth); // every route below requires login

router.get('/', requireRole('admin', 'supervisor'), listSalaries);
router.get('/:id', requireRole('admin', 'supervisor'), getSalary);
router.post('/generate', requireRole('admin'), generateMonthlySalaries);
router.post('/:id/payments', requireRole('admin'), addPayment);

module.exports = router;
