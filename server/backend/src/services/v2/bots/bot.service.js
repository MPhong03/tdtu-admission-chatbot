const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");
const CommonRepo = require('../../../repositories/systemconfigs/common.repository');
const CacheService = require("../../v2/cachings/cache.service");

class BotService {
    constructor() {
        this.cacheService = new CacheService(process.env.REDIS_URL);

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
     * Load cấu hình Gemini từ DB và health check trước khi sử dụng,
     * nếu lỗi hoặc thiếu sẽ fallback sang .env.
     */
    async loadGeminiConfig() {
        try {
            const config = await CommonRepo.getValues(['gemini_api_url', 'gemini_api_key']);
            const dbApiUrl = config.gemini_api_url?.trim();
            const dbApiKey = config.gemini_api_key?.trim();

            if (dbApiUrl && dbApiKey) {
                logger.info(`[Gemini Config] Phát hiện cấu hình DB: URL=${dbApiUrl}, Key=${dbApiKey.slice(0, 5)}...`);

                try {
                    // Gọi thử Gemini bằng key/url này để check health
                    const res = await axios.post(
                        `${dbApiUrl}?key=${dbApiKey}`,
                        { contents: [{ parts: [{ text: "Ping" }] }] },
                        { timeout: 5000 }
                    );

                    const firstCandidate = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (typeof firstCandidate === "string") {
                        logger.info("[Gemini Config] Health check thành công, sử dụng cấu hình từ DB.");
                        this.apiUrl = dbApiUrl;
                        this.apiKey = dbApiKey;
                        return;
                    } else {
                        logger.warn("[Gemini Config] Health check trả về bất thường, fallback sang .env.");
                    }
                } catch (err) {
                    logger.error("[Gemini Config] Health check thất bại, fallback sang .env.", err?.response?.data || err?.message);
                }
            } else {
                logger.warn("[Gemini Config] Không tìm thấy đủ cấu hình gemini_api_url & gemini_api_key trên DB, fallback .env.");
            }
        } catch (err) {
            logger.error("[Gemini Config] Lỗi khi load config từ DB, fallback .env.", err);
        }

        // Fallback giá trị mặc định từ .env
        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;
        logger.info(`[Gemini Config] Đang sử dụng cấu hình fallback từ .env: URL=${this.apiUrl}, Key=${this.apiKey?.slice(0, 5)}...`);
    }

    /**
     * Sinh Cypher từ AI (chỉ trả về labels & cypher)
     * @param {string} question 
     * @returns {Promise<{ cypher: string, labels: Array }>}
     */
    async generateCypher(question, questionEmbedding) {
        // // 1. Tìm trong cache trước
        // if (this.cacheService && questionEmbedding) {
        //     try {
        //         const results = await this.cacheService.searchSimilar(questionEmbedding, 1);
        //         if (results?.length > 0 && results[0].score < 0.3) {
        //             logger.info(`[Cache] Cache HIT (score=${results[0].score}): using cached query.`);
        //             return { cypher: results[0].query, labels: [] };
        //         }
        //     } catch (err) {
        //         logger.warn("[Cache] Cache search error, fallback to AI.", err);
        //     }
        // }

        // // 2. Nếu cache miss, gọi Gemini
        // logger.info("[Cache] Cache MISS → generate with Gemini");

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
                    // // Lưu vào cache nếu Redis khả dụng
                    // if (this.cacheService && questionEmbedding) {
                    //     try {
                    //         await this.cacheService.addCache(
                    //             `q_${Date.now()}`,
                    //             question,
                    //             questionEmbedding,
                    //             result.cypher
                    //         );
                    //     } catch (err) {
                    //         logger.warn("[Cache] Error saving to cache.", err);
                    //     }
                    // }
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
    async generateAnswer(question, questionEmbedding) {
        let retries = 0;
        const maxRetries = 10;
        let lastError = null;
        let cypherResult = null;
        let contextNodes = [];
        let cypher = "";
        let prompt = "";
        let answer = "";
        let isError = false;

        const startTime = Date.now();
        logger.info(`=== Bắt đầu xử lý câu hỏi: "${question}" ===`);

        // 1. Sinh cypher
        logger.info("[1] Bắt đầu generateCypher...");
        while (retries < maxRetries) {
            try {
                cypherResult = await this.generateCypher(question, questionEmbedding);
                cypher = cypherResult?.cypher;
                if (!cypher || typeof cypher !== "string" || !cypher.trim()) {
                    logger.warn("[1] Cypher rỗng, thử lại...");
                    retries++;
                    continue;
                }
                logger.info(`[1] Cypher sinh ra: ${cypher}`);
                break;
            } catch (err) {
                lastError = err;
                retries++;
                logger.error(`[1] Lỗi generateCypher, thử lại lần ${retries}/${maxRetries}`, err);
            }
        }

        // **XỬ LÝ CHÀO HỎI XÃ GIAO HOẶC CYHPER RỖNG**
        if (!cypher || typeof cypher !== "string" || !cypher.trim()) {
            logger.warn("[1] Không có Cypher hợp lệ, xử lý chào hỏi hoặc fallback...");
            prompt = this.answerPromptTemplate
                .replace("<user_question>", question)
                .replace("<context_json>", "[]");

            retries = 0;
            while (retries < maxRetries) {
                try {
                    logger.info("[4] Gửi prompt chào hỏi/fallback cho Gemini...");
                    const res = await axios.post(
                        `${this.apiUrl}?key=${this.apiKey}`,
                        {
                            contents: [{ parts: [{ text: prompt }] }]
                        }
                    );
                    answer = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                    if (answer) {
                        logger.info(`[4] Câu trả lời (chào hỏi/fallback): ${answer}`);
                        const totalTime = (Date.now() - startTime) / 1000;
                        logger.info(`=== Hoàn thành xử lý (tổng thời gian: ${totalTime.toFixed(2)}s) ===`);
                        return {
                            answer,
                            prompt,
                            cypher,
                            contextNodes: [],
                            isError: false
                        };
                    }
                    lastError = new Error("Gemini trả về rỗng.");
                    retries++;
                } catch (err) {
                    lastError = err;
                    retries++;
                    logger.error(`[4] Lỗi sinh answer fallback, thử lại lần ${retries}/${maxRetries}`, err);
                }
            }

            return {
                answer: "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?",
                prompt,
                cypher,
                contextNodes: [],
                isError: false
            };
        }

        // 2. Truy vấn context nodes
        logger.info("[2] Thực hiện truy vấn context từ cypher...");
        contextNodes = await this.getContextFromCypher(cypher);

        // 3. Tạo prompt trả lời cho Gemini
        logger.info("[3] Tạo prompt trả lời dựa trên context...");
        prompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(contextNodes, null, 2));

        // 4. Gửi Gemini sinh answer chính
        retries = 0;
        while (retries < maxRetries) {
            try {
                logger.info("[4] Gửi prompt chính cho Gemini...");
                const res = await axios.post(
                    `${this.apiUrl}?key=${this.apiKey}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }]
                    }
                );
                answer = res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                if (answer) {
                    logger.info(`[4] Câu trả lời cuối cùng: ${answer}`);
                    const totalTime = (Date.now() - startTime) / 1000;
                    logger.info(`=== Hoàn thành xử lý (tổng thời gian: ${totalTime.toFixed(2)}s) ===`);
                    return {
                        answer,
                        prompt,
                        cypher,
                        contextNodes,
                        isError: false
                    };
                }
                lastError = new Error("Gemini trả về rỗng.");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
                logger.error(`[4] Lỗi sinh answer chính, thử lại lần ${retries}/${maxRetries}`, err);
            }
        }

        logger.error("[4] Lỗi không thể sinh câu trả lời sau nhiều lần thử.");
        const totalTime = (Date.now() - startTime) / 1000;
        logger.info(`=== Hoàn thành xử lý (tổng thời gian: ${totalTime.toFixed(2)}s) ===`);

        return {
            answer: "Xin lỗi, tôi không thể trả lời do lỗi hệ thống.",
            prompt,
            cypher,
            contextNodes,
            isError: true
        };
    }
}

module.exports = new BotService();