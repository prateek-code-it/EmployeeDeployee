const express = require('express');
const router = express.Router();
const {
  listConversations, getOrCreateGroupConversation, getOrCreateDirectConversation,
  listMessages, sendMessage,
} = require('../controllers/messagingController');
const { requireAuth } = require('../middleware/auth');
const uploadChat = require('../middleware/uploadChat');

router.use(requireAuth); // every route below requires login

router.get('/', listConversations);
router.get('/group/:projectId', getOrCreateGroupConversation);
router.post('/direct', getOrCreateDirectConversation);
router.get('/:id/messages', listMessages);
router.post('/:id/messages', uploadChat.single('image'), sendMessage);

module.exports = router;

