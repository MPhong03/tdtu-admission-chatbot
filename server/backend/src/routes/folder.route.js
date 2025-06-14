const express = require("express");
const router = express.Router();
const FolderController = require('../controllers/users/folder.controller');
const { verifyToken, optionalAuth } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo một thư mục mới
 * POST /folders
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String }
 */
router.post('/', optionalAuth, FolderController.createFolder);

/**
 * Lấy thông tin một thư mục theo ID
 * GET /folders/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/:id', optionalAuth, FolderController.getFolderById);

/**
 * Cập nhật một thư mục
 * PUT /folders/:id
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String (optional) }
 */
router.put('/:id', optionalAuth, FolderController.updateFolder);

/**
 * Đổi tên một thư mục
 * PATCH /folders/:id/rename
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String }
 */
router.patch('/:id/rename', optionalAuth, FolderController.renameFolder);

/**
 * Xóa một thư mục
 * DELETE /folders/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.delete('/:id', optionalAuth, FolderController.deleteFolder);

/**
 * Phân trang các thư mục của user
 * GET /folders?page=<number>&size=<number>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/', optionalAuth, FolderController.paginateFolders);

module.exports = router;