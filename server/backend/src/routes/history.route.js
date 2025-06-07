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

module.exports = router;