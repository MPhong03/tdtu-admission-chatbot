const express = require("express");
const router = express.Router();
const ProgrammeController = require('../../controllers/v2/programme.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo chương trình học
 * POST /programmes
 */
router.post('/', verifyToken, isAdmin, ProgrammeController.create);

/**
 * Cập nhật chương trình học
 * PUT /programmes/:id
 */
router.put('/:id', verifyToken, isAdmin, ProgrammeController.update);

/**
 * Xoá chương trình học
 * DELETE /programmes/:id
 */
router.delete('/:id', verifyToken, isAdmin, ProgrammeController.delete);

/**
 * Lấy danh sách chương trình học (phân trang)
 * GET /programmes
 */
router.get('/', verifyToken, ProgrammeController.list);

/**
 * Lấy chi tiết chương trình học
 * GET /programmes/:id
 */
router.get('/:id', verifyToken, ProgrammeController.getDetail);

module.exports = router;