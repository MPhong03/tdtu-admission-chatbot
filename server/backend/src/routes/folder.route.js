const express = require("express");
const router = express.Router();
const FolderController = require('../controllers/users/folder.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ============= API ============= //

/**
 * Tạo một thư mục mới
 * POST /folders
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String }
 */
router.post('/', verifyToken, FolderController.createFolder);

/**
 * Lấy thông tin một thư mục theo ID
 * GET /folders/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/:id', verifyToken, FolderController.getFolderById);

/**
 * Cập nhật một thư mục
 * PUT /folders/:id
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String (optional) }
 */
router.put('/:id', verifyToken, FolderController.updateFolder);

/**
 * Đổi tên một thư mục
 * PATCH /folders/:id/rename
 * Headers: Authorization: Bearer <token>
 * Body: { "name": String }
 */
router.patch('/:id/rename', verifyToken, FolderController.renameFolder);

/**
 * Xóa một thư mục
 * DELETE /folders/:id
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.delete('/:id', verifyToken, FolderController.deleteFolder);

/**
 * Phân trang các thư mục của user
 * GET /folders?page=<number>&size=<number>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get('/', verifyToken, FolderController.paginateFolders);

module.exports = router;