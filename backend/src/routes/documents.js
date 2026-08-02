const express = require('express');
const router = express.Router();
const { createDocument, listDocuments, getDocument, addRevision, updateStatus } = require('../controllers/documentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/projectAccess');
const uploadDocument = require('../middleware/uploadDocument');

router.use(requireAuth);

router.get('/', listDocuments);
router.get('/:id', getDocument);
router.post('/', requireRole('super_admin', 'company_head', 'supervisor'), requireProjectAccess, uploadDocument.single('file'), createDocument);
router.post('/:id/revise', requireRole('super_admin', 'company_head', 'supervisor'), uploadDocument.single('file'), addRevision);
router.put('/:id/status', requireRole('super_admin', 'company_head'), updateStatus);

module.exports = router;

