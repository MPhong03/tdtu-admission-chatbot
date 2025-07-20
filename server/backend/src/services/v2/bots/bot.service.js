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

        // Agent configuration
        this.agentConfig = {
            maxRetries: 3,
            confidenceThreshold: 0.7,
            enableAgent: true,
            maxEnrichmentQueries: 2
        };
    }

    /**
     * Load cấu hình Gemini từ DB và health check trước khi sử dụng
     */
    async loadGeminiConfig() {
        try {
            const config = await CommonRepo.getValues(['gemini_api_url', 'gemini_api_key']);
            const dbApiUrl = config.gemini_api_url?.trim();
            const dbApiKey = config.gemini_api_key?.trim();

            if (dbApiUrl && dbApiKey) {
                logger.info(`[Gemini Config] Phát hiện cấu hình DB: URL=${dbApiUrl}, Key=${dbApiKey.slice(0, 5)}...`);

                try {
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

        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;
        logger.info(`[Gemini Config] Đang sử dụng cấu hình fallback từ .env: URL=${this.apiUrl}, Key=${this.apiKey?.slice(0, 5)}...`);
    }

    /**
     * Agent: Intelligent question classification
     * Quyết định có nên sử dụng Agent mode hay RAG thông thường
     */
    async shouldUseAgentMode(question, chatHistory = []) {
        if (!this.agentConfig.enableAgent) {
            return false;
        }

        try {
            const classificationPrompt = `
                ${this.nodeEdgeDescription}

                BẠN LÀ CHUYÊN GIA PHÂN LOẠI CÂU HỎI TUYỂN SINH. Nhiệm vụ: Quyết định phương pháp xử lý tối ưu.

                === PHÂN TÍCH CÂU HỎI ===
                Câu hỏi: "${question}"
                Lịch sử gần đây: ${JSON.stringify(chatHistory.slice(-2))}

                === QUY TẮC PHÂN LOẠI ===

                **AGENT MODE** - Xử lý thông minh đa bước:

                **1. COMPARISON QUESTIONS** (So sánh)
                Examples:
                - "So sánh học phí CNTT hệ tiêu chuẩn và tiên tiến"
                - "Ngành nào rẻ hơn giữa CNTT và KTPM?"
                - "Compare tuition fees between programs"
                - "Hệ nào tốt hơn về cơ hội việc làm?"
                - "Khác biệt giữa hệ liên kết và hệ tiêu chuẩn"

                **2. ADVICE/CONSULTATION QUESTIONS** (Tư vấn)
                Examples:
                - "Tư vấn tôi nên chọn ngành gì?"
                - "Ngành nào phù hợp với người thích toán?"
                - "Should I choose Computer Science or Software Engineering?"
                - "Với điều kiện kinh tế khó khăn nên học hệ nào?"
                - "Tôi muốn học về AI, nên chọn ngành gì?"

                **3. COMPLEX ANALYSIS** (Phân tích phức tạp)
                Examples:
                - "Ngành nào có học phí rẻ nhất và học bổng nhiều nhất?"
                - "Phân tích ưu nhược điểm của từng hệ đào tạo"
                - "Tìm ngành có tỷ lệ việc làm cao với chi phí dưới 30 triệu"
                - "Evaluate the best program for international students"

                **4. MULTI-CRITERIA QUESTIONS** (Nhiều tiêu chí)
                Examples:
                - "Ngành có học phí vừa phải, dễ xin việc và phù hợp nữ sinh"
                - "Tìm chương trình có thời gian học ngắn, chi phí thấp"
                - "Best value programs with good career prospects"

                **RAG MODE** - Truy vấn đơn giản:

                **1. SIMPLE FACT LOOKUP** (Tìm thông tin cụ thể)
                Examples:
                - "Học phí ngành CNTT hệ tiêu chuẩn là bao nhiêu?"
                - "Thông tin liên hệ phòng tuyển sinh"
                - "What is the tuition for Computer Science standard program?"
                - "Địa chỉ trường Đại học Tôn Đức Thắng"
                - "Điểm chuẩn ngành Kế toán năm 2024"

                **2. SINGLE INFORMATION REQUEST** (Một thông tin duy nhất)
                Examples:
                - "Có bao nhiêu ngành trong khoa CNTT?"
                - "Thời gian đào tạo ngành Kinh tế là bao lâu?"
                - "Requirements for Software Engineering program"
                - "Lịch thi đầu vào năm 2024"

                **3. SOCIAL/GREETING** (Xã giao)
                Examples:
                - "Xin chào", "Hello", "Hi"
                - "Cảm ơn", "Thank you"
                - "Tạm biệt", "Goodbye"
                - "Bạn là ai?", "What's your name?"

                === EDGE CASES HANDLING ===

                **UNCLEAR QUESTIONS** → Default RAG (Safe choice)
                - Câu hỏi mơ hồ, không rõ intent
                - Typos nhiều, không hiểu được

                **MIXED LANGUAGE** → Focus on intent, not language
                - "Compare học phí CNTT và KTPM"
                - "So sánh tuition fees các ngành"

                **PARTIAL INFORMATION** → Agent if implies comparison/advice
                - "Ngành CNTT như thế nào?" (có thể dẫn đến tư vấn)
                - "Tell me about Computer Science" (fact lookup)

                === CONFIDENCE SCORING ===

                **High Confidence (0.8-1.0):**
                - Clear keywords: "so sánh", "tư vấn", "nên chọn", "compare", "advise"
                - Multiple criteria mentioned
                - Question implies analysis needed

                **Medium Confidence (0.6-0.8):**
                - Some complexity signals but not clear
                - Could go either way

                **Low Confidence (0.0-0.6):**
                - Simple, direct questions
                - Single fact lookup
                - Social interactions

                === OUTPUT FORMAT ===

                Phân tích theo steps:
                1. Identify question type và intent
                2. Check for complexity signals  
                3. Determine confidence level
                4. Make final decision

                Trả về JSON:
                {
                    "useAgent": true/false,
                    "confidence": 0.8,
                    "questionType": "comparison|advice|complex|simple|social",
                    "reasoning": "Chi tiết tại sao chọn Agent/RAG và confidence level",
                    "detectedIntent": "primary intent của câu hỏi",
                    "complexitySignals": ["signal1", "signal2"],
                    "expectedComplexity": "low|medium|high"
                }

                === VALIDATION RULES ===
                - useAgent = true CHỈ KHI confidence >= 0.7
                - Nếu không chắc chắn → useAgent = false (safe default)
                - Luôn có reasoning chi tiết cho decision
                - questionType phải match với examples đã cho

                Hãy phân tích câu hỏi theo framework trên và đưa ra quyết định chính xác.
            `;

            const result = await this.callGemini(classificationPrompt);

            // Enhanced validation
            if (result && typeof result === 'object') {
                const isValidResult =
                    typeof result.useAgent === 'boolean' &&
                    typeof result.confidence === 'number' &&
                    result.confidence >= 0 && result.confidence <= 1 &&
                    typeof result.reasoning === 'string' &&
                    result.reasoning.length > 10; // Reasoning phải có substance

                if (isValidResult && result.useAgent === true && result.confidence >= this.agentConfig.confidenceThreshold) {
                    logger.info(`[Agent] Sử dụng Agent mode (confidence: ${result.confidence}): ${result.reasoning}`);
                    return result;
                } else {
                    logger.info(`[Agent] Sử dụng RAG mode: ${result.reasoning || 'Confidence thấp hoặc câu hỏi đơn giản'}`);
                    return false;
                }
            } else {
                logger.warn("[Agent] Invalid classification result format");
                return false;
            }
        } catch (error) {
            logger.warn("[Agent] Classification failed, fallback to RAG mode", error);
            return false;
        }
    }

    /**
     * Agent: Deep question analysis
     * Phân tích sâu câu hỏi để lập chiến lược
     */
    async analyzeQuestion(question, chatHistory, classification) {
        const analysisPrompt = `
        ${this.nodeEdgeDescription}

        Phân tích sâu câu hỏi để lập chiến lược truy vấn:

        Câu hỏi: "${question}"
        Phân loại: ${classification.questionType} (complexity: ${classification.expectedComplexity})
        Lịch sử: ${JSON.stringify(chatHistory)}

        Thực hiện phân tích:

        1. ENTITY EXTRACTION:
        - Ngành học được nhắc đến
        - Hệ đào tạo (tiêu chuẩn, tiên tiến, liên kết...)
        - Năm học (2024 nếu không rõ)
        - Loại thông tin cần (học phí, học bổng, mô tả, tài liệu...)

        2. INTENT ANALYSIS:
        - Primary intent (mục đích chính)
        - Secondary intents (mục đích phụ)
        - Action required (tìm, so sánh, tư vấn, phân tích...)

        3. INFORMATION STRATEGY:
        - Main query targets (node types chính cần query)
        - Potential enrichment (thông tin bổ sung có giá trị)
        - Query sequence (thứ tự truy vấn tối ưu)

        Trả về JSON:
        {
            "entities": {
                "majors": ["công nghệ thông tin"],
                "programmes": ["tiêu chuẩn", "tiên tiến"],
                "year": "2024",
                "infoTypes": ["tuition", "scholarship"]
            },
            "intent": {
                "primary": "comparison",
                "secondary": ["advice"],
                "action": "compare_and_recommend"
            },
            "strategy": {
                "mainTargets": ["Major", "Programme", "Tuition"],
                "enrichmentTargets": ["Scholarship"],
                "needsEnrichment": true,
                "querySequence": ["main", "enrichment"]
            },
            "reasoning": "Câu hỏi yêu cầu so sánh học phí CNTT các hệ và cần thêm info học bổng để tư vấn tốt"
        }
        `;

        try {
            return await this.callGemini(analysisPrompt);
        } catch (error) {
            logger.error("[Agent] Question analysis failed", error);
            // Fallback analysis
            return {
                entities: { majors: [], programmes: [], year: "2024", infoTypes: ["general"] },
                intent: { primary: "search", secondary: [], action: "find_info" },
                strategy: { mainTargets: ["Document"], enrichmentTargets: [], needsEnrichment: false },
                reasoning: "Fallback analysis due to error"
            };
        }
    }

    /**
     * Agent: Plan enrichment query
     * Quyết định có cần query bổ sung không và query gì
     */
    async planEnrichmentQuery(question, mainContext, analysis, step = 1) {
        if (!analysis.strategy?.needsEnrichment || step > this.agentConfig.maxEnrichmentQueries) {
            return null;
        }

        const enrichmentPrompt = `
        ${this.nodeEdgeDescription}

        Quyết định query bổ sung (bước ${step}):

        Câu hỏi gốc: "${question}"
        Context chính đã có: ${mainContext.length} nodes
        Phân tích: ${JSON.stringify(analysis)}
        Sample context: ${JSON.stringify(mainContext.slice(0, 2))}

        Enrichment targets: ${analysis.strategy.enrichmentTargets?.join(', ')}

        Chỉ tạo query nếu:
        1. Thực sự cần thiết cho câu trả lời tốt hơn
        2. Không trùng lặp với context hiện có
        3. Khả năng cao tìm được info hữu ích

        Query phải tuân thủ đúng Neo4j schema đã định nghĩa.

        Trả về JSON:
        {
            "shouldEnrich": true/false,
            "reasoning": "Lý do cần/không cần",
            "purpose": "Mục đích của query này",
            "cypher": "MATCH ... RETURN ... LIMIT 10",
            "expectedValue": "Giá trị dự kiến"
        }
        `;

        try {
            const result = await this.callGemini(enrichmentPrompt);
            if (result?.shouldEnrich && result?.cypher) {
                logger.info(`[Agent] Planning enrichment step ${step}: ${result.purpose}`);
                return result;
            }
            return null;
        } catch (error) {
            logger.warn(`[Agent] Enrichment planning step ${step} failed`, error);
            return null;
        }
    }

    /**
     * Agent: Generate enhanced answer
     * Tổng hợp câu trả lời dựa trên context đã thu thập và agent reasoning
     */
    async generateAgentAnswer(question, allContext, analysis, agentSteps, chatHistory) {
        // Convert chat history thành text
        const historyText = chatHistory.length
            ? chatHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer}`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        const enhancedPrompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(allContext, null, 2))
            .replace("<chat_history>", historyText) + `

=== THÔNG TIN XỬ LÝ AGENT ===
Intent: ${analysis.intent?.primary} (${analysis.intent?.secondary?.join(', ') || 'none'})
Entities: ${JSON.stringify(analysis.entities)}
Complexity: ${analysis.strategy?.needsEnrichment ? 'High' : 'Medium'}

Agent đã thực hiện ${agentSteps.length} bước:
${agentSteps.map(step => `- ${step.step}: ${step.description} (${step.resultCount || 0} kết quả)`).join('\n')}

Reasoning: ${analysis.reasoning}

Hãy tổng hợp câu trả lời thông minh dựa trên:
1. Context data đã thu thập
2. Quá trình phân tích của Agent  
3. Intent chính: ${analysis.intent?.primary}
4. Đưa ra đề xuất cụ thể nếu là câu hỏi tư vấn/so sánh

Đảm bảo câu trả lời chuyên nghiệp, đầy đủ và hữu ích.
        `;

        try {
            return await this.callGemini(enhancedPrompt);
        } catch (error) {
            logger.error("[Agent] Enhanced answer generation failed", error);
            // Fallback to simple template
            const simplePrompt = this.answerPromptTemplate
                .replace("<user_question>", question)
                .replace("<context_json>", JSON.stringify(allContext, null, 2))
                .replace("<chat_history>", historyText);

            return await this.callGemini(simplePrompt);
        }
    }

    /**
     * Main method: Generate answer with Agent intelligence
     * Giữ nguyên signature và format trả về như cũ
     */
    async generateAnswer(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();
        logger.info(`=== Bắt đầu xử lý: "${question}" ===`);

        let agentSteps = [];
        let allContext = [];
        let cypher = "";
        let isAgent = false;

        try {
            // Phase 1: Intelligent classification
            const classification = await this.shouldUseAgentMode(question, chatHistory);

            if (classification) {
                // AGENT MODE
                isAgent = true;
                logger.info("[Agent] Entering Agent mode");

                // Phase 2: Deep analysis
                const analysis = await this.analyzeQuestion(question, chatHistory, classification);
                agentSteps.push({
                    step: "analysis",
                    description: "Phân tích câu hỏi và lập chiến lược",
                    result: analysis
                });

                // Phase 3: Main query (sử dụng lại logic cũ)
                const cypherResult = await this.generateCypher(question, questionEmbedding);
                cypher = cypherResult?.cypher || "";
                const is_social = cypherResult?.is_social || false;

                if (is_social) {
                    // Xử lý câu xã giao như cũ
                    const socialAnswer = await this.handleSocialQuestion(question, chatHistory);
                    const totalTime = (Date.now() - startTime) / 1000;
                    logger.info(`=== Hoàn thành xã giao (${totalTime.toFixed(2)}s) ===`);

                    return {
                        answer: socialAnswer,
                        prompt: "",
                        cypher: "",
                        contextNodes: [],
                        isError: false,
                        is_social: true,
                        isAgent: true,
                        processingTime: totalTime
                    };
                }

                if (cypher) {
                    const mainContext = await this.getContextFromCypher(cypher);
                    allContext.push(...mainContext);
                    agentSteps.push({
                        step: "main_query",
                        description: "Truy vấn chính",
                        resultCount: mainContext.length,
                        cypher: cypher
                    });

                    // Phase 4: Smart enrichment (nếu cần)
                    if (analysis.strategy?.needsEnrichment && mainContext.length > 0) {
                        for (let step = 1; step <= this.agentConfig.maxEnrichmentQueries; step++) {
                            const enrichment = await this.planEnrichmentQuery(question, allContext, analysis, step);
                            if (!enrichment) break;

                            try {
                                const enrichmentContext = await this.getContextFromCypher(enrichment.cypher);
                                allContext.push(...enrichmentContext);
                                agentSteps.push({
                                    step: `enrichment_${step}`,
                                    description: enrichment.purpose,
                                    resultCount: enrichmentContext.length,
                                    cypher: enrichment.cypher
                                });

                                if (enrichmentContext.length === 0) break; // Không tìm thấy thêm gì thì dừng
                            } catch (enrichError) {
                                logger.warn(`[Agent] Enrichment step ${step} failed`, enrichError);
                                break;
                            }
                        }
                    }

                    // Phase 5: Enhanced answer generation
                    const answer = await this.generateAgentAnswer(question, allContext, analysis, agentSteps, chatHistory);

                    const totalTime = (Date.now() - startTime) / 1000;
                    logger.info(`=== Agent hoàn thành (${totalTime.toFixed(2)}s, ${agentSteps.length} steps) ===`);

                    return {
                        answer: answer || "Xin lỗi, tôi không thể trả lời câu hỏi này.",
                        prompt: "", // Không expose internal prompt
                        cypher: cypher,
                        contextNodes: allContext,
                        isError: false,
                        is_social: false,
                        isAgent: true,
                        agentSteps: agentSteps,
                        processingTime: totalTime
                    };
                } else {
                    // Không có cypher hợp lệ, fallback
                    logger.warn("[Agent] No valid cypher generated, fallback to social response");
                    const fallbackAnswer = await this.handleSocialQuestion(question, chatHistory);
                    const totalTime = (Date.now() - startTime) / 1000;

                    return {
                        answer: fallbackAnswer,
                        prompt: "",
                        cypher: "",
                        contextNodes: [],
                        isError: false,
                        is_social: false,
                        isAgent: true,
                        processingTime: totalTime
                    };
                }
            } else {
                // RAG MODE (logic cũ)
                logger.info("[RAG] Using traditional RAG mode");
                return await this.generateAnswerTraditional(question, questionEmbedding, chatHistory);
            }

        } catch (error) {
            logger.error("[System] Critical error, fallback to traditional RAG", error);
            // Complete fallback
            return await this.generateAnswerTraditional(question, questionEmbedding, chatHistory);
        }
    }

    /**
     * Traditional RAG mode (logic cũ)
     */
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = []) {
        // Logic y hệt như method generateAnswer cũ
        let retries = 0;
        const maxRetries = 10;
        let lastError = null;
        let cypherResult = null;
        let contextNodes = [];
        let cypher = "";
        let prompt = "";
        let answer = "";
        let isError = false;
        let is_social = false;

        const startTime = Date.now();

        // 1. Sinh cypher
        while (retries < maxRetries) {
            try {
                cypherResult = await this.generateCypher(question, questionEmbedding);
                cypher = cypherResult?.cypher;
                is_social = cypherResult?.is_social || false;

                if (is_social) {
                    const socialAnswer = await this.handleSocialQuestion(question, chatHistory);
                    const totalTime = (Date.now() - startTime) / 1000;
                    return {
                        answer: socialAnswer,
                        prompt: "",
                        cypher: "",
                        contextNodes: [],
                        isError: false,
                        is_social: true
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
            const fallbackAnswer = await this.handleSocialQuestion(question, chatHistory);
            return {
                answer: fallbackAnswer,
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false
            };
        }

        // 2. Truy vấn context nodes
        contextNodes = await this.getContextFromCypher(cypher);

        // 3. Sinh answer
        const historyText = chatHistory.length
            ? chatHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer}`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        prompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(contextNodes, null, 2))
            .replace("<chat_history>", historyText);

        retries = 0;
        while (retries < maxRetries) {
            try {
                answer = await this.callGemini(prompt);
                if (answer) {
                    const totalTime = (Date.now() - startTime) / 1000;
                    return {
                        answer,
                        prompt,
                        cypher,
                        contextNodes,
                        isError: false,
                        is_social: false
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
            cypher,
            contextNodes,
            isError: true,
            is_social: false
        };
    }

    /**
     * Handle social questions
     */
    async handleSocialQuestion(question, chatHistory) {
        const socialPrompt = `
        Bạn là trợ lý tuyển sinh TDTU thân thiện. Trả lời câu xã giao này một cách tự nhiên:
        
        Câu hỏi: "${question}"
        
        Hãy trả lời ngắn gọn, thân thiện và có thể gợi mở người dùng hỏi về thông tin tuyển sinh nếu phù hợp.
        `;

        try {
            const answer = await this.callGemini(socialPrompt);
            return answer || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }

    /**
     * Call Gemini API helper
     */
    async callGemini(prompt) {
        const response = await axios.post(
            `${this.apiUrl}?key=${this.apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            }
        );

        let result = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Parse JSON nếu có
        if (typeof result === "string") {
            const jsonMatch = result.match(/```json([\s\S]*?)```/);
            if (jsonMatch) {
                result = jsonMatch[1];
            }
            try {
                result = JSON.parse(result);
            } catch (e) {
                // Không phải JSON, trả về string
            }
        }

        return result;
    }

    /**
     * Existing methods (giữ nguyên)
     */
    async generateCypher(question, questionEmbedding) {
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

                if (typeof result === "string") {
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
                    typeof result.cypher === "string" &&
                    typeof result.is_social === "boolean"
                ) {
                    return result;
                }

                if (
                    result &&
                    typeof result === "object" &&
                    Array.isArray(result.labels) &&
                    typeof result.cypher === "string" &&
                    result.is_social === undefined
                ) {
                    result.is_social = false;
                    return result;
                }

                lastError = new Error("Gemini trả về sai định dạng, không có labels/cypher/is_social.");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        throw lastError || new Error("Gemini không trả về kết quả hợp lệ sau 10 lần thử.");
    }

    async getContextFromCypher(cypher, params = {}, options = {}) {
        try {
            return await neo4jRepository.execute(cypher, params, { raw: false, ...options });
        } catch (err) {
            logger.error("Lỗi truy vấn:", err);
            return [];
        }
    }
}

module.exports = new BotService();