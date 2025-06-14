const BaseRepository = require("../../repositories/common/base.repository");
const Folder = require("../../models/users/folder.model");
const Chat = require("../../models/users/chat.model");
const HttpResponse = require("../../data/responses/http.response");

class FolderService {
    constructor() {
        this.folderRepo = new BaseRepository(Folder);
    }

    // Create a new folder
    async createFolder(userId, visitorId, name) {
        try {
            const data = { name };
            if (userId) data.userId = userId;
            if (visitorId) data.visitorId = visitorId;

            const folder = await this.folderRepo.create(data);
            return HttpResponse.success("Folder created successfully", folder);
        } catch (error) {
            console.error("Error creating folder:", error);
            return HttpResponse.error("Failed to create folder");
        }
    }

    // Get a folder by ID
    async getFolderById(userId, visitorId, folderId) {
        try {
            const folder = await this.folderRepo.getById(folderId);
            if (!folder) {
                return HttpResponse.error("Folder not found or unauthorized", -404);
            }
            return HttpResponse.success("Folder retrieved successfully", folder);
        } catch (error) {
            console.error("Error retrieving folder:", error);
            return HttpResponse.error("Failed to retrieve folder");
        }
    }

    // Get all folders of a user
    async getFoldersByUser(userId, visitorId) {
        try {
            const filter = this.getUserFilter({ id: userId, visitorId });
            const folders = await this.folderRepo.getAll(filter);
            return HttpResponse.success("Folders retrieved successfully", folders);
        } catch (error) {
            console.error("Error retrieving folders:", error);
            return HttpResponse.error("Failed to retrieve folders");
        }
    }

    // Update a folder
    async updateFolder(userId, visitorId, folderId, updateData) {
        try {
            const folder = await this.folderRepo.getById(folderId);
            if (!folder) {
                return HttpResponse.error("Folder not found or unauthorized", -404);
            }
            const updatedFolder = await this.folderRepo.update(folderId, updateData);
            return HttpResponse.success("Folder updated successfully", updatedFolder);
        } catch (error) {
            console.error("Error updating folder:", error);
            return HttpResponse.error("Failed to update folder");
        }
    }

    // Rename a folder
    async renameFolder(userId, visitorId, folderId, newName) {
        try {
            const folder = await this.folderRepo.getById(folderId);
            if (!folder) {
                return HttpResponse.error("Folder not found or unauthorized", -404);
            }
            const updatedFolder = await this.folderRepo.update(folderId, { name: newName });
            return HttpResponse.success("Folder renamed successfully", updatedFolder);
        } catch (error) {
            console.error("Error renaming folder:", error);
            return HttpResponse.error("Failed to rename folder");
        }
    }

    // Delete a folder (and optionally move chats to null folderId)
    async deleteFolder(userId, visitorId, folderId) {
        try {
            const folder = await this.folderRepo.getById(folderId);
            if (!folder) {
                return HttpResponse.error("Folder not found or unauthorized", -404);
            }
            // Move all chats in this folder to null folderId
            await Chat.updateMany({ folderId }, { $unset: { folderId: "" } });
            await this.folderRepo.delete(folderId);
            return HttpResponse.success("Folder deleted successfully");
        } catch (error) {
            console.error("Error deleting folder:", error);
            return HttpResponse.error("Failed to delete folder");
        }
    }

    // Paginate folders
    async paginateFolders(userId, visitorId, page = 1, size = 10) {
        try {
            const filter = this.getUserFilter({ id: userId, visitorId });
            const result = await this.folderRepo.paginate(filter, page, size);
            return HttpResponse.success("Folders paginated successfully", result);
        } catch (error) {
            console.error("Error paginating folders:", error);
            return HttpResponse.error("Failed to paginate folders");
        }
    }

    getUserFilter(user) {
        if (user?.id) return { userId: user.id };
        if (user?.visitorId) return { visitorId: user.visitorId };
        return {};
    }
}

module.exports = new FolderService();