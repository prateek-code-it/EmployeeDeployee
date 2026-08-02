const express = require('express');
const router = express.Router();
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} = require('../controllers/employeesController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', requireRole('super_admin', 'company_head', 'supervisor'), listEmployees);
router.get('/:id', requireRole('super_admin', 'company_head', 'supervisor'), getEmployee);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), createEmployee);
router.put('/:id', requireRole('super_admin', 'company_head'), updateEmployee);
router.delete('/:id', requireRole('super_admin', 'company_head'), deactivateEmployee);

module.exports = router;
