const express = require("express");
const router = express.Router();
const YearController = require('../../controllers/v2/year.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo năm học
 * POST /years
 */
router.post('/', verifyToken, isAdmin, YearController.create);

/**
 * Cập nhật năm học
 * PUT /years/:id
 */
router.put('/:id', verifyToken, isAdmin, YearController.update);

/**
 * Xoá năm học
 * DELETE /years/:id
 */
router.delete('/:id', verifyToken, isAdmin, YearController.delete);

/**
 * Lấy danh sách năm học (phân trang)
 * GET /years
 */
router.get('/', verifyToken, YearController.list);

/**
 * Lấy chi tiết năm học
 * GET /years/:id
 */
router.get('/:id', verifyToken, YearController.getDetail);

module.exports = router;