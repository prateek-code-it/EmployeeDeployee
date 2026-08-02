const express = require('express');
const router = express.Router();
const {
  listSites, getSite, createSite, updateSite, linkToProject, unlinkFromProject,
} = require('../controllers/sitesController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listSites);
router.get('/:id', getSite);
router.post('/', requireRole('super_admin', 'company_head'), createSite);
router.put('/:id', requireRole('super_admin', 'company_head'), updateSite);

router.post('/:id/link/:projectId', requireRole('super_admin', 'company_head'), linkToProject);
router.delete('/:id/link/:projectId', requireRole('super_admin', 'company_head'), unlinkFromProject);

module.exports = router;
