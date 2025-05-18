const EntityRecognizer = require('../regconizers/entity.regconizer');
const IntentRecognizer = require('../regconizers/intent.regconizer');
const RetrieverQueryBuilder = require('../builders/retrieverquery.builder');
const LLMService = require('./llm.service');
const { scoreContextRelevance } = require('../../helpers/improvements/context.scoring');
const PromptBuilder = require('../../helpers/improvements/prompt.builder');

class RetrieverService {
    /**
     * Nhận diện thực thể và lấy context relevance.
     * @param {string} question
     * @returns {Object} {entities, contextNodes}
     */
    async processQuestion(question) {
        // Step 1: Nhận diện thực thể
        console.time("Entity recognition");
        const rawEntities = await EntityRecognizer.recognizeEntities(question);
        console.timeEnd("Entity recognition");

        // Ẩn trường embedding (deep clone nếu cần)
        const entities = rawEntities.map(({ embedding, ...rest }) => rest);

        // Step 2: Truy vấn dữ liệu liên quan
        console.time("Retrieve related nodes");
        const rawContext = await RetrieverQueryBuilder.retrieve(entities);
        console.timeEnd("Retrieve related nodes");

        // Step 3: Score context relevance
        console.time("Score context relevance");
        const contextNodes = await scoreContextRelevance(question, rawContext, 10); // top 5
        console.timeEnd("Score context relevance");

        return { entities, contextNodes };
    }

    /**
     * Tổng pipeline từ câu hỏi → context data
     */
    async retrieveContext(question) {
        const { entities, contextNodes } = await this.processQuestion(question);

        return {
            question,
            entities,
            contextNodes
        };
    }

    /**
     * Nhận câu hỏi và trả về câu trả lời tự nhiên từ Gemini dựa vào context.
     * @param {string} question
     * @returns {string} answer
     */
    async chatWithBot(question) {
        console.time("Total chatWithBot");

        // Step 1 & 2: Nhận diện thực thể và truy vấn dữ liệu liên quan
        const { entities, contextNodes } = await this.processQuestion(question);

        // Step 3: Nếu không có dữ liệu → fallback
        if (!contextNodes.length) {
            const fallbackPrompt = `Bạn là chatbot tuyển sinh. Hiện không có thông tin từ hệ thống.
            Câu hỏi: ${question}
            Hãy trả lời khéo léo và giữ thái độ thân thiện.`;

            console.time("Gemini generate answer (fallback)");
            const answer = await LLMService.generateAnswer(fallbackPrompt);
            console.timeEnd("Gemini generate answer (fallback)");

            console.timeEnd("Total chatWithBot");
            return { prompt: fallbackPrompt, answer };
        }

        // Step 4: Dùng PromptBuilder mới
        const prompt = PromptBuilder.build(question, contextNodes);

        console.time("Gemini generate answer (with context)");
        const answer = await LLMService.generateAnswer(prompt);
        console.timeEnd("Gemini generate answer (with context)");

        console.timeEnd("Total chatWithBot");

        return { prompt, answer, contextNodes };
    }
}

module.exports = new RetrieverService();
