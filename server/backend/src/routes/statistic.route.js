const express = require('express');
const StatisticController = require('../controllers/admins/statistic.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Thống kê tổng hợp
 * GET /statistics/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/summary', verifyToken, isAdmin, StatisticController.getSummaryStats);

/**
 * Thống kê số câu hỏi theo ngày
 * GET /statistics/qa-by-day?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/qa-by-day', verifyToken, isAdmin, StatisticController.getCountQuestionsByDay);

/**
 * Thống kê số câu hỏi theo trạng thái
 * GET /statistics/qa-by-status?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/qa-by-status', verifyToken, isAdmin, StatisticController.getCountQuestionsByStatus);

/**
 * Thống kê tần suất từ xuất hiện trong các câu hỏi
 * GET /statistics/word-frequency?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&minLength=2&topN=100
 */
router.get('/word-cloud', StatisticController.getWordCloud);

// === CÁC ROUTE MỚI CHO THỐNG KÊ CHI TIẾT ===

/**
 * Thống kê tổng hợp mới với phân loại chi tiết
 * GET /statistics/detailed-summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/detailed-summary', verifyToken, isAdmin, StatisticController.getDetailedSummaryStats);

/**
 * Thống kê verification (tỷ lệ trả lời đúng/sai)
 * GET /statistics/verification?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/verification', verifyToken, isAdmin, StatisticController.getVerificationStats);

/**
 * Thống kê phân loại lỗi chi tiết
 * GET /statistics/error-types?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/error-types', verifyToken, isAdmin, StatisticController.getErrorTypeStats);

/**
 * Thống kê số câu hỏi theo loại lỗi
 * GET /statistics/qa-by-error-type?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/qa-by-error-type', verifyToken, isAdmin, StatisticController.getCountQuestionsByErrorType);

/**
 * Thống kê số câu hỏi theo kết quả verification
 * GET /statistics/qa-by-verification-result?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/qa-by-verification-result', verifyToken, isAdmin, StatisticController.getCountQuestionsByVerificationResult);

/**
 * Thống kê verification score trung bình theo ngày
 * GET /statistics/verification-score-by-day?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/verification-score-by-day', verifyToken, isAdmin, StatisticController.getAverageVerificationScoreByDay);

module.exports = router;