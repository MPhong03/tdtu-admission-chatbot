const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");
const CommonRepo = require('../../../repositories/systemconfigs/common.repository');
const CacheService = require("../../v2/cachings/cache.service");

class BotService {
    constructor() {
        // KHÔNG dùng Redis - chỉ in-memory cache
        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;

        // TỐI ƯU 1: Rate Limiting & Request Queue
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = 3; // Giới hạn concurrent requests
        this.requestDelay = 1000; // 1s delay giữa các requests
        this.lastRequestTime = 0;

        // TỐI ƯU 2: Enhanced In-Memory Caching Only
        this.responseCache = new Map(); // In-memory cache
        this.cacheTimeout = 3600000; // 1 hour
        this.maxCacheSize = 1000; // Giới hạn số lượng items trong cache
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };

        // Load all prompt templates
        this.loadPromptTemplates();

        // Agent configuration với tối ưu
        this.agentConfig = {
            maxRetries: 2, // Giảm từ 3 xuống 2
            confidenceThreshold: 0.7,
            enableClassification: true,
            maxEnrichmentQueries: 1, // Giảm từ 2 xuống 1 để tiết kiệm API calls
            enableSmartSkipping: true
        };

        // TỐI ƯU 3: Batch processing
        this.batchProcessor = {
            queue: [],
            processing: false,
            batchSize: 5,
            batchTimeout: 2000
        };

