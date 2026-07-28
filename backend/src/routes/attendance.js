const express = require('express');
const router = express.Router();
const {
  markAttendance, markAttendanceBulk, listAttendance, attendanceSummary,
} = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');

router.use(requireAuth); // every route below requires login

router.get('/', listAttendance);
router.get('/summary', attendanceSummary);
router.post('/', requireRole('admin', 'supervisor'), requireProjectAccess, markAttendance);
router.post('/bulk', requireRole('admin', 'supervisor'), requireProjectAccess, markAttendanceBulk);

module.exports = router;
