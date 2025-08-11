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
    async saveChat(data) {
        try {
            const {
                userId,
                visitorId,
                chatId,
                question,
                answer,
                cypher,
                contextNodes,
                isError,
                // === ENHANCED TRACKING FIELDS ===
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
                // === ERROR CLASSIFICATION ===
                errorType,
                errorDetails
            } = data;

            // Xác định trạng thái và loại lỗi
            let status = 'success';
            let finalErrorType = 'none';
            let finalErrorDetails = {};

            if (isError) {
                status = 'error';
                // Phân loại lỗi dựa trên errorDetails hoặc tự động detect
                if (errorType) {
                    finalErrorType = errorType;
                    finalErrorDetails = errorDetails || {};
                } else {
                    // Tự động phân loại lỗi dựa trên answer hoặc context
                    if (answer && answer.toLowerCase().includes('rate limit')) {
                        finalErrorType = 'api_rate_limit';
                    } else if (answer && answer.toLowerCase().includes('timeout')) {
                        finalErrorType = 'api_timeout';
                    } else if (answer && answer.toLowerCase().includes('quota')) {
                        finalErrorType = 'api_quota_exceeded';
                    } else if (answer && answer.toLowerCase().includes('cypher')) {
                        finalErrorType = 'cypher_error';
                    } else if (answer && answer.toLowerCase().includes('context')) {
                        finalErrorType = 'context_not_found';
                    } else {
                        finalErrorType = 'system_error';
                    }
                }
            }

            const historyData = {
                userId,
                visitorId,
                chatId,
                question,
                answer,
                status,
                errorType: finalErrorType,
                errorDetails: finalErrorDetails,
                cypher,
                contextNodes: JSON.stringify(contextNodes || []),
                questionType: questionType || 'simple_admission',
                classificationConfidence: classificationConfidence || 0,
                classificationReasoning: classificationReasoning || '',
                enrichmentSteps: enrichmentSteps || 0,
                enrichmentDetails: typeof enrichmentDetails === 'string' ? enrichmentDetails : JSON.stringify(enrichmentDetails || []),
                enrichmentQueries: Array.isArray(enrichmentQueries) ? enrichmentQueries : [],
                enrichmentResults: Array.isArray(enrichmentResults) ? enrichmentResults : [],
                contextScore: contextScore || 0,
                contextScoreHistory: Array.isArray(contextScoreHistory) ? contextScoreHistory : [],
                contextScoreReasons: Array.isArray(contextScoreReasons) ? contextScoreReasons : [],
                agentSteps: Array.isArray(agentSteps) ? JSON.stringify(agentSteps) : (agentSteps || ''),
                processingMethod: processingMethod || 'rag_simple',
                processingTime: processingTime || 0,
                // === VERIFICATION FIELDS ===
                isVerified: data.isVerified || false,
                verificationScore: data.verificationScore || 0,
                verificationReason: data.verificationReason || '',
                verificationResult: data.verificationResult || 'pending'
            };

            const result = await HistoryRepo.create(historyData);

            return HttpResponse.success("Lưu lịch sử chat thành công", {
                chatId: result.chatId || chatId,
                history: result
            });
        } catch (error) {
            console.error("Error saving chat history:", error);
            return HttpResponse.error("Lỗi lưu lịch sử chat", -1, error.message);
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
                        classificationConfidence: h.classificationConfidence,
                        // === VERIFICATION INFO ===
                        isVerified: h.isVerified,
                        verificationScore: h.verificationScore,
                        verificationResult: h.verificationResult
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
    async getAllChat({ page = 1, size = 10, questionType, status, processingMethod, isVerified, verificationResult }) {
        try {
            const skip = (page - 1) * size;

            // Build filter
            const filter = {};
            if (questionType) filter.questionType = questionType;
            if (status) filter.status = status;
            if (processingMethod) filter.processingMethod = processingMethod;
            if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
            if (verificationResult) filter.verificationResult = verificationResult;

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

                // Calculate contextScore manually from contextScoreHistory if available
                const contextScoreInfo = this.calculateContextScoreFromHistory(h.contextScore, h.contextScoreHistory);

                return {
                    ...obj,
                    userId: user,
                    isVisitor: !h.userId,
                    // Enhanced admin tracking
                    performanceMetrics: {
                        questionType: h.questionType,
                        processingMethod: h.processingMethod,
                        enrichmentSteps: h.enrichmentSteps,
                        contextScore: contextScoreInfo.calculatedScore,
                        contextScoreSource: contextScoreInfo.source,
                        contextScoreHistory: h.contextScoreHistory || [],
                        contextScoreHistoryCount: contextScoreInfo.historyCount,
                        processingTime: h.processingTime,
                        classificationConfidence: h.classificationConfidence
                    },
                    // === VERIFICATION METRICS ===
                    verificationMetrics: {
                        isVerified: h.isVerified,
                        verificationScore: h.verificationScore,
                        verificationResult: h.verificationResult,
                        verificationReason: h.verificationReason
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
                    processingMethod,
                    isVerified,
                    verificationResult
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }

    // === ANALYTICS METHODS ===
    async getAnalytics(timeRange = '7d', includeVerification = true) {
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
                        avgClassificationConfidence: { $avg: "$classificationConfidence" },
                        ...(includeVerification && {
                            // === VERIFICATION STATS ===
                            avgVerificationScore: { $avg: "$verificationScore" },
                            verifiedCount: { $sum: { $cond: ["$isVerified", 1, 0] } },
                            correctCount: { $sum: { $cond: [{ $eq: ["$verificationResult", "correct"] }, 1, 0] } },
                            incorrectCount: { $sum: { $cond: [{ $eq: ["$verificationResult", "incorrect"] }, 1, 0] } }
                        })
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

                // === ACCUMULATE VERIFICATION STATS ===
                if (includeVerification && verificationStats) {
                    verificationStats.totalVerified += item.verifiedCount || 0;
                    verificationStats.totalCorrect += item.correctCount || 0;
                    verificationStats.totalIncorrect += item.incorrectCount || 0;
                }
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

            // === CALCULATE VERIFICATION PERCENTAGES ===
            if (includeVerification && verificationStats) {
                if (verificationStats.totalVerified > 0) {
                    verificationStats.verificationRate = ((verificationStats.totalVerified / totalQuestions) * 100).toFixed(2);
                    verificationStats.accuracyRate = ((verificationStats.totalCorrect / verificationStats.totalVerified) * 100).toFixed(2);
                } else {
                    verificationStats.verificationRate = 0;
                    verificationStats.accuracyRate = 0;
                }
            }

            return HttpResponse.success("Analytics data", {
                timeRange,
                totalQuestions,
                questionTypeStats,
                statusStats,
                processingMethodStats,
                ...(includeVerification && { verificationStats }),
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
            const updateData = {
                isVerified: true,
                verificationScore: verificationData.score || 0,
                verificationReason: verificationData.reason || '',
                verificationResult: verificationData.isIncorrect ? 'incorrect' : 'correct'
            };

            // Update status only if verification indicates incorrect answer
            if (verificationData.isIncorrect) {
                updateData.status = 'incorrect_answer';
            }

            const updatedHistory = await HistoryRepo.update(historyId, updateData);

            return updatedHistory;
        } catch (error) {
            console.error("Error updating verification status:", error);
            return null;
        }
    }

    async getVerificationStats(timeRange = '7d') {
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
                        _id: null,
                        totalQuestions: { $sum: 1 },
                        totalVerified: { $sum: { $cond: ["$isVerified", 1, 0] } },
                        totalCorrect: { $sum: { $cond: [{ $eq: ["$verificationResult", "correct"] }, 1, 0] } },
                        totalIncorrect: { $sum: { $cond: [{ $eq: ["$verificationResult", "incorrect"] }, 1, 0] } },
                        totalPending: { $sum: { $cond: [{ $eq: ["$verificationResult", "pending"] }, 1, 0] } },
                        avgVerificationScore: { $avg: "$verificationScore" },
                        avgContextScore: { $avg: "$contextScore" },
                        avgProcessingTime: { $avg: "$processingTime" }
                    }
                }
            ];

            const stats = await HistoryRepo.model.aggregate(pipeline);
            const result = stats[0] || {};

            // Calculate percentages
            if (result.totalQuestions > 0) {
                result.verificationRate = ((result.totalVerified / result.totalQuestions) * 100).toFixed(2);
                result.accuracyRate = result.totalVerified > 0 ? ((result.totalCorrect / result.totalVerified) * 100).toFixed(2) : 0;
            } else {
                result.verificationRate = 0;
                result.accuracyRate = 0;
            }

            return HttpResponse.success("Verification statistics", result);
        } catch (error) {
            console.error("Error getting verification stats:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy thống kê verification");
        }
    }

    async verifyAnswersBatch(historyIds, options = {}) {
        try {
            // Get histories that need verification
            const histories = await HistoryRepo.asQueryable({ 
                _id: { $in: historyIds },
                isVerified: { $ne: true } // Only verify unverified histories
            }).exec();

            const results = [];
            
            for (const history of histories) {
                try {
                    // Perform verification using BotService
                    const verification = await BotService.performAnswerVerification(
                        history.question,
                        history.answer,
                        JSON.parse(history.contextNodes || '[]'),
                        history.questionType || 'simple_admission',
                        history.contextScore || 0
                    );

                    // Update verification status
                    const updatedHistory = await this.updateVerificationStatus(history._id, {
                        score: verification.score,
                        reason: verification.reasoning,
                        isIncorrect: verification.isIncorrect
                    });

                    results.push({
                        historyId: history._id,
                        success: true,
                        verification: verification,
                        updated: !!updatedHistory
                    });
                } catch (error) {
                    results.push({
                        historyId: history._id,
                        success: false,
                        error: error.message
                    });
                }
            }

            return HttpResponse.success("Batch verification completed", {
                results,
                totalProcessed: results.length,
                successCount: results.filter(r => r.success).length,
                errorCount: results.filter(r => !r.success).length
            });
        } catch (error) {
            console.error("Error in batch verification:", error);
            return HttpResponse.error("Lỗi hệ thống khi verify batch");
        }
    }

    // ===== HELPER METHODS =====
    
    /**
     * Calculate contextScore from contextScoreHistory if available
     * @param {number} contextScore - Original contextScore from database
     * @param {Array} contextScoreHistory - Array of context scores
     * @returns {Object} { calculatedScore, source, historyCount }
     */
    calculateContextScoreFromHistory(contextScore, contextScoreHistory) {
        let calculatedScore = contextScore;
        let source = 'database';
        let historyCount = 0;
        
        if (contextScoreHistory && Array.isArray(contextScoreHistory) && contextScoreHistory.length > 0) {
            // Filter valid scores and calculate average
            const validScores = contextScoreHistory.filter(score => 
                typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 1
            );
            
            if (validScores.length > 0) {
                const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
                calculatedScore = Math.round(averageScore * 1000) / 1000; // Round to 3 decimal places
                source = `calculated_from_history`;
                historyCount = validScores.length;
            }
        }
        
        return {
            calculatedScore,
            source,
            historyCount
        };
    }
}

module.exports = new HistoryService();