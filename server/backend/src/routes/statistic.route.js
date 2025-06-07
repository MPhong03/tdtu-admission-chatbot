const express = require("express");
const router = express.Router();
const StatisticController = require('../controllers/admins/statistic.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Lấy thống kê tổng quan: tổng người dùng, tương tác, trạng thái câu hỏi
 * GET /statistics/summary
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/summary', verifyToken, isAdmin, StatisticController.getSummaryStats);

/**
 * Thống kê số câu hỏi được hỏi theo từng ngày trong khoảng thời gian
 * GET /statistics/qa-by-day?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/qa-by-day', verifyToken, isAdmin, StatisticController.getCountQuestionsByDay);

/**
 * Thống kê số câu hỏi theo trạng thái trong khoảng thời gian
 * GET /statistics/qa-by-status?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Headers: Authorization: Bearer <token>
 * Không cần body
 * Phải là Admin
 */
router.get('/qa-by-status', verifyToken, isAdmin, StatisticController.getCountQuestionsByStatus);

module.exports = router;