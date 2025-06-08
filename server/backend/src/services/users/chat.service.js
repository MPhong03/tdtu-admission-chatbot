const Chat = require("../../models/users/chat.model");
const BaseRepository = require("../../repositories/common/base.repository");
const HttpResponse = require("../../data/responses/http.response");

class ChatService {
    constructor() {
        this.chatRepo = new BaseRepository(Chat);
    }

    // Create a new chat
    async createChat(userId, name, folderId = null) {
        try {
            const data = { userId, name };
            if (folderId) {
                data.folderId = folderId;
            }
            const chat = await this.chatRepo.create(data);
            return HttpResponse.success("Chat created successfully", chat);
        } catch (error) {
            console.error("Error creating chat:", error);
            return HttpResponse.error("Failed to create chat");
        }
    }

    // Get a chat by ID
    async getChatById(userId, chatId) {
        try {
            const chat = await this.chatRepo.getById(chatId, ["folderId"]);
            if (!chat || chat.userId.toString() !== userId.toString()) {
                return HttpResponse.error("Chat not found or unauthorized", -404);
            }
            return HttpResponse.success("Chat retrieved successfully", chat);
        } catch (error) {
            console.error("Error retrieving chat:", error);
            return HttpResponse.error("Failed to retrieve chat");
        }
    }

    // Get all chats of a user (with optional folder filter)
    async getChatsByUser(userId, folderId = null) {
        try {
            const filter = { userId };
            if (folderId) {
                filter.folderId = folderId;
            }
            else {
                // filter.folderId = { $ne: null || "" };
            }
            const chats = await this.chatRepo.getAll(filter, ["folderId"]);
            return HttpResponse.success("Chats retrieved successfully", chats);
        } catch (error) {
            console.error("Error retrieving chats:", error);
            return HttpResponse.error("Failed to retrieve chats");
        }
    }

    // Update a chat
    async updateChat(userId, chatId, updateData) {
        try {
            const chat = await this.chatRepo.getById(chatId);
            if (!chat || chat.userId.toString() !== userId.toString()) {
                return HttpResponse.error("Chat not found or unauthorized", -404);
            }
            const updatedChat = await this.chatRepo.update(chatId, updateData);
            return HttpResponse.success("Chat updated successfully", updatedChat);
        } catch (error) {
            console.error("Error updating chat:", error);
            return HttpResponse.error("Failed to update chat");
        }
    }

    // Rename a chat
    async renameChat(userId, chatId, newName) {
        try {
            const chat = await this.chatRepo.getById(chatId);
            if (!chat || chat.userId.toString() !== userId.toString()) {
                return HttpResponse.error("Chat not found or unauthorized", -404);
            }
            const updatedChat = await this.chatRepo.update(chatId, { name: newName });
            return HttpResponse.success("Chat renamed successfully", updatedChat);
        } catch (error) {
            console.error("Error renaming chat:", error);
            return HttpResponse.error("Failed to rename chat");
        }
    }

    // Move a chat to a folder (or remove from folder if folderId is null)
    async moveChatToFolder(userId, chatId, folderId = null) {
        try {
            const chat = await this.chatRepo.getById(chatId);
            if (!chat || chat.userId.toString() !== userId.toString()) {
                return HttpResponse.error("Chat not found or unauthorized", -404);
            }
            const updateData = folderId ? { folderId } : { $unset: { folderId: "" } };
            const updatedChat = await this.chatRepo.update(chatId, updateData);
            return HttpResponse.success("Chat moved successfully", updatedChat);
        } catch (error) {
            console.error("Error moving chat:", error);
            return HttpResponse.error("Failed to move chat");
        }
    }

    // Delete a chat
    async deleteChat(userId, chatId) {
        try {
            const chat = await this.chatRepo.getById(chatId);
            if (!chat || chat.userId.toString() !== userId.toString()) {
                return HttpResponse.error("Chat not found or unauthorized", -404);
            }
            await this.chatRepo.delete(chatId);
            return HttpResponse.success("Chat deleted successfully");
        } catch (error) {
            console.error("Error deleting chat:", error);
            return HttpResponse.error("Failed to delete chat");
        }
    }

    // Paginate chats
    async paginateChats(userId, page = 1, size = 10, folderId = null) {
        try {
            const filter = { userId };
            if (folderId) {
                filter.folderId = folderId;
            }
            const result = await this.chatRepo.paginate(filter, page, size, ["folderId"]);
            return HttpResponse.success("Chats paginated successfully", result);
        } catch (error) {
            console.error("Error paginating chats:", error);
            return HttpResponse.error("Failed to paginate chats");
        }
    }
}

module.exports = new ChatService();