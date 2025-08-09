const HttpResponse = require("../data/responses/http.response");
const LLMService = require("../services/chatbots/llm.service");
const RetrieverService = require('../services/chatbots/retriever.service');
const HistoryService = require("../services/users/history.service");
const EntityRecognizer = require('../services/regconizers/entity.regconizer');
const BotService = require("../services/v2/bots/bot.service");
const VisitorRateLimitService = require("../services/visitor-rate-limit.service");

class ChatbotController {
    constructor() {
        this.visitorRateLimitService = new VisitorRateLimitService();
    }

    async chatWithBot(req, res) {
        try {
            const { question, chatId } = req.body;
            const userId = req.user?.id || null;

            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            // let questionEmbedding = await LLMService.getEmbeddingV2(question);
            let questionEmbedding = null;

            const chatHistory = await HistoryService.getLastNHistory({
                chatId,
                userId,
                limit: 5
            });

            console.log("Chat history:", chatHistory);

            // 1. Gọi AI để lấy câu trả lời với enhanced tracking
            const result = await BotService.generateAnswer(question, questionEmbedding, chatHistory);

            // Extract all the enhanced tracking data
            const {
                answer,
                prompt,
                contextNodes,
                isError,
                cypher,
                // === ENHANCED TRACKING DATA ===
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
                category,
                classification
            } = result;

            // 2. Lưu vào lịch sử chat với enhanced data
            const saveResult = await HistoryService.saveChat({
                userId,
                visitorId: req.isVisitor ? req.visitorId : null,
                chatId,
                question,
                answer,
                cypher,
                contextNodes,
                isError,
                // === ENHANCED TRACKING FIELDS ===
                questionType: questionType || category || 'simple_admission',
                classificationConfidence: classificationConfidence || classification?.confidence || 0,
                classificationReasoning: classificationReasoning || classification?.reasoning || '',
                enrichmentSteps: enrichmentSteps || 0,
                enrichmentDetails: enrichmentDetails || '',
                enrichmentQueries: enrichmentQueries || [],
                enrichmentResults: enrichmentResults || [],
                contextScore: contextScore || 0,
                contextScoreHistory: contextScoreHistory || [],
                contextScoreReasons: contextScoreReasons || [],
                agentSteps: agentSteps || [],
                processingMethod: processingMethod || 'rag_simple',
                processingTime: processingTime || 0
            });

            if (saveResult.Code !== 1) {
                console.warn("Lưu lịch sử thất bại:", saveResult.Message);
            }

            // 3. Tăng counter cho visitor rate limit (nếu là visitor)
            if (req.isVisitor && req.visitorId) {
                try {
                    await this.visitorRateLimitService.incrementCounter(req.visitorId, 'chat');
                } catch (error) {
                    console.warn("Không thể tăng counter cho visitor rate limit:", error.message);
                }
            }

            // 4. Trả về cho frontend với enhanced tracking info
            return res.json(
                HttpResponse.success("Nhận kết quả", {
                    answer,
                    prompt,
                    contextNodes,
                    chatId: saveResult?.Data?.chatId || chatId,
                    visitorId: req.isVisitor ? req.visitorId : null,
                    historyId: saveResult?.Data?.history?._id || null,
                    // === TRACKING INFO FOR CLIENT ===
                    trackingInfo: {
                        questionType: questionType || category || 'simple_admission',
                        processingMethod: processingMethod || 'rag_simple',
                        enrichmentSteps: enrichmentSteps || 0,
                        contextScore: contextScore || 0,
                        processingTime: processingTime || 0,
                        classificationConfidence: classificationConfidence || classification?.confidence || 0
                    }
                })
            );
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    async getHistory(req, res) {
        try {
            const { chatId } = req.params;
            const { page = 1, size = 10 } = req.query;
            const userId = req.user?.id;
            const visitorId = req?.visitorId;

            const result = await HistoryService.getChatHistory({
                userId,
                visitorId,
                chatId,
                page: parseInt(page),
                size: parseInt(size)
            });

            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi lấy lịch sử chat", -1, err.message));
        }
    }

    async getHistoryDetail(req, res) {
        try {
            const { historyId } = req.params;
            const isAdmin = req.user?.role === 'admin'; // Assume role-based access

            const result = await HistoryService.getHistoryById(historyId, isAdmin);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi lấy chi tiết lịch sử", -1, err.message));
        }
    }

    async getAnalytics(req, res) {
        try {
            const { timeRange = '7d' } = req.query;

            // Check admin permission
            if (req.user?.role !== 'admin') {
                return res.json(HttpResponse.error("Không có quyền truy cập", -403));
            }

            const result = await HistoryService.getAnalytics(timeRange);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi lấy thống kê", -1, err.message));
        }
    }

    async getAdminHistory(req, res) {
        try {
            const {
                page = 1,
                size = 10,
                questionType,
                status,
                processingMethod
            } = req.query;

            // Check admin permission
            if (req.user?.role !== 'admin') {
                return res.json(HttpResponse.error("Không có quyền truy cập", -403));
            }

            const result = await HistoryService.getAllChat({
                page: parseInt(page),
                size: parseInt(size),
                questionType,
                status,
                processingMethod
            });

            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi lấy lịch sử admin", -1, err.message));
        }
    }

    async updateVerification(req, res) {
        try {
            const { historyId } = req.params;
            const { score, reason, isIncorrect } = req.body;

            // Check admin permission
            if (req.user?.role !== 'admin') {
                return res.json(HttpResponse.error("Không có quyền truy cập", -403));
            }

            const result = await HistoryService.updateVerificationStatus(historyId, {
                score,
                reason,
                isIncorrect
            });

            if (result) {
                return res.json(HttpResponse.success("Cập nhật verification thành công", result));
            } else {
                return res.json(HttpResponse.error("Cập nhật verification thất bại", -1));
            }
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi cập nhật verification", -1, err.message));
        }
    }

    // === EXISTING METHODS ===

    async getEmbedding(req, res) {
        try {
            const { text } = req.body;
            const embedding = await LLMService.getEmbeddingV2(text);
            return res.json(HttpResponse.success("Nhận kết quả: ", embedding));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    async getEmbeddings(req, res) {
        try {
            const { source, targets } = req.body;
            const results = await LLMService.compareSimilarityV2(source, targets);
            return res.json(HttpResponse.success("Nhận kết quả: ", results));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    // === DEBUGGING/TESTING ENDPOINTS (FOR DEVELOPMENT) ===

    async testEnrichment(req, res) {
        try {
            const { question } = req.body;

            if (!question) {
                return res.json(HttpResponse.error("Thiếu câu hỏi", -1));
            }

            // Only for development/testing
            if (process.env.NODE_ENV === 'production') {
                return res.json(HttpResponse.error("Endpoint không khả dụng trong production", -403));
            }

            const result = await BotService.generateAnswer(question, null, []);

            return res.json(HttpResponse.success("Test enrichment", {
                questionType: result.questionType,
                enrichmentSteps: result.enrichmentSteps,
                contextScore: result.contextScore,
                contextScoreHistory: result.contextScoreHistory,
                agentSteps: result.agentSteps,
                processingTime: result.processingTime
            }));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi test enrichment", -1, err.message));
        }
    }
}

module.exports = new ChatbotController();
