const express = require('express');
const router = express.Router();
const { createDPR, listDPRs, getDPR, addPhotos, deletePhoto } = require('../controllers/dprController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const uploadDprPhotos = require('../middleware/uploadDprPhotos');

router.use(requireAuth);

router.get('/', listDPRs);
router.get('/:id', getDPR);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, createDPR);
router.post('/:id/photos', requireRole('super_admin', 'company_head', 'supervisor'), uploadDprPhotos.array('photos', 10), addPhotos);
router.delete('/photos/:photoId', requireRole('super_admin', 'company_head'), deletePhoto);

module.exports = router;
