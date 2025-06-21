const express = require("express");
const router = express.Router();
const TuitionController = require('../../controllers/v2/tuition.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo học phí
 * POST /tuitions
 */
router.post('/', verifyToken, isAdmin, TuitionController.create);

/**
 * Cập nhật học phí
 * PUT /tuitions/:id
 */
router.put('/:id', verifyToken, isAdmin, TuitionController.update);

/**
 * Xoá học phí
 * DELETE /tuitions/:id
 */
router.delete('/:id', verifyToken, isAdmin, TuitionController.delete);

/**
 * Lấy danh sách học phí (phân trang)
 * GET /tuitions
 */
router.get('/', verifyToken, TuitionController.list);

/**
 * Lấy chi tiết học phí
 * GET /tuitions/:id
 */
router.get('/:id', verifyToken, TuitionController.getDetail);

module.exports = router;