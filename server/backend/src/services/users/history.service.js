const BaseRepository = require("../../repositories/common/base.repository");

const Chat = require("../../models/users/chat.model");
const History = require("../../models/users/history.model");
const HttpResponse = require("../../data/responses/http.response");

const ChatRepo = new BaseRepository(Chat);
const HistoryRepo = new BaseRepository(History);

class HistoryService {
    async saveChat({ userId, chatId, question, answer, isError }) {
        try {
            let chat;

            if (!userId) return HttpResponse.error("Thiếu người dùng", -1);

            // Nếu không có chatId -> tạo mới chat với tên là "Chat #timestamp"
            if (!chatId) {
                chat = await ChatRepo.create({
                    userId,
                    name: `Chat ${new Date().toLocaleString()}`
                });
            } else {
                chat = await ChatRepo.getById(chatId);
                if (!chat || String(chat.userId) !== String(userId)) {
                    return HttpResponse.error("Chat không tồn tại hoặc không thuộc quyền sở hữu");
                }
            }

            // Tạo lịch sử chat mới
            const history = await HistoryRepo.create({
                userId,
                chatId: chat._id,
                question,
                answer,
                status: isError ? "error" : "success"
            });

            return HttpResponse.success("Lưu tin nhắn thành công", { chatId: chat._id, history });
        } catch (error) {
            console.error("Error saving chat:", error);
            return HttpResponse.error("Lỗi hệ thống khi lưu lịch sử chat");
        }
    }

    async getChatHistory({ userId, chatId, page = 1, size = 10 }) {
        try {
            const chat = await ChatRepo.getById(chatId);
            if (!chat || String(chat.userId) !== String(userId)) {
                return HttpResponse.error("Không tìm thấy đoạn chat này");
            }

            const skip = (page - 1) * size;

            const query = HistoryRepo.asQueryable({ chatId, userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [items, total] = await Promise.all([
                query.exec(),
                HistoryRepo.count({ chatId, userId })
            ]);

            return HttpResponse.success("Lấy lịch sử chat thành công", {
                items,
                pagination: {
                    page: Number(page),
                    size: Number(size),
                    hasMore: page * size < total,
                    totalItems: total,
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }

    // =========== ADMIN ==========
    async getAllChat({ page = 1, size = 10 }) {
        try {
            const skip = (page - 1) * size;

            const query = HistoryRepo.asQueryable()
                .populate("userId", "username email")
                .populate("chatId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [histories, totalItems] = await Promise.all([
                query.exec(),
                HistoryRepo.count()
            ]);

            return HttpResponse.success("Lịch sử Q&A", {
                items: histories,
                pagination: {
                    page,
                    size,
                    totalItems,
                    hasMore: page * size < totalItems
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }
}

module.exports = new HistoryService();