const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");

class BotService {
    constructor() {
        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;

        // Đọc mô tả cấu trúc node/edge
        const descPath = path.join(__dirname, "../../../data/configs/data_structure.txt");
        this.nodeEdgeDescription = fs.readFileSync(descPath, "utf-8");

        // Đọc prompt Cypher cực kỳ chi tiết từ file cypher_prompt.txt
        const cypherPromptPath = path.join(__dirname, "../../../data/configs/cypher_prompt.txt");
        this.cypherPromptTemplate = fs.readFileSync(cypherPromptPath, "utf-8");

        // Đọc prompt trả lời sử dụng ngữ cảnh
        const answerPromptPath = path.join(__dirname, "../../../data/configs/answer_prompt.txt");
        this.answerPromptTemplate = fs.existsSync(answerPromptPath)
            ? fs.readFileSync(answerPromptPath, "utf-8")
            : `
            Bạn là trợ lý tuyển sinh. Dưới đây là ngữ cảnh dữ liệu liên quan, hãy trả lời ngắn gọn, rõ ràng, đúng thông tin nghiệp vụ dựa trên context này. Nếu context rỗng hãy báo không tìm thấy dữ liệu.

            Câu hỏi: <user_question>
            Ngữ cảnh: <context_json>
            `.trim();
    }

    /**
     * Sinh Cypher từ AI (chỉ trả về labels & cypher)
     * @param {string} question 
     * @returns {Promise<{ cypher: string, labels: Array }>}
     */
    async generateCypher(question) {
        // Tạo prompt đầy đủ cho Gemini
        const prompt = [
            this.nodeEdgeDescription,
            this.cypherPromptTemplate.replace("<user_question>", question)
        ].join('\n\n');

        let retries = 0;
        const maxRetries = 10;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                const res = await axios.post(
                    `${this.apiUrl}?key=${this.apiKey}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }]
                    }
                );
                
                let result = res.data.candidates?.[0]?.content?.parts?.[0]?.text;

                // Nếu Gemini trả về ở dạng text, cố gắng parse JSON từ text
                if (typeof result === "string") {
                    // Nếu Gemini trả về code block
                    const jsonMatch = result.match(/```json([\s\S]*?)```/);
                    if (jsonMatch) {
                        result = jsonMatch[1];
                    }
                    try {
                        result = JSON.parse(result);
                    } catch (e) {
                        lastError = e;
                        retries++;
                        continue;
                    }
                }

                if (
                    result &&
                    typeof result === "object" &&
                    Array.isArray(result.labels) &&
                    typeof result.cypher === "string"
                ) {
                    return result;
                }

                lastError = new Error("Gemini trả về sai định dạng, không có labels/cypher.");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        throw lastError || new Error("Gemini không trả về kết quả hợp lệ sau 10 lần thử.");
    }

    /**
     * Truy vấn context nodes từ mã Cypher AI sinh ra
     * @param {string} cypher 
     * @param {object} params 
     * @param {object} options 
     * @returns {Promise<Array>}
     */
    async getContextFromCypher(cypher, params = {}, options = {}) {
        try {
            return await neo4jRepository.execute(cypher, params, { raw: false, ...options });
        } catch (err) {
            // Có thể log lỗi chi tiết ở đây
            logger.error("Lỗi truy vấn:", err);
            return [];
        }
    }

    /**
     * Gọi Gemini sinh câu trả lời dựa trên context nodes
     * @param {string} question 
     * @param {Array} contextNodes 
     * @returns {Promise<{ answer: string, prompt: string, contextNodes: Array, isError: boolean }>}
     */
    async generateAnswer(question) {
        let retries = 0;
        const maxRetries = 10;
        let lastError = null;
        let cypherResult = null;
        let contextNodes = [];
        let cypher = "";
        let prompt = "";
        let answer = "";
        let isError = false;

        // 1. Sinh cypher
        while (retries < maxRetries) {
            try {
                cypherResult = await this.generateCypher(question);
                cypher = cypherResult?.cypher;
                break;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        // **XỬ LÝ CHÀO HỎI XÃ GIAO HOẶC CYHPER RỖNG**
        if (!cypher || typeof cypher !== "string" || !cypher.trim()) {
            // Trả về lời chào thân thiện hoặc chuỗi rỗng, tuỳ theo chính sách của bạn
            return {
                answer: "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?",
                prompt: "",
                contextNodes: [],
                isError: false
            };
        }

        // 2. Truy vấn context nodes
        contextNodes = await this.getContextFromCypher(cypher);

        // 3. Tạo prompt trả lời cho Gemini
        prompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(contextNodes, null, 2));

        // 4. Gửi Gemini sinh answer
        retries = 0;
        while (retries < maxRetries) {
            try {
                const res = await axios.post(
                    `${this.apiUrl}?key=${this.apiKey}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }]
                    }
                );
                answer = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                if (answer) {
                    return {
                        answer,
                        prompt,
                        contextNodes,
                        isError: false
                    };
                }
                lastError = new Error("Gemini trả về rỗng.");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        return {
            answer: "Xin lỗi, tôi không thể trả lời do lỗi hệ thống.",
            prompt,
            contextNodes,
            isError: true
        };
    }
}

module.exports = new BotService();