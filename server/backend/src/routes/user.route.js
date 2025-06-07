const express = require("express");
const router = express.Router();
const UserController = require('../controllers/users/user.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Phân trang các thư mục của user
 * GET /users?page=<number>&size=<number>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/', verifyToken, isAdmin, UserController.paginates);

module.exports = router;