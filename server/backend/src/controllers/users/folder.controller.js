const HttpResponse = require("../../data/responses/http.response");
const FolderService = require("../../services/users/folder.service");

class FolderController {
    // Create a new folder
    async createFolder(req, res) {
        try {
            const { name } = req.body;
            const userId = req.user.id;
            if (!name) {
                return res.json(HttpResponse.error("Name is required", -400));
            }
            const result = await FolderService.createFolder(userId, name);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to create folder", -1, err.message));
        }
    }

    // Get a folder by ID
    async getFolderById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const result = await FolderService.getFolderById(userId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to retrieve folder", -1, err.message));
        }
    }

    // Get all folders of a user
    async getFoldersByUser(req, res) {
        try {
            const userId = req.user.id;
            const result = await FolderService.getFoldersByUser(userId);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to retrieve folders", -1, err.message));
        }
    }

    // Update a folder
    async updateFolder(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const userId = req.user.id;
            const result = await FolderService.updateFolder(userId, id, updateData);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to update folder", -1, err.message));
        }
    }

    // Rename a folder
    async renameFolder(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const userId = req.user.id;
            if (!name) {
                return res.json(HttpResponse.error("Name is required", -400));
            }
            const result = await FolderService.renameFolder(userId, id, name);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to rename folder", -1, err.message));
        }
    }

    // Delete a folder
    async deleteFolder(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const result = await FolderService.deleteFolder(userId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to delete folder", -1, err.message));
        }
    }

    // Paginate folders
    async paginateFolders(req, res) {
        try {
            const { page = 1, size = 10 } = req.query;
            const userId = req.user.id;
            const result = await FolderService.paginateFolders(userId, parseInt(page), parseInt(size));
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to paginate folders", -1, err.message));
        }
    }
}

module.exports = new FolderController();