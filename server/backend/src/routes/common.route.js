const express = require("express");
const router = express.Router();
const CommonController = require('../controllers/admins/common.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Phân trang các cấu hình
 * GET /commonconfigs
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/', verifyToken, isAdmin, CommonController.getAllConfigs);

/**
 * Phân trang các cấu hình
 * GET /commonconfigs?key=<key>
 * Headers: Authorization: Bearer <token>
 * Body: { "value": <giá trị_mới> }
 * Phải là Admin
 */
router.put('/:key', verifyToken, isAdmin, CommonController.updateConfigByKey);

module.exports = router;