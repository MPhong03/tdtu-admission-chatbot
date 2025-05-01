const HttpResponse = require("../data/responses/http.response");
const LLMService = require("../services/chatbots/llm.service");
const RetrieverService = require('../services/chatbots/retriever.service');
const HistoryService = require("../services/users/history.service");

class ChatbotController {
    async retrieveContext(req, res) {
        try {
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            const context = await RetrieverService.retrieveContext(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", context));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Tạo nhóm ngành thất bại", -1, err.message));
        }
    }

    async chatWithBot(req, res) {
        try {
            const { question, chatId } = req.body;
            const userId = req.user?.id;

            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            // 1. Gọi AI để lấy câu trả lời
            const { answer, prompt, contextNodes } = await RetrieverService.chatWithBot(question);

            // 2. Lưu vào lịch sử chat
            const saveResult = await HistoryService.saveChat({
                userId,
                chatId,
                question,
                answer
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
                    chatId: saveResult?.Data?.chatId || chatId
                })
            );
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Error: ", -1, err.message));
        }
    }

    async testChat(req, res) {
        try {
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));

            const answer = await LLMService.generateAnswer(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", answer));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Error: ", -1, err.message));
        }
    }

    async getHistory(req, res) {
        try {
            const { chatId } = req.params;
            const { page = 1, size = 10 } = req.query;
            const userId = req.user.id;

            const history = await HistoryService.getChatHistory({
                userId,
                chatId,
                page: parseInt(page),
                size: parseInt(size)
            });

            return res.json(HttpResponse.success("Nhận kết quả: ", history));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Error: ", -1, err.message));
        }
    }
}

module.exports = new ChatbotController();
