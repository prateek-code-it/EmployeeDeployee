const express = require('express');
const router = express.Router();
const {
  listSites, getSite, createSite, updateSite, linkToProject, unlinkFromProject,
} = require('../controllers/sitesController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth); // every route below requires login

router.get('/', listSites);
router.get('/:id', getSite);
router.post('/', requireRole('admin'), createSite);
router.put('/:id', requireRole('admin'), updateSite);

router.post('/:id/link/:projectId', requireRole('admin'), linkToProject);
router.delete('/:id/link/:projectId', requireRole('admin'), unlinkFromProject);

module.exports = router;
