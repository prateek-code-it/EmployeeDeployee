const express = require('express');
const router = express.Router();
const { listCompanies, createCompany, deactivateCompany } = require('../controllers/companyController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireRole('super_admin')); // every route here is Super Admin-only

router.get('/', listCompanies);
router.post('/', createCompany);
router.put('/:id/deactivate', deactivateCompany);

module.exports = router;
