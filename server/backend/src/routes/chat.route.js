const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/users/chat.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo một đoạn chat mới
 * POST /chats
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String, "folderId": String (optional) }
 */
router.post('/', verifyToken, ChatController.createChat);

/**
 * Lấy thông tin một đoạn chat theo ID
 * GET /chats/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/:id', verifyToken, ChatController.getChatById);

/**
 * Cập nhật một đoạn chat
 * PUT /chats/:id
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String (optional), "folderId": String (optional) }
 */
router.put('/:id', verifyToken, ChatController.updateChat);

/**
 * Đổi tên một đoạn chat
 * PATCH /chats/:id/rename
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String }
 */
router.patch('/:id/rename', verifyToken, ChatController.renameChat);

/**
 * Di chuyển đoạn chat vào một folder khác
 * PATCH /chats/:id/move
 * Headers: Authorization: Bearer <token>
 * Body: { "folderId": String }
 */
router.patch('/:id/move', verifyToken, ChatController.moveChatToFolder);

/**
 * Xóa một đoạn chat
 * DELETE /chats/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.delete('/:id', verifyToken, ChatController.deleteChat);

/**
 * Phân trang các đoạn chat của user (có thể lọc theo folder)
 * GET /chats?page=<number>&size=<number>&folderId=<folderId>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/', verifyToken, ChatController.paginateChats);

module.exports = router;