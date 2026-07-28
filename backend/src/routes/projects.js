const express = require('express');
const router = express.Router();
const {
  listProjects, getProject, createProject, updateProject,
  addProgressUpdate, listProgressUpdates, assignEmployee, removeEmployee,
} = require('../controllers/projectsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth); // every route below requires login

router.get('/', listProjects);
router.get('/:id', getProject);
router.post('/', requireRole('admin'), createProject);
router.put('/:id', requireRole('admin'), updateProject);

router.get('/:id/progress', listProgressUpdates);
router.post('/:id/progress', requireRole('admin', 'supervisor'), addProgressUpdate);

router.post('/:id/employees', requireRole('admin'), assignEmployee);
router.delete('/:id/employees/:employeeId', requireRole('admin'), removeEmployee);

module.exports = router;