        // Khởi động cache cleanup
        this.startCacheCleanup();
    }

    /**
     * Load all prompt templates from files (giữ nguyên)
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
     * Default prompt methods (giữ nguyên tất cả)
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

    loadDefaultPrompts() {
        // Fallback method - giữ nguyên
        this.nodeEdgeDescription = "Default node edge description";
        this.cypherPromptTemplate = "Default cypher prompt";
        this.answerPromptTemplate = this.getDefaultAnswerPrompt();
        this.classificationPromptTemplate = this.getDefaultClassificationPrompt();
        this.analysisPromptTemplate = this.getDefaultAnalysisPrompt();
        this.enrichmentPromptTemplate = this.getDefaultEnrichmentPrompt();
        this.complexAnswerPromptTemplate = this.getDefaultComplexAnswerPrompt();
        this.offTopicPromptTemplate = this.getDefaultOffTopicPrompt();
        this.socialPromptTemplate = this.getDefaultSocialPrompt();
    }

    /**
     * Load cấu hình Gemini từ DB (giữ nguyên)
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
     * TỐI ƯU: Smart Rate Limiting với Queue
     */
    async queueGeminiRequest(prompt, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const request = {
                prompt,
                priority,
                resolve,
                reject,
                timestamp: Date.now(),
                retryCount: 0
            };

            // Priority queue
            if (priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }

            this.processRequestQueue();
        });
    }

    async processRequestQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return;
        }

        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            setTimeout(() => this.processRequestQueue(), this.requestDelay - timeSinceLastRequest);
            return;
        }

        const request = this.requestQueue.shift();
        this.activeRequests++;
        this.lastRequestTime = now;

        try {
            const result = await this.callGeminiDirect(request.prompt);
            request.resolve(result);
        } catch (error) {
            // Intelligent retry với exponential backoff
            if (error.response?.status === 429) {
                const retryDelay = Math.min(5000 * Math.pow(2, request.retryCount), 30000);
                logger.warn(`[Rate Limit] Retrying after ${retryDelay}ms (attempt ${request.retryCount + 1})`);
                
                setTimeout(() => {
                    request.retryCount++;
                    if (request.retryCount <= 3) {
                        this.requestQueue.unshift(request); // High priority retry
                    } else {
                        request.reject(new Error('Max retries exceeded'));
                    }
                }, retryDelay);
            } else {
                request.reject(error);
            }
        } finally {
            this.activeRequests--;
            setTimeout(() => this.processRequestQueue(), this.requestDelay);
        }
    }

    /**
     * TỐI ƯU: Enhanced In-Memory Caching Only (No Redis) - FIXED
     */
    generateCacheKey(prompt, type = 'default') {
        const crypto = require('crypto');
        // FIX: Đảm bảo prompt được hash chính xác, không cắt ngắn quá sớm
        const cleanPrompt = prompt.replace(/\s+/g, ' ').trim();
        const hash = crypto.createHash('md5').update(cleanPrompt, 'utf8').digest('hex');
        return `gemini_${type}_${hash.substring(0, 16)}`; // Rút ngắn hash thay vì prompt
    }

    async getCachedResponse(cacheKey) {
        try {
            // Chỉ sử dụng in-memory cache
            if (this.responseCache.has(cacheKey)) {
                const cached = this.responseCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    this.cacheStats.hits++;
                    // FIX: Sử dụng logger.info thay vì logger.debug
                    logger.info(`[Cache] Memory hit: ${cacheKey}`);
                    
                    // LRU: Move to end (most recently used)
                    this.responseCache.delete(cacheKey);
                    this.responseCache.set(cacheKey, cached);
                    
                    return cached.data;
                } else {
                    // Expired cache
                    this.responseCache.delete(cacheKey);
                }
            }

            this.cacheStats.misses++;
            return null;
        } catch (error) {
            logger.warn(`[Cache] Error retrieving cache: ${error.message}`);
            return null;
        }
    }

    async setCachedResponse(cacheKey, data, ttl = 3600) {
        try {
            // Evict old entries if cache is full (LRU policy)
            if (this.responseCache.size >= this.maxCacheSize) {
                const firstKey = this.responseCache.keys().next().value;
                this.responseCache.delete(firstKey);
                this.cacheStats.evictions++;
                logger.info(`[Cache] Evicted old entry: ${firstKey}`);
            }

            // Add new entry
            this.responseCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            
            // FIX: Sử dụng logger.info thay vì logger.debug
            logger.info(`[Cache] Stored in memory: ${cacheKey}`);
        } catch (error) {
            logger.warn(`[Cache] Error storing cache: ${error.message}`);
        }
    }

    /**
     * TỐI ƯU: Enhanced Gemini call với caching và queue
     */
    async callGemini(prompt, options = {}) {
        const { cacheType = 'default', priority = 'normal', skipCache = false, ttl = 3600 } = options;
        const cacheKey = this.generateCacheKey(prompt, cacheType);

        // Check cache first
        if (!skipCache) {
            const cached = await this.getCachedResponse(cacheKey);
            if (cached) return cached;
        }

        // Queue request
        try {
            const result = await this.queueGeminiRequest(prompt, priority);
            
            // Cache successful responses
            if (result && !skipCache) {
                await this.setCachedResponse(cacheKey, result, ttl);
            }

            return result;
        } catch (error) {
            logger.error(`[Gemini] Request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Direct Gemini call (không qua queue - cho internal use)
     */
    async callGeminiDirect(prompt) {
        const response = await axios.post(
            `${this.apiUrl}?key=${this.apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            { timeout: 30000 }
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
     * TỐI ƯU: Classification với caching nhưng KHÔNG hardcode patterns
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
            // FIX: Tạo cache key chính xác cho từng câu hỏi
            const classificationPrompt = this.nodeEdgeDescription + '\n\n' +
                this.classificationPromptTemplate
                    .replace("<user_question>", question)
                    .replace("<chat_history>", JSON.stringify(chatHistory.slice(-2))); // Giảm context

            // FIX: Sử dụng câu hỏi gốc để tạo cache key, không phải toàn bộ prompt
            const result = await this.callGemini(classificationPrompt, { 
                cacheType: `classification_${question.substring(0, 50)}`, // Unique cache per question
                priority: 'high',
                ttl: 1800 // 30 phút cache
            });

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
     * Complex admission analysis (giữ nguyên logic, thêm caching)
     */
    async analyzeComplexQuestion(question, chatHistory, classification) {
        const analysisPrompt = this.nodeEdgeDescription + '\n\n' +
            this.analysisPromptTemplate
                .replace("<user_question>", question)
                .replace("<classification_info>", JSON.stringify(classification))
                .replace("<chat_history>", JSON.stringify(chatHistory.slice(-1))); // Giảm context

        try {
            return await this.callGemini(analysisPrompt, {
                cacheType: 'analysis',
                priority: 'high',
                ttl: 1800
            });
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
     * TỐI ƯU: Smart enrichment với giới hạn
     */
    async planEnrichmentQuery(question, mainContext, analysis, step = 1) {
        if (!analysis.strategy?.needsEnrichment || step > this.agentConfig.maxEnrichmentQueries) {
            return null;
        }

        // TỐI ƯU: Skip enrichment nếu đã có đủ context
        if (mainContext.length >= 10) {
            logger.info("[Agent] Skipping enrichment - sufficient context");
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
            const result = await this.callGemini(enrichmentPrompt, {
                cacheType: 'enrichment',
                ttl: 900 // 15 phút
            });

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
     * Generate enhanced answer cho complex questions (tối ưu context)
     */
    async generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory) {
        // TỐI ƯU: Giới hạn context size và history
        const limitedHistory = chatHistory.slice(-2); // Chỉ 2 turns gần nhất
        const limitedContext = allContext.slice(0, 20); // Tối đa 20 nodes

        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 200)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        const agentStepsText = agentSteps.map(step =>
            `- ${step.step}: ${step.description} (${step.resultCount || 0} nodes)`
        ).join('\n');

        const enhancedPrompt = this.complexAnswerPromptTemplate
            .replace("<user_question>", question)
            .replace("<chat_history>", historyText)
            .replace("<context_json>", JSON.stringify(limitedContext, null, 2))
            .replace("<primary_intent>", analysis.intent?.primary || 'unknown')
            .replace("<secondary_intents>", analysis.intent?.secondary?.join(', ') || 'none')
            .replace("<entities_info>", JSON.stringify(analysis.entities))
            .replace("<steps_count>", agentSteps.length)
            .replace("<agent_steps>", agentStepsText)
            .replace("<analysis_reasoning>", analysis.reasoning);

        try {
            return await this.callGemini(enhancedPrompt, {
                cacheType: 'complex_answer',
                ttl: 1800
            });
        } catch (error) {
            logger.error("[Agent] Complex answer generation failed", error);
            // Fallback to simple template
            const simplePrompt = this.answerPromptTemplate
                .replace("<user_question>", question)
                .replace("<context_json>", JSON.stringify(limitedContext, null, 2))
                .replace("<chat_history>", historyText);

            return await this.callGemini(simplePrompt);
        }
    }

    /**
     * MAIN METHOD: Generate answer với optimizations
     */
    async generateAnswer(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();
        logger.info(`=== Bắt đầu xử lý tối ưu: "${question}" ===`);

        try {
            // PHASE 1: Classification với caching
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
                    return await this.handleComplexAdmissionOptimized(question, questionEmbedding, chatHistory, classification);

                default:
                    logger.warn(`[Classification] Unknown category: ${classification.category}, fallback to simple`);
                    return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
            }
        } catch (error) {
            logger.error("[System] Critical error, emergency fallback", error);
            return this.emergencyFallback(question);
        } finally {
            const totalTime = (Date.now() - startTime) / 1000;
            logger.info(`=== Hoàn thành trong ${totalTime}s, Cache stats: ${this.cacheStats.hits}/${this.cacheStats.hits + this.cacheStats.misses} hits ===`);
        }
    }

    /**
     * TỐI ƯU: Complex admission handler
     */
    async handleComplexAdmissionOptimized(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Processing with optimized Agent intelligence");

        let agentSteps = [];
        let allContext = [];
        let cypher = "";

        try {
            // Step 1: Deep analysis với caching
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

                // Step 3: TỐI ƯU Smart enrichment (chỉ 1 bước thay vì 2)
                if (analysis.strategy?.needsEnrichment && mainContext.length > 0 && mainContext.length < 10) {
                    const enrichment = await this.planEnrichmentQuery(question, allContext, analysis, 1);
                    if (enrichment) {
                        try {
                            const enrichmentContext = await this.getContextFromCypher(enrichment.cypher);
                            if (enrichmentContext.length > 0) {
                                allContext.push(...enrichmentContext);
                                agentSteps.push({
                                    step: `enrichment_1`,
                                    description: enrichment.purpose,
                                    resultCount: enrichmentContext.length,
                                    cypher: enrichment.cypher,
                                    infoType: enrichment.infoType
                                });
                            } else {
                                logger.info(`[Agent] Enrichment returned no results, proceeding with main context`);
                            }
                        } catch (enrichError) {
                            logger.warn(`[Agent] Enrichment failed`, enrichError);
                        }
                    }
                } else {
                    logger.info("[Agent] Skipping enrichment - sufficient context or disabled");
                }

                // Step 4: Enhanced answer generation
                const answer = await this.generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory);

                const totalTime = (Date.now() - Date.now()) / 1000;
                logger.info(`[Complex] Agent completed with ${agentSteps.length} steps`);

                return {
                    answer: answer || "Xin lỗi, tôi không thể trả lời câu hỏi phức tạp này.",
                    prompt: "",
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
     * Handler methods (giữ nguyên tất cả)
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

    async handleOffTopicQuestion(question, classification, chatHistory) {
        const offTopicPrompt = this.offTopicPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(offTopicPrompt, {
                cacheType: 'off_topic',
                ttl: 1800
            });
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

    async handleSimpleAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Simple] Processing with traditional RAG");
        const result = await this.generateAnswerTraditional(question, questionEmbedding, chatHistory);

        // Add classification metadata
        result.category = 'simple_admission';
        result.processingMethod = 'rag_simple';

        return result;
    }

    /**
     * Traditional RAG mode với optimizations
     */
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = []) {
        let retries = 0;
        const maxRetries = this.agentConfig.maxRetries; // Sử dụng config
        let lastError = null;
        let cypherResult = null;
        let contextNodes = [];
        let cypher = "";
        let prompt = "";
        let answer = "";
        let isError = false;
        let is_social = false;

        const startTime = Date.now();

        // 1. Sinh cypher với caching
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

        // 3. Sinh answer với caching
        const limitedHistory = chatHistory.slice(-2); // TỐI ƯU: Giới hạn history
        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 150)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        prompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(contextNodes.slice(0, 15), null, 2)) // TỐI ƯU: Giới hạn context
            .replace("<chat_history>", historyText);

        retries = 0;
        while (retries < maxRetries) {
            try {
                answer = await this.callGemini(prompt, {
                    cacheType: 'simple_answer',
                    ttl: 1800
                });
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

    async handleSocialQuestion(question, chatHistory) {
        const socialPrompt = this.socialPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(socialPrompt, {
                cacheType: 'social',
                ttl: 3600
            });
            return answer || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }

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
     * TỐI ƯU: Generate Cypher với caching - FIXED
     */
    async generateCypher(question, questionEmbedding) {
        // FIX: Cache key dựa trên question, không phải template
        const cacheKey = this.generateCacheKey(`cypher_question_${question}`, 'cypher');
        
        // Check cache first
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
            logger.info("[Cypher] Cache hit");
            return cached;
        }

        const prompt = [
            this.nodeEdgeDescription,
            this.cypherPromptTemplate.replace("<user_question>", question)
        ].join('\n\n');

        let retries = 0;
        const maxRetries = this.agentConfig.maxRetries;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                const res = await this.queueGeminiRequest(prompt, 'high');

                let result = res;
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
                    // Cache successful result
                    await this.setCachedResponse(cacheKey, result, 1800); // 30 min
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
                    await this.setCachedResponse(cacheKey, result, 1800);
                    return result;
                }

                lastError = new Error("Gemini trả về sai định dạng, không có labels/cypher/is_social.");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        throw lastError || new Error("Gemini không trả về kết quả hợp lệ sau nhiều lần thử.");
    }

    async getContextFromCypher(cypher, params = {}, options = {}) {
        try {
            return await neo4jRepository.execute(cypher, params, { raw: false, ...options });
        } catch (err) {
            logger.error("Lỗi truy vấn:", err);
            return [];
        }
    }

    /**
     * TỐI ƯU: Batch processing helpers (dành cho future scaling)
     */
    async addToBatch(requestData) {
        return new Promise((resolve, reject) => {
            this.batchProcessor.queue.push({
                ...requestData,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Auto-process if batch is full
            if (this.batchProcessor.queue.length >= this.batchProcessor.batchSize) {
                this.processBatch();
            } else {
                // Process after timeout
                setTimeout(() => {
                    if (this.batchProcessor.queue.length > 0 && !this.batchProcessor.processing) {
                        this.processBatch();
                    }
                }, this.batchProcessor.batchTimeout);
            }
        });
    }

    async processBatch() {
        if (this.batchProcessor.processing || this.batchProcessor.queue.length === 0) {
            return;
        }

        this.batchProcessor.processing = true;
        const batch = this.batchProcessor.queue.splice(0, this.batchProcessor.batchSize);
        
        logger.info(`[Batch] Processing ${batch.length} requests`);

        try {
            // Process batch với limited concurrency
            const results = await Promise.allSettled(
                batch.map(item => this.processSingleBatchItem(item))
            );

            // Handle results
            results.forEach((result, index) => {
                const { resolve, reject } = batch[index];
                if (result.status === 'fulfilled') {
                    resolve(result.value);
                } else {
                    reject(result.reason);
                }
            });
        } catch (error) {
            logger.error("[Batch] Batch processing error:", error);
            batch.forEach(item => item.reject(error));
        } finally {
            this.batchProcessor.processing = false;
            
            // Process next batch if queue has items
            if (this.batchProcessor.queue.length > 0) {
                setTimeout(() => this.processBatch(), 100);
            }
        }
    }

    async processSingleBatchItem(item) {
        // Process individual batch item
        return await this.generateAnswer(item.question, item.questionEmbedding, item.chatHistory);
    }

    /**
     * TỐI ƯU: Cache statistics và monitoring (No Redis)
     */
    getCacheStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.cacheStats,
            hitRate: `${hitRate}%`,
            memoryCache: this.responseCache.size,
            maxCacheSize: this.maxCacheSize,
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests,
            cacheType: 'memory-only'
        };
    }

    /**
     * TỐI ƯU: Clear cache methods (No Redis)
     */
    clearMemoryCache() {
        this.responseCache.clear();
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
        logger.info("[Cache] Memory cache cleared");
    }

    async clearAllCache() {
        this.clearMemoryCache();
        logger.info("[Cache] All cache cleared (memory-only mode)");
    }

    /**
     * TỐI ƯU: Periodic cache cleanup để tránh memory leak
     */
    startCacheCleanup() {
        // Cleanup expired entries every 30 minutes
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            
            for (const [key, value] of this.responseCache.entries()) {
                if (now - value.timestamp > this.cacheTimeout) {
                    this.responseCache.delete(key);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                logger.info(`[Cache] Cleaned ${cleaned} expired entries`);
            }
        }, 30 * 60 * 1000); // 30 minutes
    }
}

module.exports = new BotService();