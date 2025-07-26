const logger = require("../../../utils/logger.util");

class AnswerService {
    constructor(geminiService, promptService, cacheService, cypherService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        this.cypher = cypherService;
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 2;
    }

    async generateSimpleAnswer(question, questionEmbedding, chatHistory = []) {
        let retries = 0;
        let lastError = null;
        let cypherResult = null;
        let contextNodes = [];
        let cypher = "";
        let prompt = "";
        let answer = "";
        let isError = false;
        let is_social = false;

        const startTime = Date.now();

        // 1. Generate cypher
        while (retries < this.maxRetries) {
            try {
                cypherResult = await this.cypher.generateCypher(question, questionEmbedding);
                cypher = cypherResult?.cypher;
                is_social = cypherResult?.is_social || false;

                if (is_social) {
                    const socialAnswer = await this.generateSocialResponse(question, chatHistory);
                    const totalTime = (Date.now() - startTime) / 1000;
                    return {
                        answer: socialAnswer,
                        prompt: "",
                        cypher: "",
                        contextNodes: [],
                        isError: false,
                        is_social: true,
                        processingTime: totalTime
                    };
                }

                if (!cypher || typeof cypher !== "string" || !cypher.trim()) {
                    retries++;
                    continue;
                }
                break;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        if (!cypher || typeof cypher !== "string" || !cypher.trim()) {
            const fallbackAnswer = await this.generateSocialResponse(question, chatHistory);
            return {
                answer: fallbackAnswer,
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false
            };
        }

        // 2. Get context nodes
        contextNodes = await this.cypher.executeQuery(cypher);

        // 3. Generate answer
        const limitedHistory = chatHistory.slice(-2);
        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 150)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        prompt = this.prompts.buildPrompt('answer', {
            user_question: question,
            context_json: JSON.stringify(contextNodes.slice(0, 15), null, 2),
            chat_history: historyText
        });

        retries = 0;
        while (retries < this.maxRetries) {
            try {
                const cacheKey = this.cache.generateCacheKey(prompt, 'simple_answer');
                answer = await this.cache.get(cacheKey);

                if (!answer) {
                    answer = await this.gemini.queueRequest(prompt);
                    if (answer) {
                        await this.cache.set(cacheKey, answer);
                    }
                }

                if (answer) {
                    const totalTime = (Date.now() - startTime) / 1000;
                    return {
                        answer,
                        prompt,
                        cypher,
                        contextNodes,
                        isError: false,
                        is_social: false,
                        processingTime: totalTime
                    };
                }
                lastError = new Error("Gemini returned empty response");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        return {
            answer: "Xin lỗi, tôi không thể trả lời do lỗi hệ thống.",
            prompt,
            cypher,
            contextNodes,
            isError: true,
            is_social: false
        };
    }

    async generateSocialResponse(question, chatHistory) {
        try {
            const prompt = this.prompts.buildPrompt('social', {
                user_question: question
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'social');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            return result || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }

    async generateOffTopicResponse(question, classification, chatHistory) {
        try {
            const prompt = this.prompts.buildPrompt('offTopic', {
                user_question: question
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'off_topic');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            return {
                answer: result || `Cảm ơn bạn đã hỏi! Tuy nhiên câu hỏi này không liên quan đến tuyển sinh TDTU. Tôi chuyên hỗ trợ thông tin về các ngành học, học phí, và tư vấn tuyển sinh tại TDTU. Bạn có muốn tìm hiểu về ngành nào không ạ?`,
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false,
                category: 'off_topic',
                processingMethod: 'llm_social'
            };
        } catch (error) {
            logger.error("[OffTopic] Handler failed:", error);
            return {
                answer: "Tôi chuyên hỗ trợ thông tin tuyển sinh TDTU. Bạn có câu hỏi nào về học phí, ngành học, hay thông tin tuyển sinh không ạ?",
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false,
                category: 'off_topic',
                processingMethod: 'fallback'
            };
        }
    }

    generateInappropriateResponse(question, classification) {
        const warningMessage = `
**Xin lỗi, tôi không thể trả lời câu hỏi này vì nội dung không phù hợp.**
> Đây là lời nhắc nhở về việc duy trì môi trường giao tiếp lịch sự và tôn trọng.

---

### Tôi là trợ lý tuyển sinh TDTU, chuyên hỗ trợ các nội dung:
- **Ngành học & chương trình đào tạo**
- **Học phí & học bổng**
- **Thông tin tuyển sinh & điều kiện đầu vào**
- **Tư vấn chọn ngành học phù hợp**

---

**Liên hệ hỗ trợ:**
- Điện thoại: [1900 2024 (phím 2)](tel:19002024)
- Email: [tuyensinh@tdtu.edu.vn](mailto:tuyensinh@tdtu.edu.vn)
- Fanpage: [facebook.com/tonducthanguniversity](https://www.facebook.com/tonducthanguniversity)

**Bạn có câu hỏi nào khác về tuyển sinh TDTU không ạ?**
`.trim();

        return {
            answer: warningMessage,
            prompt: "",
            cypher: "",
            contextNodes: [],
            isError: false,
            is_social: false,
            category: 'inappropriate',
            processingMethod: 'rule_based',
            processingTime: 0.1
        };
    }

    generateEmergencyFallback(question, requestId = 'unknown') {
        const emergencyMessage = `
**Xin lỗi, hệ thống đang gặp sự cố kỹ thuật.**

Để được hỗ trợ tốt nhất, bạn vui lòng liên hệ trực tiếp:

---

**Hotline:** [1900 2024 (phím 2)](tel:19002024)  
**Email:** [tuyensinh@tdtu.edu.vn](mailto:tuyensinh@tdtu.edu.vn)  
**Fanpage:** [facebook.com/tonducthanguniversity](https://www.facebook.com/tonducthanguniversity)  

---

**Cảm ơn bạn đã thông cảm!**  
*ID: ${requestId}*
`.trim();

        return {
            answer: emergencyMessage,
            prompt: "",
            cypher: "",
            contextNodes: [],
            isError: true,
            is_social: false,
            category: 'emergency_fallback',
            processingTime: 0.1,
            requestId
        };
    }
}

module.exports = AnswerService;