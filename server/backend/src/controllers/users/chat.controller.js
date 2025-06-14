const HttpResponse = require("../../data/responses/http.response");
const ChatService = require("../../services/users/chat.service");

class ChatController {
    // Create a new chat
    async createChat(req, res) {
        try {
            const { name, folderId } = req.body;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            if (!name) {
                return res.json(HttpResponse.error("Name is required", -400));
            }
            const result = await ChatService.createChat(userId, visitorId, name, folderId);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to create chat", -1, err.message));
        }
    }

    // Get a chat by ID
    async getChatById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.getChatById(userId, visitorId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to retrieve chat", -1, err.message));
        }
    }

    // Get all chats of a user (with optional folder filter)
    async getChatsByUser(req, res) {
        try {
            const { folderId } = req.query;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.getChatsByUser(userId, visitorId, folderId);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to retrieve chats", -1, err.message));
        }
    }

    // Update a chat
    async updateChat(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.updateChat(userId, visitorId, id, updateData);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to update chat", -1, err.message));
        }
    }

    // Rename a chat
    async renameChat(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            if (!name) {
                return res.json(HttpResponse.error("Name is required", -400));
            }
            const result = await ChatService.renameChat(userId, visitorId, id, name);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to rename chat", -1, err.message));
        }
    }

    // Move a chat to a folder
    async moveChatToFolder(req, res) {
        try {
            const { id } = req.params;
            const { folderId } = req.body;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.moveChatToFolder(userId, visitorId, id, folderId);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to move chat", -1, err.message));
        }
    }

    // Delete a chat
    async deleteChat(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.deleteChat(userId, visitorId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to delete chat", -1, err.message));
        }
    }

    // Paginate chats
    async paginateChats(req, res) {
        try {
            const { page = 1, size = 10, folderId } = req.query;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;
            const result = await ChatService.paginateChats(userId, visitorId, parseInt(page), parseInt(size), folderId);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to paginate chats", -1, err.message));
        }
    }
}

module.exports = new ChatController();
