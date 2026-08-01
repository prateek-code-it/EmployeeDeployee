const express = require('express');
const router = express.Router();
const { createDocument, listDocuments, getDocument, addRevision, updateStatus } = require('../controllers/documentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const uploadDocument = require('../middleware/uploadDocument');

router.use(requireAuth);

router.get('/', listDocuments);
router.get('/:id', getDocument);
router.post('/', requireRole('admin', 'supervisor'), requireProjectAccess, uploadDocument.single('file'), createDocument);
router.post('/:id/revise', requireRole('admin', 'supervisor'), uploadDocument.single('file'), addRevision);
router.put('/:id/status', requireRole('admin'), updateStatus);

module.exports = router;

