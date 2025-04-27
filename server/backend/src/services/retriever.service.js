const EntityRecognizer = require('./regconizers/entity.regconizer');
const IntentRecognizer = require('./regconizers/intent.regconizer');
const RetrieverQueryBuilder = require('./builders/retrieverquery.builder');
const LLMService = require('./llm.service');

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
        // Step 1: recognize intent
        const { intents } = await IntentRecognizer.recognizeIntent(question);
    
        // Nếu chỉ là chào hỏi, general info -> không load context
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
    
        // Nếu thực sự cần truy vấn thông tin (ask_fee, ask_degree, etc.)
        const { contextNodes } = await this.retrieveContext(question);
    
        if (!contextNodes.length) {
            return {
                prompt: question,
                answer: "Xin lỗi, tôi không có thông tin về câu hỏi này."
            };
        }
    
        // Chuẩn bị context text
        const contextStrings = contextNodes.map(node => {
            let contentParts = [];
            if (node.name) contentParts.push(`Tên: ${node.name}`);
            if (node.description) contentParts.push(`Mô tả: ${node.description}`);
            if (node.content) {
                for (const [key, value] of Object.entries(node.content)) {
                    contentParts.push(`${key}: ${value}`);
                }
            }
            return contentParts.join('\n');
        });
    
        const fullContext = contextStrings.join('\n\n');
    
        // Tạo prompt chính
        const prompt = `
            Bạn là một chatbot hỗ trợ tuyển sinh của Trường Đại học Tôn Đức Thắng (TDTU).
    
            Dưới đây là các ngữ cảnh khác nhau về các ngành, chương trình đào tạo tại trường.
    
            - **Chỉ đọc và sử dụng những ngữ cảnh có nội dung liên quan trực tiếp đến câu hỏi.**
            - **Nếu ngữ cảnh không phù hợp hoặc không tìm thấy thông tin liên quan, hãy trả lời: "Xin lỗi, tôi không có thông tin về câu hỏi này."**
            - **Tuyệt đối không bịa đặt, không tự suy diễn thêm nội dung ngoài ngữ cảnh được cung cấp.**
            - **Trả lời ngắn gọn, súc tích, dễ hiểu, đúng trọng tâm câu hỏi.**
    
            Ngữ cảnh:
            """
            ${fullContext}
            """
    
            Câu hỏi:
            ${question}
    
            Trả lời:
        `;
    
        const answer = await LLMService.generateAnswer(prompt);
        return { prompt, answer };
    }    
}

module.exports = new RetrieverService();
