const express = require('express');
const router = express.Router();
const {
  listProjects, getProject, createProject, updateProject,
  addProgressUpdate, listProgressUpdates, assignEmployee, removeEmployee,
  assignSupervisor, removeSupervisor, deleteProject,
} = require('../controllers/projectsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', requireRole('super_admin', 'company_head'), createProject);
router.put('/:id', requireRole('super_admin', 'company_head'), updateProject);
router.delete('/:id', requireRole('super_admin', 'company_head'), deleteProject);

router.get('/:id/progress', listProgressUpdates);
router.post('/:id/progress', requireRole('super_admin', 'company_head', 'supervisor'), addProgressUpdate);

router.post('/:id/employees', requireRole('super_admin', 'company_head'), assignEmployee);
router.delete('/:id/employees/:employeeId', requireRole('super_admin', 'company_head'), removeEmployee);

router.post('/:id/supervisors', requireRole('super_admin', 'company_head'), assignSupervisor);
router.delete('/:id/supervisors/:userId', requireRole('super_admin', 'company_head'), removeSupervisor);

module.exports = router;
