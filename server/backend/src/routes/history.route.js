const express = require("express");
const router = express.Router();
const HistoryController = require('../controllers/users/history.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Phân trang các thư mục của user
 * GET /histories?page=<number>&size=<number>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/', verifyToken, isAdmin, HistoryController.paginates);

/**
 * Admin phản hồi câu hỏi của người dùng
 * POST /histories/:id/reply
 * Headers: Authorization: Bearer <token>
 * Body: { "answer": String }
 * Phải là Admin
 */
router.post('/:id/reply', verifyToken, isAdmin, HistoryController.updateAdminAnswer);

module.exports = router;