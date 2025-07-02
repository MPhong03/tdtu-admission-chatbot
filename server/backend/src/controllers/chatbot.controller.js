const HttpResponse = require("../data/responses/http.response");
const LLMService = require("../services/chatbots/llm.service");
const RetrieverService = require('../services/chatbots/retriever.service');
const HistoryService = require("../services/users/history.service");
const EntityRecognizer = require('../services/regconizers/entity.regconizer');
const BotService = require("../services/v2/bots/bot.service");

class ChatbotController {
    async retrieveEntities(req, res) {
        try {
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            const entities = await EntityRecognizer.recognizeEntities_V2(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", entities));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    async retrieveContext(req, res) {
        try {
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            const context = await RetrieverService.retrieveContext(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", context));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    async chatWithBot(req, res) {
        try {
            const { question, chatId } = req.body;
            const userId = req.user?.id || null;

            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            // 1. Gọi AI để lấy câu trả lời
            const { answer, prompt, contextNodes, isError, cypher } = await BotService.generateAnswer(question);

            // 2. Lưu vào lịch sử chat
            const saveResult = await HistoryService.saveChat({
                userId,
                visitorId: req.isVisitor ? req.visitorId : null,
                chatId,
                question,
                answer,
                cypher,
                contextNodes,
                isError
            });

            if (saveResult.Code !== 1) {
                console.warn("Lưu lịch sử thất bại:", saveResult.Message);
            }

            // 3. Trả về cho frontend
            return res.json(
                HttpResponse.success("Nhận kết quả", {
                    answer,
                    prompt,
                    contextNodes,
                    chatId: saveResult?.Data?.chatId || chatId,
                    visitorId: req.isVisitor ? req.visitorId : null,
                })
            );
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi: ", -1, err.message));
        }
    }

    async testChat(req, res) {
        try {
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            const { answer, isError } = await LLMService.generateAnswer(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", answer));
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

            return res.json(HttpResponse.success("Nhận kết quả: ", result));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lỗi lấy lịch sử chat", -1, err.message));
        }
    }

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
}

module.exports = new ChatbotController();
