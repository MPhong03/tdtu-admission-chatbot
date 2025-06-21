const express = require("express");
const router = express.Router();
const MajorController = require('../../controllers/v2/major.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo ngành học mới
 * POST /majors
 */
router.post('/', verifyToken, isAdmin, MajorController.create);

/**
 * Cập nhật ngành học
 * PUT /majors/:id
 */
router.put('/:id', verifyToken, isAdmin, MajorController.update);

/**
 * Xoá ngành học
 * DELETE /majors/:id
 */
router.delete('/:id', verifyToken, isAdmin, MajorController.delete);

/**
 * Lấy danh sách ngành học (phân trang)
 * GET /majors
 */
router.get('/', verifyToken, MajorController.list);

/**
 * Lấy chi tiết ngành học
 * GET /majors/:id
 */
router.get('/:id', verifyToken, MajorController.getDetail);

module.exports = router;