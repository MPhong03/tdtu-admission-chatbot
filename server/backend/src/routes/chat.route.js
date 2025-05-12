const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/users/chat.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ============= API ============= //
// Create a new chat
router.post('/', verifyToken, ChatController.createChat);

// Get a chat by ID
router.get('/:id', verifyToken, ChatController.getChatById);

// Update a chat
router.put('/:id', verifyToken, ChatController.updateChat);

// Rename a chat
router.patch('/:id/rename', verifyToken, ChatController.renameChat);

// Move a chat to a folder
router.patch('/:id/move', verifyToken, ChatController.moveChatToFolder);

// Delete a chat
router.delete('/:id', verifyToken, ChatController.deleteChat);

// Paginate chats
router.get('/', verifyToken, ChatController.paginateChats);

module.exports = router;