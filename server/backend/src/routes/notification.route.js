const express = require("express");
const router = express.Router();
const NotificationController = require('../controllers/users/notification.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Phân trang thông báo
 * GET /notifications?page=<number>&size=<number>
 */
router.get('/', optionalAuth, NotificationController.paginates);

/**
 * Đã đọc thông báo
 * POST /notifications/:id/read
 */
router.post('/:id/read', optionalAuth, NotificationController.markAsRead);

module.exports = router;