const express = require("express");
const router = express.Router();
const ScholarshipController = require('../../controllers/v2/scholarship.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo học bổng
 * POST /scholarships
 */
router.post('/', verifyToken, isAdmin, ScholarshipController.create);

/**
 * Cập nhật học bổng
 * PUT /scholarships/:id
 */
router.put('/:id', verifyToken, isAdmin, ScholarshipController.update);

/**
 * Xoá học bổng
 * DELETE /scholarships/:id
 */
router.delete('/:id', verifyToken, isAdmin, ScholarshipController.delete);

/**
 * Lấy danh sách học bổng (phân trang)
 * GET /scholarships
 */
router.get('/', verifyToken, ScholarshipController.list);

/**
 * Lấy chi tiết học bổng
 * GET /scholarships/:id
 */
router.get('/:id', verifyToken, ScholarshipController.getDetail);

module.exports = router;