const express = require("express");
const router = express.Router();
const DocumentController = require('../../controllers/v2/document.controller');
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo tài liệu
 * POST /documents
 */
router.post('/', verifyToken, isAdmin, DocumentController.create);

/**
 * Cập nhật tài liệu
 * PUT /documents/:id
 */
router.put('/:id', verifyToken, isAdmin, DocumentController.update);

/**
 * Xoá tài liệu
 * DELETE /documents/:id
 */
router.delete('/:id', verifyToken, isAdmin, DocumentController.delete);

/**
 * Lấy danh sách tài liệu (phân trang)
 * GET /documents
 */
router.get('/', verifyToken, DocumentController.list);

/**
 * Lấy chi tiết tài liệu
 * GET /documents/:id
 */
router.get('/:id', verifyToken, DocumentController.getDetail);

module.exports = router;