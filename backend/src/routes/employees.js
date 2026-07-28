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

router.use(requireAuth); // every route below requires login

router.get('/', requireRole('admin', 'supervisor'), listEmployees);
router.get('/:id', requireRole('admin', 'supervisor'), getEmployee);
router.post('/', requireRole('admin'), createEmployee);
router.put('/:id', requireRole('admin'), updateEmployee);
router.delete('/:id', requireRole('admin'), deactivateEmployee);

module.exports = router;
