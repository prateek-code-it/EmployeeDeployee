const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/summary', getSummary);

module.exports = router;
