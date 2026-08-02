const express = require('express');
const router = express.Router();
const {
  listEquipment, getEquipment, createEquipment, updateEquipment,
  addFuelLog, addMaintenanceLog, reportBreakdown, resolveBreakdown,
} = require('../controllers/equipmentController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', listEquipment);
router.get('/:id', getEquipment);
router.post('/', requireRole('super_admin', 'company_head'), createEquipment);
router.put('/:id', requireRole('super_admin', 'company_head'), updateEquipment);

router.post('/:id/fuel', requireRole('super_admin', 'company_head', 'supervisor'), addFuelLog);
router.post('/:id/maintenance', requireRole('super_admin', 'company_head', 'supervisor'), addMaintenanceLog);
router.post('/:id/breakdowns', requireRole('super_admin', 'company_head', 'supervisor'), reportBreakdown);
router.put('/breakdowns/:breakdownId/resolve', requireRole('super_admin', 'company_head', 'supervisor'), resolveBreakdown);

module.exports = router;
