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

        // Load all prompt templates
        this.loadPromptTemplates();

        // Agent configuration
        this.agentConfig = {
            maxRetries: 3,
            confidenceThreshold: 0.7,
            enableClassification: true,
            maxEnrichmentQueries: 2
        };
    }

    /**
     * Load all prompt templates from files
     */
    loadPromptTemplates() {
        const configPath = path.join(__dirname, "../../../data/configs/");

        try {
            // Existing prompts
            this.nodeEdgeDescription = fs.readFileSync(path.join(configPath, "data_structure.txt"), "utf-8");
            this.cypherPromptTemplate = fs.readFileSync(path.join(configPath, "cypher_prompt.txt"), "utf-8");
            this.answerPromptTemplate = fs.existsSync(path.join(configPath, "answer_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "answer_prompt.txt"), "utf-8")
                : this.getDefaultAnswerPrompt();

            // New Agent prompts
            this.classificationPromptTemplate = fs.existsSync(path.join(configPath, "classification_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "classification_prompt.txt"), "utf-8")
                : this.getDefaultClassificationPrompt();

            this.analysisPromptTemplate = fs.existsSync(path.join(configPath, "analysis_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "analysis_prompt.txt"), "utf-8")
                : this.getDefaultAnalysisPrompt();

            this.enrichmentPromptTemplate = fs.existsSync(path.join(configPath, "enrichment_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "enrichment_prompt.txt"), "utf-8")
                : this.getDefaultEnrichmentPrompt();

            this.complexAnswerPromptTemplate = fs.existsSync(path.join(configPath, "complex_answer_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "complex_answer_prompt.txt"), "utf-8")
                : this.getDefaultComplexAnswerPrompt();

            this.offTopicPromptTemplate = fs.existsSync(path.join(configPath, "off_topic_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "off_topic_prompt.txt"), "utf-8")
                : this.getDefaultOffTopicPrompt();

            this.socialPromptTemplate = fs.existsSync(path.join(configPath, "social_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "social_prompt.txt"), "utf-8")
                : this.getDefaultSocialPrompt();

            logger.info("[Prompts] Successfully loaded all prompt templates");
        } catch (error) {
            logger.error("[Prompts] Error loading prompt templates, using defaults", error);
            this.loadDefaultPrompts();
        }
    }

    /**
     * Default prompt methods (fallbacks)
     */
    getDefaultAnswerPrompt() {
        return `
        Bạn là trợ lý tuyển sinh. Dưới đây là ngữ cảnh dữ liệu liên quan, hãy trả lời ngắn gọn, rõ ràng, đúng thông tin nghiệp vụ dựa trên context này. Nếu context rỗng hãy báo không tìm thấy dữ liệu.

        Câu hỏi: <user_question>
        Ngữ cảnh: <context_json>
        `.trim();
    }

    getDefaultClassificationPrompt() {
        return `
        BẠN LÀ CHUYÊN GIA PHÂN LOẠI CÂU HỎI CHO HỆ THỐNG TUYỂN SINH TDTU.
        
        Phân tích câu hỏi: "<user_question>"
        
        Phân loại thành 4 loại:
        1. inappropriate - thô tục/vi phạm
        2. off_topic - không liên quan TDTU
        3. simple_admission - tuyển sinh đơn giản
        4. complex_admission - tuyển sinh phức tạp
        
        Trả về JSON với category, confidence, reasoning.
        `.trim();
    }

    getDefaultAnalysisPrompt() {
        return `
        Phân tích sâu câu hỏi tuyển sinh phức tạp: "<user_question>"
        
        Extract entities, intents, và strategy.
        Trả về JSON format với entities, intent, strategy.
        `.trim();
    }

    getDefaultEnrichmentPrompt() {
        return `
        Quyết định có cần query bổ sung cho: "<user_question>"
        
        Trả về JSON với shouldEnrich, reasoning, cypher.
        `.trim();
    }

    getDefaultComplexAnswerPrompt() {
        return `
        Bạn là trợ lý tuyển sinh chuyên nghiệp. Trả lời câu hỏi phức tạp dựa trên context và agent analysis.
        
        Câu hỏi: <user_question>
        Context: <context_json>
        Agent info: <agent_info>
        `.trim();
    }

    getDefaultOffTopicPrompt() {
        return `
        Trả lời thân thiện câu hỏi không liên quan TDTU: "<user_question>"
        
        Hướng dẫn lịch sự về tuyển sinh TDTU.
        `.trim();
    }

    getDefaultSocialPrompt() {
        return `
        Trả lời xã giao thân thiện: "<user_question>"
        
        Giới thiệu vai trò trợ lý tuyển sinh TDTU.
        `.trim();
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
     * 4-Category Question Classification theo góp ý thầy
     */
    async classifyQuestion(question, chatHistory = []) {
        if (!this.agentConfig.enableClassification) {
            return {
                category: 'simple_admission',
                confidence: 0.8,
                reasoning: 'Classification disabled, default to simple admission',
                processingMethod: 'rag_simple'
            };
        }

        try {
            const classificationPrompt = this.nodeEdgeDescription + '\n\n' +
                this.classificationPromptTemplate
                    .replace("<user_question>", question)
                    .replace("<chat_history>", JSON.stringify(chatHistory.slice(-2)));

            const result = await this.callGemini(classificationPrompt);

            // Enhanced validation
            if (result && typeof result === 'object') {
                const validCategories = ['inappropriate', 'off_topic', 'simple_admission', 'complex_admission'];
                const isValid =
                    validCategories.includes(result.category) &&
                    typeof result.confidence === 'number' &&
                    result.confidence >= 0 && result.confidence <= 1 &&
                    typeof result.reasoning === 'string' &&
                    result.reasoning.length > 10;

                if (isValid) {
                    logger.info(`[Classification] ${result.category} (confidence: ${result.confidence}): ${result.reasoning}`);
                    return result;
                }
            }

            // Fallback classification
            logger.warn("[Classification] Invalid result, using safe fallback");
            return {
                category: 'simple_admission',
                confidence: 0.5,
                reasoning: 'Fallback classification due to parsing error',
                processingMethod: 'rag_simple'
            };
        } catch (error) {
            logger.error("[Classification] Failed, using safe fallback", error);
            return {
                category: 'simple_admission',
                confidence: 0.3,
                reasoning: 'Error in classification, defaulting to safe mode',
                processingMethod: 'rag_simple'
            };
        }
    }

    /**
     * Complex admission analysis (cho Agent mode)
     */
    async analyzeComplexQuestion(question, chatHistory, classification) {
        const analysisPrompt = this.nodeEdgeDescription + '\n\n' +
            this.analysisPromptTemplate
                .replace("<user_question>", question)
                .replace("<classification_info>", JSON.stringify(classification))
                .replace("<chat_history>", JSON.stringify(chatHistory));

        try {
            return await this.callGemini(analysisPrompt);
        } catch (error) {
            logger.error("[Agent] Complex question analysis failed", error);
            return {
                entities: { majors: [], programmes: [], year: "2024", infoTypes: ["general"] },
                intent: { primary: "search", secondary: [], action: "find_info" },
                strategy: { mainTargets: ["Document"], enrichmentTargets: [], needsEnrichment: false },
                reasoning: "Fallback analysis due to error"
            };
        }
    }

    /**
     * Plan enrichment query cho complex questions
     */
    async planEnrichmentQuery(question, mainContext, analysis, step = 1) {
        if (!analysis.strategy?.needsEnrichment || step > this.agentConfig.maxEnrichmentQueries) {
            return null;
        }

        const enrichmentPrompt = this.nodeEdgeDescription + '\n\n' +
            this.enrichmentPromptTemplate
                .replace("<user_question>", question)
                .replace("<step>", step)
                .replace("<max_steps>", this.agentConfig.maxEnrichmentQueries)
                .replace("<context_count>", mainContext.length)
                .replace("<analysis_info>", JSON.stringify(analysis))
                .replace("<sample_context>", JSON.stringify(mainContext.slice(0, 2)))
                .replace("<enrichment_targets>", analysis.strategy.enrichmentTargets?.join(', ') || 'none');

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
     * Generate enhanced answer cho complex questions
     */
    async generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory) {
        const historyText = chatHistory.length
            ? chatHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer}`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        const agentStepsText = agentSteps.map(step =>
            `- ${step.step}: ${step.description} (${step.resultCount || 0} nodes)`
        ).join('\n');

        const enhancedPrompt = this.complexAnswerPromptTemplate
            .replace("<user_question>", question)
            .replace("<chat_history>", historyText)
            .replace("<context_json>", JSON.stringify(allContext, null, 2))
            .replace("<primary_intent>", analysis.intent?.primary || 'unknown')
            .replace("<secondary_intents>", analysis.intent?.secondary?.join(', ') || 'none')
            .replace("<entities_info>", JSON.stringify(analysis.entities))
            .replace("<steps_count>", agentSteps.length)
            .replace("<agent_steps>", agentStepsText)
            .replace("<analysis_reasoning>", analysis.reasoning);

        try {
            return await this.callGemini(enhancedPrompt);
        } catch (error) {
            logger.error("[Agent] Complex answer generation failed", error);
            // Fallback to simple template
            const simplePrompt = this.answerPromptTemplate
                .replace("<user_question>", question)
                .replace("<context_json>", JSON.stringify(allContext, null, 2))
                .replace("<chat_history>", historyText);

            return await this.callGemini(simplePrompt);
        }
    }

    /**
     * MAIN METHOD: Generate answer với 4-category logic
     */
    async generateAnswer(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();
        logger.info(`=== Bắt đầu xử lý: "${question}" ===`);

        try {
            // PHASE 1: 4-Category Classification
            const classification = await this.classifyQuestion(question, chatHistory);
            logger.info(`[Classification] Category: ${classification.category}, Method: ${classification.processingMethod}`);

            switch (classification.category) {
                case 'inappropriate':
                    return await this.handleInappropriateQuestion(question, classification);

                case 'off_topic':
                    return await this.handleOffTopicQuestion(question, classification, chatHistory);

                case 'simple_admission':
                    return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);

                case 'complex_admission':
                    return await this.handleComplexAdmission(question, questionEmbedding, chatHistory, classification);

                default:
                    // Safe fallback
                    logger.warn(`[Classification] Unknown category: ${classification.category}, fallback to simple`);
                    return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
            }
        } catch (error) {
            logger.error("[System] Critical error, emergency fallback", error);
            return this.emergencyFallback(question);
        }
    }

    /**
     * Handler cho inappropriate questions
     */
    async handleInappropriateQuestion(question, classification) {
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
            processingTime: 0.1
        };
    }

    /**
     * Handler cho off-topic questions
     */
    async handleOffTopicQuestion(question, classification, chatHistory) {
        const offTopicPrompt = this.offTopicPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(offTopicPrompt);
            const totalTime = (Date.now() - Date.now()) / 1000;

            return {
                answer: answer || `Cảm ơn bạn đã hỏi! Tuy nhiên câu hỏi này không liên quan đến tuyển sinh TDTU. Tôi chuyên hỗ trợ thông tin về các ngành học, học phí, và tư vấn tuyển sinh tại TDTU. Bạn có muốn tìm hiểu về ngành nào không ạ?`,
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false,
                category: 'off_topic',
                processingTime: totalTime
            };
        } catch (error) {
            return {
                answer: "Tôi chuyên hỗ trợ thông tin tuyển sinh TDTU. Bạn có câu hỏi nào về học phí, ngành học, hay thông tin tuyển sinh không ạ?",
                prompt: "",
                cypher: "",
                contextNodes: [],
                isError: false,
                is_social: false,
                category: 'off_topic'
            };
        }
    }

    /**
     * Handler cho simple admission questions (RAG truyền thống)
     */
    async handleSimpleAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Simple] Processing with traditional RAG");
        const result = await this.generateAnswerTraditional(question, questionEmbedding, chatHistory);

        // Add classification metadata
        result.category = 'simple_admission';
        result.processingMethod = 'rag_simple';

        return result;
    }

    /**
     * Handler cho complex admission questions (Agent mode)
     */
    async handleComplexAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Processing with Agent intelligence");

        let agentSteps = [];
        let allContext = [];
        let cypher = "";

        try {
            // Step 1: Deep analysis
            const analysis = await this.analyzeComplexQuestion(question, chatHistory, classification);
            agentSteps.push({
                step: "analysis",
                description: "Phân tích sâu câu hỏi phức tạp",
                result: analysis
            });

            // Step 2: Main query (reuse existing logic)
            const cypherResult = await this.generateCypher(question, questionEmbedding);
            cypher = cypherResult?.cypher || "";
            const is_social = cypherResult?.is_social || false;

            if (is_social) {
                // Edge case: classified as complex but actually social
                const socialAnswer = await this.handleSocialQuestion(question, chatHistory);
                return {
                    answer: socialAnswer,
                    prompt: "",
                    cypher: "",
                    contextNodes: [],
                    isError: false,
                    is_social: true,
                    category: 'complex_admission',
                    processingMethod: 'agent_complex'
                };
            }

            if (cypher) {
                const mainContext = await this.getContextFromCypher(cypher);
                allContext.push(...mainContext);
                agentSteps.push({
                    step: "main_query",
                    description: "Truy vấn dữ liệu chính",
                    resultCount: mainContext.length,
                    cypher: cypher
                });

                // Step 3: Smart enrichment (if needed)
                if (analysis.strategy?.needsEnrichment && mainContext.length > 0) {
                    for (let step = 1; step <= this.agentConfig.maxEnrichmentQueries; step++) {
                        const enrichment = await this.planEnrichmentQuery(question, allContext, analysis, step);
                        if (!enrichment) break;

                        try {
                            const enrichmentContext = await this.getContextFromCypher(enrichment.cypher);
                            if (enrichmentContext.length > 0) {
                                allContext.push(...enrichmentContext);
                                agentSteps.push({
                                    step: `enrichment_${step}`,
                                    description: enrichment.purpose,
                                    resultCount: enrichmentContext.length,
                                    cypher: enrichment.cypher,
                                    infoType: enrichment.infoType
                                });
                            } else {
                                logger.info(`[Agent] Enrichment step ${step} returned no results, stopping`);
                                break;
                            }
                        } catch (enrichError) {
                            logger.warn(`[Agent] Enrichment step ${step} failed`, enrichError);
                            break;
                        }
                    }
                }

                // Step 4: Enhanced answer generation
                const answer = await this.generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory);

                const totalTime = (Date.now() - startTime) / 1000;
                logger.info(`[Complex] Agent completed with ${agentSteps.length} steps`);

                return {
                    answer: answer || "Xin lỗi, tôi không thể trả lời câu hỏi phức tạp này.",
                    prompt: "", // Không expose internal prompt
                    cypher: cypher,
                    contextNodes: allContext,
                    isError: false,
                    is_social: false,
                    category: 'complex_admission',
                    processingMethod: 'agent_complex',
                    agentSteps: agentSteps,
                    analysis: analysis,
                    processingTime: totalTime
                };
            } else {
                // No valid cypher generated
                logger.warn("[Complex] No valid cypher, fallback response");
                const fallbackAnswer = await this.handleSocialQuestion(question, chatHistory);

                return {
                    answer: fallbackAnswer,
                    prompt: "",
                    cypher: "",
                    contextNodes: [],
                    isError: false,
                    is_social: false,
                    category: 'complex_admission',
                    processingMethod: 'agent_complex'
                };
            }
        } catch (error) {
            logger.error("[Complex] Agent processing failed, fallback to simple", error);
            return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
        }
    }

    /**
     * Traditional RAG mode
     */
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = []) {
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
                        is_social: false,
                        processingTime: totalTime
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
        const socialPrompt = this.socialPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(socialPrompt);
            return answer || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }

    /**
     * Emergency fallback
     */
    emergencyFallback(question) {
        const emergencyMessage = `
**Xin lỗi, hệ thống đang gặp sự cố kỹ thuật.**

Để được hỗ trợ tốt nhất, bạn vui lòng liên hệ trực tiếp:

---

**Hotline:** [1900 2024 (phím 2)](tel:19002024)  
**Email:** [tuyensinh@tdtu.edu.vn](mailto:tuyensinh@tdtu.edu.vn)  
**Fanpage:** [facebook.com/tonducthanguniversity](https://www.facebook.com/tonducthanguniversity)  
**Địa chỉ:** 19 Nguyễn Hữu Thọ, Tân Phong, Quận 7, TP.HCM

---

**Cảm ơn bạn đã thông cảm!**
`.trim();

        return {
            answer: emergencyMessage,
            prompt: "",
            cypher: "",
            contextNodes: [],
            isError: true,
            is_social: false,
            category: 'emergency_fallback',
            processingTime: 0.1
        };
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