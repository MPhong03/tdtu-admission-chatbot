const HttpResponse = require("../../data/responses/http.response");
const BotService = require("../../services/v2/bots/bot.service");
const logger = require("../../utils/logger.util");

class BotController {
    async generateCypher(req, res) {
        try {
            const { question } = req.body;
            if (!question || typeof question !== "string" || !question.trim()) {
                return res.status(400).json(HttpResponse.error('Thiếu hoặc sai định dạng trường "question"'));
            }
            const data = await BotService.generateCypher(question);
            return res.json(HttpResponse.success('Sinh câu lệnh Cypher thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Lẫy ngữ cảnh từ câu hỏi
     */
    async generateCypherAndQuery(req, res) {
        try {
            const { question } = req.body;
            if (!question || typeof question !== "string" || !question.trim()) {
                return res.status(400).json(HttpResponse.error('Thiếu câu hỏi'));
            }
            // 1. Sinh Cypher + labels
            const { cypher, labels } = await BotService.generateCypher(question);
            // 2. Truy vấn context từ Cypher
            const nodes = await BotService.getContextFromCypher(cypher);
            // 3. Trả về cả cypher, labels, nodes
            return res.json(HttpResponse.success('Truy vấn thành công', { cypher, labels, nodes }));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new BotController();