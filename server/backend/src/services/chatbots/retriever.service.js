const EntityRecognizer = require('../regconizers/entity.regconizer');
const IntentRecognizer = require('../regconizers/intent.regconizer');
const RetrieverQueryBuilder = require('../builders/retrieverquery.builder');
const LLMService = require('./llm.service');
const { scoreContextRelevance } = require('../../helpers/improvements/context.scoring');
const { buildPromptWithContext } = require('../../helpers/improvements/prompt.builder');

class RetrieverService {
    /**
     * Tổng pipeline từ câu hỏi → context data
     */
    async retrieveContext(question) {
        // Step 1: Recognize entity
        const entities = await EntityRecognizer.recognizeEntities(question);

        // Step 2: Recognize intent
        const { intents, fields } = await IntentRecognizer.recognizeIntent(question);

        // Step 3: Retrieve nodes (chưa clean lắm vì còn nhiều thông tin không liên quan)
        const contextNodes = await RetrieverQueryBuilder.retrieve(entities, fields);

        return {
            question,
            intents,
            fields,
            contextNodes
        };
    }

    /**
     * Nhận câu hỏi và trả về câu trả lời tự nhiên từ Gemini dựa vào context.
     * @param {string} question
     * @returns {string} answer
     */
    async chatWithBot(question) {
        const { intents } = await IntentRecognizer.recognizeIntent(question);

        if (intents.length === 1 && intents[0] === 'general_info') {
            const prompt = `
                Bạn là một chatbot tuyển sinh của Trường Đại học Tôn Đức Thắng (TDTU).
                
                Người dùng vừa chào hỏi hoặc trò chuyện xã giao.
                Hãy trả lời thân thiện, ngắn gọn, vui vẻ.
                Không cần đưa thêm thông tin học tập nếu không được hỏi.
                
                Câu hỏi:
                ${question}
                
                Trả lời:
          `;
            const answer = await LLMService.generateAnswer(prompt);
            return { prompt, answer };
        }

        const { contextNodes } = await this.retrieveContext(question);

        if (!contextNodes.length) {
            const fallbackPrompt = `
                Bạn là chatbot tuyển sinh. Hiện không có thông tin từ hệ thống.
                Câu hỏi: ${question}
                Hãy trả lời khéo léo và giữ thái độ thân thiện.`;
            const answer = await LLMService.generateAnswer(fallbackPrompt);
            return { prompt: fallbackPrompt, answer };
        }

        // const filteredNodes = await scoreContextRelevance(question, contextNodes);
        const prompt = buildPromptWithContext(question, contextNodes);
        const answer = await LLMService.generateAnswer(prompt);

        return { prompt, answer, contextNodes };
    }
}

module.exports = new RetrieverService();
