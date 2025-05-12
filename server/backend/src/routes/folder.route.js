const express = require("express");
const router = express.Router();
const FolderController = require('../controllers/users/folder.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ============= API ============= //
// Create a new folder
router.post('/', verifyToken, FolderController.createFolder);

// Get a folder by ID
router.get('/:id', verifyToken, FolderController.getFolderById);

// Update a folder
router.put('/:id', verifyToken, FolderController.updateFolder);

// Rename a folder
router.patch('/:id/rename', verifyToken, FolderController.renameFolder);

// Delete a folder
router.delete('/:id', verifyToken, FolderController.deleteFolder);

// Paginate folders
router.get('/', verifyToken, FolderController.paginateFolders);

module.exports = router;