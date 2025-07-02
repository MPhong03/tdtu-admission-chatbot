const BaseRepository = require("../../repositories/common/base.repository");

const Chat = require("../../models/users/chat.model");
const History = require("../../models/users/history.model");
const HttpResponse = require("../../data/responses/http.response");

const ChatRepo = new BaseRepository(Chat);
const HistoryRepo = new BaseRepository(History);

class HistoryService {
    async saveChat({ userId, visitorId, chatId, question, answer, cypher, contextNodes, isError }) {
        try {
            let chat;

            // if (!userId) return HttpResponse.error("Thiếu người dùng", -1);

            // Nếu không có chatId -> tạo mới chat với tên là "Chat #timestamp"
            if (!chatId) {
                chat = await ChatRepo.create({
                    userId,
                    visitorId,
                    name: `Chat ${new Date().toLocaleString()}`
                });
            } else {
                chat = await ChatRepo.getById(chatId);
                if (!chat) {
                    return HttpResponse.error("Chat không tồn tại hoặc không thuộc quyền sở hữu");
                }
            }

            // Tạo lịch sử chat mới
            const history = await HistoryRepo.create({
                userId,
                visitorId: visitorId,
                chatId: chat._id,
                question,
                answer,
                status: isError ? "error" : "success",
                cypher: cypher || "",
                contextNodes: contextNodes ? JSON.stringify(contextNodes) : ""
            });

            return HttpResponse.success("Lưu tin nhắn thành công", { chatId: chat._id, history });
        } catch (error) {
            console.error("Error saving chat:", error);
            return HttpResponse.error("Lỗi hệ thống khi lưu lịch sử chat");
        }
    }

    async getChatHistory({ userId, visitorId, chatId, page = 1, size = 10 }) {
        try {
            const chat = await ChatRepo.getById(chatId);
            const isOwner =
                (chat?.userId && String(chat.userId) === String(userId)) ||
                (chat?.visitorId && chat.visitorId === visitorId);

            if (!chat || !isOwner) {
                return HttpResponse.error("Không tìm thấy đoạn chat này hoặc không có quyền truy cập", -404);
            }

            const skip = (page - 1) * size;

            const historyFilter = { chatId };
            if (userId) historyFilter.userId = userId;
            if (!userId && visitorId) historyFilter.visitorId = visitorId;

            const query = HistoryRepo.asQueryable(historyFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [items, total] = await Promise.all([
                query.exec(),
                HistoryRepo.count(historyFilter)
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

            const mappedHistories = histories.map(h => {
                const user = h.userId
                    ? h.userId
                    : { username: "Vãng lai", email: "unknown" };

                return {
                    ...h.toObject(), // chuyển document về plain object
                    userId: user,
                    isVisitor: !h.userId,
                };
            });

            return HttpResponse.success("Lịch sử Q&A", {
                items: mappedHistories,
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