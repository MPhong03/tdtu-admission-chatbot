const HttpResponse = require("../data/responses/http.response");
const LLMService = require("../services/llm.service");
const RetrieverService = require('../services/retriever.service');

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
            const { question } = req.body;
            if (!question) return res.json(HttpResponse.error("Thiếu câu hỏi", -1));
    
            const { answer, prompt } = await RetrieverService.chatWithBot(question);

            return res.json(HttpResponse.success("Nhận kết quả: ", { answer, prompt }));
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
}

module.exports = new ChatbotController();
