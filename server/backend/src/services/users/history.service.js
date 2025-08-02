const BaseRepository = require("../../repositories/common/base.repository");

const Chat = require("../../models/users/chat.model");
const History = require("../../models/users/history.model");
const Feedback = require("../../models/users/feedback.model");
const Notification = require("../../models/users/notification.model");
const HttpResponse = require("../../data/responses/http.response");

const ChatRepo = new BaseRepository(Chat);
const HistoryRepo = new BaseRepository(History);
const FeedbackRepo = new BaseRepository(Feedback);
const NotificationRepo = new BaseRepository(Notification);

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
                answer: typeof answer === 'object' && answer?.data ? answer.data : answer,
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

            const historyIds = items.map((h) => h._id);
            const feedbacks = await FeedbackRepo.asQueryable({ historyId: { $in: historyIds } }).select("historyId rating adminReplies comment createdAt updatedAt").exec();
            const feedbackMap = new Map();
            feedbacks.forEach(fb => {
                feedbackMap.set(String(fb.historyId), {
                    _id: fb._id,
                    rating: fb.rating,
                    comment: fb.comment,
                    createdAt: fb.createdAt,
                    updatedAt: fb.updatedAt,
                    adminReplies: fb.adminReplies || []
                });
            });

            const mappedItems = items.map((h) => {
                const obj = h.toObject();
                delete obj.cypher;
                delete obj.contextNodes;

                const feedback = feedbackMap.get(String(h._id));
                return {
                    ...obj,
                    isFeedback: !!feedback,
                    feedback: feedback || null
                };
            });

            return HttpResponse.success("Lấy lịch sử chat thành công", {
                chat: {
                    _id: chat._id,
                    name: chat.name,
                },
                items: mappedItems,
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

    // Lấy history theo ID
    async getHistoryId(chatId) {
        return await HistoryRepo.getById(chatId);
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

    /**
     * Lấy N lịch sử chat gần nhất theo chatId, trả về dạng rút gọn (question + answer)
     */
    async getLastNHistory({ chatId, userId, visitorId, limit = 5 }) {
        try {
            const chat = await ChatRepo.getById(chatId);

            const filter = { chatId };
            if (userId) filter.userId = userId;
            else if (visitorId) filter.visitorId = visitorId;

            const items = await HistoryRepo.asQueryable(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("question answer")
                .exec();

            // Đảo ngược thứ tự để lịch sử cũ trước, mới sau
            const result = items.map(item => ({
                question: item.question,
                answer: item.answer
            }));

            return result;
        } catch (error) {
            console.error("Error getting last N chat history:", error);
            return null;
        }
    }

    /**
     * Cập nhật phản hồi của admin cho một lịch sử chat
     */
    async updateAdminAnswer(historyId, adminId, answer) {
        try {
            const updatedHistory = await HistoryRepo.update(historyId, {
                adminAnswer: answer,
                adminAnswerAt: new Date(),
                isAdminReviewed: true,
                adminId: adminId
            });

            if (updatedHistory) {
                await NotificationRepo.create({
                    userId: updatedHistory.userId,
                    visitorId: updatedHistory.visitorId,
                    chatId: updatedHistory.chatId,
                    type: "admin_reply",
                    message: answer,
                    historyId: updatedHistory._id
                });
            }

            return updatedHistory;
        } catch (error) {
            console.error("Error updating admin answer:", error);
            return null;
        }
    }
}

module.exports = new HistoryService();