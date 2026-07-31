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
router.post('/', requireRole('admin'), createEquipment);
router.put('/:id', requireRole('admin'), updateEquipment);

router.post('/:id/fuel', requireRole('admin', 'supervisor'), addFuelLog);
router.post('/:id/maintenance', requireRole('admin', 'supervisor'), addMaintenanceLog);
router.post('/:id/breakdowns', requireRole('admin', 'supervisor'), reportBreakdown);
router.put('/breakdowns/:breakdownId/resolve', requireRole('admin', 'supervisor'), resolveBreakdown);

module.exports = router;

