const express = require('express');
const router = express.Router();
const { createUpload, listUploads } = require('../controllers/attendanceUploadController');
const { requireAuth, requireRole } = require('../middleware/auth');
const uploadAttendanceSheet = require('../middleware/uploadAttendanceSheet');

router.use(requireAuth);

router.get('/', listUploads);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), uploadAttendanceSheet.single('file'), createUpload);

module.exports = router;
