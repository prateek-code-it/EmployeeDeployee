const express = require('express');
const router = express.Router();
const {
  markAttendance, markAttendanceBulk, listAttendance, attendanceSummary,
} = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth);

router.get('/', listAttendance);
router.get('/summary', attendanceSummary);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, markAttendance);
router.post('/bulk', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, markAttendanceBulk);

module.exports = router;
