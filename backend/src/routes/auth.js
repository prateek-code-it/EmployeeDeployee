const express = require('express');
const router = express.Router();
const { login, resetPassword, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', login);
router.post('/reset-password', requireAuth, resetPassword);
router.get('/me', requireAuth, me);

module.exports = router;

