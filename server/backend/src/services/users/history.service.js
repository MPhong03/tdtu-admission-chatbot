const BaseRepository = require("../../repositories/common/base.repository");
const BotService = require("../v2/bots/bot.service");

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
    async saveChat({
        userId,
        visitorId,
        chatId,
        question,
        answer,
        cypher,
        contextNodes,
        isError,
        // === NEW FIELDS FOR ENHANCED TRACKING ===
        questionType,
        classificationConfidence,
        classificationReasoning,
        enrichmentSteps,
        enrichmentDetails,
        enrichmentQueries,
        enrichmentResults,
        contextScore,
        contextScoreHistory,
        contextScoreReasons,
        agentSteps,
        processingMethod,
        processingTime,
        verificationInfo
    }) {
        try {
            let chat;

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

            // === DETERMINE STATUS BASED ON ENHANCED LOGIC ===
            let status = 'success';
            if (isError) {
                status = 'error';
            } else if (verificationInfo?.isIncorrect) {
                status = 'incorrect_answer';
            } else if (!answer || answer.trim().length === 0) {
                status = 'unanswered';
            }

            // === PREPARE HISTORY DATA ===
            const historyData = {
                userId,
                visitorId: visitorId,
                chatId: chat._id,
                question,
                answer: typeof answer === 'object' && answer?.data ? answer.data : answer,
                status,
                cypher: cypher || "",
                contextNodes: contextNodes ? JSON.stringify(contextNodes) : "",

                // === CLASSIFICATION INFO ===
                questionType: questionType || 'simple_admission',
                classificationConfidence: classificationConfidence || 0,
                classificationReasoning: classificationReasoning || '',

                // === ENRICHMENT INFO ===
                enrichmentSteps: enrichmentSteps || 0,
                enrichmentDetails: enrichmentDetails || '',
                enrichmentQueries: enrichmentQueries || [],
                enrichmentResults: enrichmentResults || [],

                // === CONTEXT SCORING INFO ===
                contextScore: contextScore || 0,
                contextScoreHistory: contextScoreHistory || [],
                contextScoreReasons: contextScoreReasons || [],

                // === AGENT INFO ===
                agentSteps: agentSteps ? JSON.stringify(agentSteps) : '',
                processingMethod: processingMethod || 'rag_simple',
                processingTime: processingTime || 0,

                // === VERIFICATION INFO ===
                isVerified: verificationInfo?.isVerified || false,
                verificationScore: verificationInfo?.score || 0,
                verificationReason: verificationInfo?.reasoning || ''
            };

            // Tạo lịch sử chat mới
            const history = await HistoryRepo.create(historyData);

            // ===== NEW: TRIGGER ASYNC VERIFICATION =====
            if (history && !isError) {
                // Parse context nodes for verification
                let parsedContextNodes = [];
                try {
                    parsedContextNodes = contextNodes ? JSON.parse(contextNodes) : [];
                } catch (e) {
                    parsedContextNodes = [];
                }

                // Trigger async verification
                await BotService.triggerAsyncVerification(
                    history._id,
                    question,
                    typeof answer === 'object' && answer?.data ? answer.data : answer,
                    parsedContextNodes,
                    questionType || 'simple_admission'
                );
            }

            return HttpResponse.success("Lưu tin nhắn thành công", {
                chatId: chat._id,
                history,
                trackingInfo: {
                    questionType,
                    enrichmentSteps,
                    contextScore,
                    processingMethod,
                    processingTime,
                    verificationInfo: verificationInfo ? {
                        isVerified: verificationInfo.isVerified,
                        score: verificationInfo.score
                    } : null
                }
            });
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
            const feedbacks = await FeedbackRepo.asQueryable({ historyId: { $in: historyIds } })
                .select("historyId rating adminReplies comment createdAt updatedAt")
                .exec();

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

                // Remove sensitive technical data from client response
                delete obj.cypher;
                delete obj.contextNodes;
                delete obj.enrichmentDetails;
                delete obj.agentSteps;

                const feedback = feedbackMap.get(String(h._id));

                return {
                    ...obj,
                    isFeedback: !!feedback,
                    feedback: feedback || null,
                    // === ENHANCED TRACKING INFO FOR CLIENT ===
                    trackingInfo: {
                        questionType: h.questionType,
                        processingMethod: h.processingMethod,
                        enrichmentSteps: h.enrichmentSteps,
                        contextScore: h.contextScore,
                        processingTime: h.processingTime,
                        classificationConfidence: h.classificationConfidence
                    }
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

    // Lấy history theo ID với đầy đủ thông tin technical (cho admin)
    async getHistoryById(historyId, includeDetails = false) {
        try {
            const history = await HistoryRepo.getById(historyId);
            if (!history) {
                return HttpResponse.error("Không tìm thấy lịch sử", -404);
            }

            const result = history.toObject();

            if (includeDetails) {
                // Parse JSON fields for detailed view
                try {
                    if (result.contextNodes) result.contextNodesParsed = JSON.parse(result.contextNodes);
                    if (result.enrichmentDetails) result.enrichmentDetailsParsed = JSON.parse(result.enrichmentDetails);
                    if (result.agentSteps) result.agentStepsParsed = JSON.parse(result.agentSteps);
                } catch (e) {
                    console.warn("Failed to parse JSON fields for history", historyId);
                }
            } else {
                // Remove technical details for non-admin users
                delete result.cypher;
                delete result.contextNodes;
                delete result.enrichmentDetails;
                delete result.agentSteps;
            }

            return HttpResponse.success("Lấy chi tiết lịch sử thành công", result);
        } catch (error) {
            console.error("Error fetching history by ID:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy chi tiết lịch sử");
        }
    }

    // =========== ADMIN METHODS WITH ENHANCED TRACKING ==========
    async getAllChat({ page = 1, size = 10, questionType, status, processingMethod }) {
        try {
            const skip = (page - 1) * size;

            // Build filter
            const filter = {};
            if (questionType) filter.questionType = questionType;
            if (status) filter.status = status;
            if (processingMethod) filter.processingMethod = processingMethod;

            const query = HistoryRepo.asQueryable(filter)
                .populate("userId", "username email")
                .populate("chatId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [histories, totalItems] = await Promise.all([
                query.exec(),
                HistoryRepo.count(filter)
            ]);

            const mappedHistories = histories.map(h => {
                const user = h.userId
                    ? h.userId
                    : { username: "Vãng lai", email: "unknown" };

                const obj = h.toObject();

                // Parse some technical details for admin view
                try {
                    if (obj.enrichmentDetails) {
                        obj.enrichmentSummary = JSON.parse(obj.enrichmentDetails).length;
                    }
                } catch (e) {
                    obj.enrichmentSummary = 0;
                }

                return {
                    ...obj,
                    userId: user,
                    isVisitor: !h.userId,
                    // Enhanced admin tracking
                    performanceMetrics: {
                        questionType: h.questionType,
                        processingMethod: h.processingMethod,
                        enrichmentSteps: h.enrichmentSteps,
                        contextScore: h.contextScore,
                        processingTime: h.processingTime,
                        classificationConfidence: h.classificationConfidence
                    }
                };
            });

            return HttpResponse.success("Lịch sử Q&A", {
                items: mappedHistories,
                pagination: {
                    page,
                    size,
                    totalItems,
                    hasMore: page * size < totalItems
                },
                filters: {
                    questionType,
                    status,
                    processingMethod
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }

    // === ANALYTICS METHODS ===
    async getAnalytics(timeRange = '7d') {
        try {
            const endDate = new Date();
            const startDate = new Date();

            switch (timeRange) {
                case '1d':
                    startDate.setDate(endDate.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 7);
            }

            const pipeline = [
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            questionType: "$questionType",
                            status: "$status",
                            processingMethod: "$processingMethod"
                        },
                        count: { $sum: 1 },
                        avgContextScore: { $avg: "$contextScore" },
                        avgProcessingTime: { $avg: "$processingTime" },
                        avgEnrichmentSteps: { $avg: "$enrichmentSteps" },
                        avgClassificationConfidence: { $avg: "$classificationConfidence" }
                    }
                }
            ];

            const analytics = await HistoryRepo.model.aggregate(pipeline);

            // Calculate totals
            const totalQuestions = analytics.reduce((sum, item) => sum + item.count, 0);
            const questionTypeStats = {};
            const statusStats = {};
            const processingMethodStats = {};

            analytics.forEach(item => {
                const { questionType, status, processingMethod } = item._id;

                if (!questionTypeStats[questionType]) {
                    questionTypeStats[questionType] = { count: 0, percentage: 0 };
                }
                questionTypeStats[questionType].count += item.count;

                if (!statusStats[status]) {
                    statusStats[status] = { count: 0, percentage: 0 };
                }
                statusStats[status].count += item.count;

                if (!processingMethodStats[processingMethod]) {
                    processingMethodStats[processingMethod] = {
                        count: 0,
                        percentage: 0,
                        avgContextScore: 0,
                        avgProcessingTime: 0
                    };
                }
                processingMethodStats[processingMethod].count += item.count;
                processingMethodStats[processingMethod].avgContextScore = item.avgContextScore;
                processingMethodStats[processingMethod].avgProcessingTime = item.avgProcessingTime;
            });

            // Calculate percentages
            Object.keys(questionTypeStats).forEach(key => {
                questionTypeStats[key].percentage = ((questionTypeStats[key].count / totalQuestions) * 100).toFixed(2);
            });

            Object.keys(statusStats).forEach(key => {
                statusStats[key].percentage = ((statusStats[key].count / totalQuestions) * 100).toFixed(2);
            });

            Object.keys(processingMethodStats).forEach(key => {
                processingMethodStats[key].percentage = ((processingMethodStats[key].count / totalQuestions) * 100).toFixed(2);
            });

            return HttpResponse.success("Analytics data", {
                timeRange,
                totalQuestions,
                questionTypeStats,
                statusStats,
                processingMethodStats,
                rawData: analytics
            });

        } catch (error) {
            console.error("Error fetching analytics:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy thống kê");
        }
    }

    /**
     * Lấy N lịch sử chat gần nhất theo chatId, trả về dạng rút gọn (question + answer)
     */
    async getLastNHistory({ chatId, userId, visitorId, limit = 5 }) {
        try {
            const filter = { chatId };
            if (userId) filter.userId = userId;
            else if (visitorId) filter.visitorId = visitorId;

            const items = await HistoryRepo.asQueryable(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select("question answer questionType enrichmentSteps contextScore")
                .exec();

            // Đảo ngược thứ tự để lịch sử cũ trước, mới sau
            const result = items.reverse().map(item => ({
                question: item.question,
                answer: item.answer,
                questionType: item.questionType,
                enrichmentSteps: item.enrichmentSteps,
                contextScore: item.contextScore
            }));

            return result;
        } catch (error) {
            console.error("Error getting last N chat history:", error);
            return [];
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

    /**
     * Update verification status for a history record
     */
    async updateVerificationStatus(historyId, verificationData) {
        try {
            const updatedHistory = await HistoryRepo.update(historyId, {
                isVerified: true,
                verificationScore: verificationData.score || 0,
                verificationReason: verificationData.reason || '',
                status: verificationData.isIncorrect ? 'incorrect_answer' : 'success'
            });

            return updatedHistory;
        } catch (error) {
            console.error("Error updating verification status:", error);
            return null;
        }
    }

    async getVerificationStats(timeRange = '7d') {
        try {
            const stats = await BotService.getVerificationStats(timeRange);
            return HttpResponse.success("Verification statistics", stats);
        } catch (error) {
            console.error("Error getting verification stats:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy thống kê verification");
        }
    }

    async verifyAnswersBatch(historyIds, options = {}) {
        try {
            const results = await BotService.verifyHistoryBatch(historyIds, options);
            return HttpResponse.success("Batch verification completed", {
                results,
                totalProcessed: results.length,
                successCount: results.filter(r => !r.error).length,
                errorCount: results.filter(r => r.error).length
            });
        } catch (error) {
            console.error("Error in batch verification:", error);
            return HttpResponse.error("Lỗi hệ thống khi verify batch");
        }
    }
}

module.exports = new HistoryService();