const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");
const CommonRepo = require('../../../repositories/systemconfigs/common.repository');

class BotService {
    constructor() {
        // API Configuration - GIỮ NGUYÊN
        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;

        // CẢI TIẾN: Tăng performance với backward compatibility
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 6; // Tăng từ 3
        this.requestDelay = parseInt(process.env.REQUEST_DELAY) || 500; // Giảm từ 1000ms
        this.lastRequestTime = 0;

        // THÊM: Simple circuit breaker (có thể disable)
        this.circuitBreaker = {
            enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
            failures: 0,
            threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 3,
            timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 30000,
            lastFailTime: 0,
            state: 'CLOSED'
        };

        // CẢI TIẾN: Enhanced cache với data versioning
        this.responseCache = new Map();
        this.cacheTimeout = parseInt(process.env.CACHE_TIMEOUT) || 3600000; // 1 hour
        this.maxCacheSize = parseInt(process.env.MAX_CACHE_SIZE) || 2000;
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
        this.dataVersion = this.loadDataVersion();

        // THÊM: Performance tracking
        this.performanceStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            responseTimeSum: 0,
            lastResetTime: Date.now()
        };

        // GIỮ NGUYÊN: Load all prompt templates
        this.loadPromptTemplates();

        // GIỮ NGUYÊN: Agent configuration
        this.agentConfig = {
            maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
            confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7,
            enableClassification: process.env.ENABLE_CLASSIFICATION !== 'false',
            maxEnrichmentQueries: parseInt(process.env.MAX_ENRICHMENT_QUERIES) || 1,
            enableSmartSkipping: true
        };

        // Start background tasks
        this.startCacheCleanup();
        this.startPerformanceLogging();
    }

    // =====================================================
    // DATA VERSIONING - CẢI TIẾN QUAN TRỌNG
    // =====================================================
    loadDataVersion() {
        try {
            // Cố gắng load từ file hoặc database
            const versionFile = path.join(__dirname, '../../../data/data_version.txt');
            if (fs.existsSync(versionFile)) {
                return fs.readFileSync(versionFile, 'utf8').trim();
            }
        } catch (error) {
            logger.warn('[Cache] Could not load data version:', error.message);
        }
        return Date.now().toString(); // Fallback
    }

    updateDataVersion() {
        try {
            this.dataVersion = Date.now().toString();
            const versionFile = path.join(__dirname, '../../../data/data_version.txt');
            fs.writeFileSync(versionFile, this.dataVersion);

            // Clear cache when data version changes
            this.clearMemoryCache();
            logger.info(`[Cache] Data version updated: ${this.dataVersion}`);
        } catch (error) {
            logger.error('[Cache] Failed to update data version:', error.message);
        }
    }

    // =====================================================
    // ENHANCED CACHE SYSTEM
    // =====================================================
    generateCacheKey(prompt, type = 'default') {
        const combined = `${prompt}_${type}_v${this.dataVersion}`;
        const hash = crypto.createHash('md5').update(combined, 'utf8').digest('hex');
        return `gemini_${type}_${hash.substring(0, 16)}`;
    }

    async getCachedResponse(cacheKey) {
        try {
            if (this.responseCache.has(cacheKey)) {
                const cached = this.responseCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    this.cacheStats.hits++;
                    logger.info(`[Cache] Memory hit: ${cacheKey}`);

                    // LRU: Move to end
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

    async setCachedResponse(cacheKey, data) {
        try {
            // Evict old entries if cache is full (LRU policy)
            if (this.responseCache.size >= this.maxCacheSize) {
                const firstKey = this.responseCache.keys().next().value;
                this.responseCache.delete(firstKey);
                this.cacheStats.evictions++;
            }

            // Add new entry
            this.responseCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            logger.info(`[Cache] Stored in memory: ${cacheKey}`);
        } catch (error) {
            logger.warn(`[Cache] Error storing cache: ${error.message}`);
        }
    }

    clearMemoryCache() {
        this.responseCache.clear();
        this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
        logger.info("[Cache] Memory cache cleared");
    }

    // =====================================================
    // CIRCUIT BREAKER PATTERN
    // =====================================================
    shouldSkipGemini() {
        if (!this.circuitBreaker.enabled) return false;

        const now = Date.now();

        switch (this.circuitBreaker.state) {
            case 'OPEN':
                if (now - this.circuitBreaker.lastFailTime > this.circuitBreaker.timeout) {
                    this.circuitBreaker.state = 'HALF_OPEN';
                    logger.info('[Circuit Breaker] OPEN -> HALF_OPEN');
                    return false;
                }
                return true;

            case 'HALF_OPEN':
                return false; // Try one request

            case 'CLOSED':
            default:
                return false;
        }
    }

    handleGeminiFailure(error) {
        if (!this.circuitBreaker.enabled) return;

        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailTime = Date.now();

        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.state = 'OPEN';
            logger.warn(`[Circuit Breaker] OPEN after ${this.circuitBreaker.failures} failures`);
        }
    }

    resetCircuitBreaker() {
        if (!this.circuitBreaker.enabled) return;

        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.lastFailTime = 0;
        logger.info('[Circuit Breaker] Reset to CLOSED');
    }

    // =====================================================
    // ENHANCED REQUEST QUEUE
    // =====================================================
    async queueGeminiRequest(prompt, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const request = {
                prompt,
                priority,
                resolve,
                reject,
                timestamp: Date.now(),
                retryCount: 0,
                id: Math.random().toString(36).substr(2, 9)
            };

            // Priority queue
            if (priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }

            this.processRequestQueue();

            // Request timeout
            setTimeout(() => {
                const index = this.requestQueue.findIndex(r => r.id === request.id);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Request timeout'));
                }
            }, 60000); // 60 second timeout
        });
    }

    async processRequestQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests ||
            this.requestQueue.length === 0 ||
            this.shouldSkipGemini()) {
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
        if (!request) return;

        this.activeRequests++;
        this.lastRequestTime = now;
        this.performanceStats.totalRequests++;

        try {
            const startTime = Date.now();
            const result = await this.callGeminiDirect(request.prompt);
            const responseTime = Date.now() - startTime;

            // Update performance stats
            this.performanceStats.successfulRequests++;
            this.performanceStats.responseTimeSum += responseTime;
            this.performanceStats.avgResponseTime = Math.round(
                this.performanceStats.responseTimeSum / this.performanceStats.successfulRequests
            );

            // Reset circuit breaker on success
            if (this.circuitBreaker.state === 'HALF_OPEN') {
                this.resetCircuitBreaker();
            }

            request.resolve(result);

        } catch (error) {
            this.performanceStats.failedRequests++;
            this.handleGeminiFailure(error);

            // Intelligent retry
            if (this.shouldRetryRequest(request, error)) {
                const retryDelay = this.calculateRetryDelay(request.retryCount);
                setTimeout(() => {
                    request.retryCount++;
                    this.requestQueue.unshift(request); // High priority retry
                }, retryDelay);
            } else {
                request.reject(error);
            }

        } finally {
            this.activeRequests--;
            setTimeout(() => this.processRequestQueue(), this.requestDelay);
        }
    }

    shouldRetryRequest(request, error) {
        if (request.retryCount >= this.agentConfig.maxRetries) {
            return false;
        }

        // Retry on specific error conditions
        const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
        const retryableStatusCodes = [429, 500, 502, 503, 504];

        return retryableErrors.includes(error.code) ||
            retryableStatusCodes.includes(error.response?.status) ||
            error.message.includes('timeout');
    }

    calculateRetryDelay(retryCount) {
        // Exponential backoff with jitter
        const baseDelay = 1000;
        const maxDelay = 10000;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        const jitter = Math.random() * 1000;
        return exponentialDelay + jitter;
    }

    // =====================================================
    // ENHANCED GEMINI CALLS
    // =====================================================
    async callGemini(prompt, options = {}) {
        const { cacheType = 'default', priority = 'normal', skipCache = false } = options;
        const cacheKey = this.generateCacheKey(prompt, cacheType);

        // Check cache first
        if (!skipCache) {
            const cached = await this.getCachedResponse(cacheKey);
            if (cached) return cached;
        }

        // Circuit breaker check
        if (this.shouldSkipGemini()) {
            throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        try {
            const result = await this.queueGeminiRequest(prompt, priority);

            // Cache successful responses
            if (result && !skipCache) {
                await this.setCachedResponse(cacheKey, result);
            }

            return result;
        } catch (error) {
            logger.error(`[Gemini] Request failed: ${error.message}`);
            throw error;
        }
    }

    async callGeminiDirect(prompt) {
        const response = await axios.post(
            `${this.apiUrl}?key=${this.apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        let result = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Parse JSON if present
        if (typeof result === "string") {
            const jsonMatch = result.match(/```json([\s\S]*?)```/);
            if (jsonMatch) {
                result = jsonMatch[1].trim();
            }
            try {
                result = JSON.parse(result);
            } catch (e) {
                // Not JSON, return as string
            }
        }

        return result;
    }

    // =====================================================
    // LOAD PROMPT TEMPLATES - GIỮ NGUYÊN LOGIC CŨ
    // =====================================================
    loadPromptTemplates() {
        const configPath = path.join(__dirname, "../../../data/configs/");

        try {
            this.nodeEdgeDescription = fs.readFileSync(path.join(configPath, "data_structure.txt"), "utf-8");
            this.cypherPromptTemplate = fs.readFileSync(path.join(configPath, "cypher_prompt.txt"), "utf-8");
            this.answerPromptTemplate = fs.existsSync(path.join(configPath, "answer_prompt.txt"))
                ? fs.readFileSync(path.join(configPath, "answer_prompt.txt"), "utf-8")
                : this.getDefaultAnswerPrompt();

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

    // =====================================================
    // DEFAULT PROMPTS - GIỮ NGUYÊN TẤT CẢ
    // =====================================================
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

    // =====================================================
    // LOAD GEMINI CONFIG - GIỮ NGUYÊN
    // =====================================================
    async loadGeminiConfig() {
        try {
            const config = await CommonRepo.getValues(['gemini_api_url', 'gemini_api_key']);
            const dbApiUrl = config.gemini_api_url?.trim();
            const dbApiKey = config.gemini_api_key?.trim();

            if (dbApiUrl && dbApiKey) {
                logger.info(`[Gemini Config] Found database config`);

                try {
                    const res = await axios.post(
                        `${dbApiUrl}?key=${dbApiKey}`,
                        { contents: [{ parts: [{ text: "Ping" }] }] },
                        { timeout: 5000 }
                    );

                    const firstCandidate = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (typeof firstCandidate === "string") {
                        logger.info("[Gemini Config] Database config validated, applying");
                        this.apiUrl = dbApiUrl;
                        this.apiKey = dbApiKey;
                        return;
                    }
                } catch (err) {
                    logger.warn("[Gemini Config] Database config validation failed, using environment");
                }
            }
        } catch (err) {
            logger.error("[Gemini Config] Error loading from database, using environment", err);
        }

        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;
        logger.info(`[Gemini Config] Using environment config`);
    }

    // =====================================================
    // CLASSIFICATION - CẢI TIẾN VỚI CACHING
    // =====================================================
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

            const result = await this.callGemini(classificationPrompt, {
                cacheType: 'classification',
                priority: 'high'
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
                    logger.info(`[Classification] ${result.category} (confidence: ${result.confidence})`);
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

    // =====================================================
    // COMPLEX ADMISSION ANALYSIS
    // =====================================================
    async analyzeComplexQuestion(question, chatHistory, classification) {
        const analysisPrompt = this.nodeEdgeDescription + '\n\n' +
            this.analysisPromptTemplate
                .replace("<user_question>", question)
                .replace("<classification_info>", JSON.stringify(classification))
                .replace("<chat_history>", JSON.stringify(chatHistory.slice(-1)));

        try {
            return await this.callGemini(analysisPrompt, {
                cacheType: 'analysis',
                priority: 'high'
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

    // =====================================================
    // ENRICHMENT PLANNING
    // =====================================================
    async planEnrichmentQuery(question, mainContext, analysis, step = 1) {
        if (!analysis.strategy?.needsEnrichment || step > this.agentConfig.maxEnrichmentQueries) {
            return null;
        }

        // Skip enrichment if sufficient context
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
                cacheType: 'enrichment'
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

    // =====================================================
    // COMPLEX ANSWER GENERATION
    // =====================================================
    async generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory) {
        const limitedHistory = chatHistory.slice(-2);
        const limitedContext = allContext.slice(0, 20);

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
                cacheType: 'complex_answer'
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

    // =====================================================
    // MAIN GENERATE ANSWER METHOD
    // =====================================================
    async generateAnswer(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substr(2, 9);

        logger.info(`[${requestId}] Processing: "${question.substring(0, 80)}..."`);

        try {
            // Load Gemini config if needed
            await this.loadGeminiConfig();

            // Phase 1: Classification
            const classification = await this.classifyQuestion(question, chatHistory);
            logger.info(`[${requestId}] Classification: ${classification.category} (${classification.confidence})`);

            let result;

            switch (classification.category) {
                case 'inappropriate':
                    result = await this.handleInappropriateQuestion(question, classification);
                    break;

                case 'off_topic':
                    result = await this.handleOffTopicQuestion(question, classification, chatHistory);
                    break;

                case 'simple_admission':
                    result = await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
                    break;

                case 'complex_admission':
                    result = await this.handleComplexAdmissionOptimized(question, questionEmbedding, chatHistory, classification);
                    break;

                default:
                    logger.warn(`[${requestId}] Unknown category: ${classification.category}, fallback to simple`);
                    result = await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
            }

            // Add metadata
            result.requestId = requestId;
            result.classification = classification;
            result.processingTime = (Date.now() - startTime) / 1000;

            return result;

        } catch (error) {
            logger.error(`[${requestId}] Critical error:`, error);
            return this.emergencyFallback(question, requestId);
        } finally {
            const totalTime = (Date.now() - startTime) / 1000;
            logger.info(`[${requestId}] Completed in ${totalTime}s`);
        }
    }

    // =====================================================
    // HANDLER METHODS
    // =====================================================
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
            processingMethod: 'rule_based',
            processingTime: 0.1
        };
    }

    async handleOffTopicQuestion(question, classification, chatHistory) {
        const offTopicPrompt = this.offTopicPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(offTopicPrompt, {
                cacheType: 'off_topic'
            });

            return {
                answer: answer || `Cảm ơn bạn đã hỏi! Tuy nhiên câu hỏi này không liên quan đến tuyển sinh TDTU. Tôi chuyên hỗ trợ thông tin về các ngành học, học phí, và tư vấn tuyển sinh tại TDTU. Bạn có muốn tìm hiểu về ngành nào không ạ?`,
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

    async handleSimpleAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Simple] Processing with traditional RAG");

        try {
            const result = await this.generateAnswerTraditional(question, questionEmbedding, chatHistory);
            result.category = 'simple_admission';
            result.processingMethod = 'rag_simple';
            return result;
        } catch (error) {
            logger.error("[Simple] Traditional RAG failed:", error);
            return this.emergencyFallback(question);
        }
    }

    async handleComplexAdmissionOptimized(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Processing with optimized Agent intelligence");

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

            // Step 2: Main query
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

                // Step 3: Smart enrichment (optional)
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
                            }
                        } catch (enrichError) {
                            logger.warn(`[Agent] Enrichment failed`, enrichError);
                        }
                    }
                }

                // Step 4: Enhanced answer generation
                const answer = await this.generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory);

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
                    analysis: analysis
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

    async handleSocialQuestion(question, chatHistory) {
        const socialPrompt = this.socialPromptTemplate
            .replace("<user_question>", question);

        try {
            const answer = await this.callGemini(socialPrompt, {
                cacheType: 'social'
            });
            return answer || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }

    // =====================================================
    // TRADITIONAL RAG MODE
    // =====================================================
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = []) {
        let retries = 0;
        const maxRetries = this.agentConfig.maxRetries;
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

        // 2. Get context nodes
        contextNodes = await this.getContextFromCypher(cypher);

        // 3. Generate answer
        const limitedHistory = chatHistory.slice(-2);
        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 150)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        prompt = this.answerPromptTemplate
            .replace("<user_question>", question)
            .replace("<context_json>", JSON.stringify(contextNodes.slice(0, 15), null, 2))
            .replace("<chat_history>", historyText);

        retries = 0;
        while (retries < maxRetries) {
            try {
                answer = await this.callGemini(prompt, {
                    cacheType: 'simple_answer'
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

    // =====================================================
    // CYPHER GENERATION
    // =====================================================
    async generateCypher(question, questionEmbedding) {
        const prompt = [
            this.nodeEdgeDescription,
            this.cypherPromptTemplate.replace("<user_question>", question)
        ].join('\n\n');

        let retries = 0;
        const maxRetries = this.agentConfig.maxRetries;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                const res = await this.callGemini(prompt, {
                    cacheType: 'cypher',
                    priority: 'high'
                });

                let result = res;
                if (typeof result === "string") {
                    const jsonMatch = result.match(/```json([\s\S]*?)```/);
                    if (jsonMatch) {
                        result = jsonMatch[1].trim();
                    }
                    try {
                        result = JSON.parse(result);
                    } catch (e) {
                        lastError = e;
                        retries++;
                        continue;
                    }
                }

                // Validate result structure
                if (
                    result &&
                    typeof result === "object" &&
                    Array.isArray(result.labels) &&
                    typeof result.cypher === "string" &&
                    typeof result.is_social === "boolean"
                ) {
                    return result;
                }

                // Handle legacy format without is_social
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

                lastError = new Error("Invalid response format from Gemini");
                retries++;
            } catch (err) {
                lastError = err;
                retries++;
            }
        }

        throw lastError || new Error("Failed to generate valid cypher after retries");
    }

    async getContextFromCypher(cypher, params = {}, options = {}) {
        try {
            return await neo4jRepository.execute(cypher, params, { raw: false, ...options });
        } catch (err) {
            logger.error("Database query error:", err);
            return [];
        }
    }

    // =====================================================
    // EMERGENCY FALLBACK
    // =====================================================
    emergencyFallback(question, requestId = 'unknown') {
        const circuitBreakerInfo = this.circuitBreaker.state === 'OPEN' ?
            ' Dịch vụ tạm thời không khả dụng.' : '';

        const emergencyMessage = `
**Xin lỗi, hệ thống đang gặp sự cố kỹ thuật.${circuitBreakerInfo}**

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

    // =====================================================
    // MONITORING & STATS
    // =====================================================
    async healthCheck() {
        const queueHealth = this.requestQueue.length < 20 ? 'healthy' : 'degraded';
        const circuitBreakerHealth = this.circuitBreaker.state === 'OPEN' ? 'degraded' : 'healthy';
        const overallHealth = (queueHealth === 'healthy' && circuitBreakerHealth === 'healthy') ? 'healthy' : 'degraded';

        return {
            status: overallHealth,
            timestamp: new Date().toISOString(),
            services: {
                gemini: {
                    circuitBreakerState: this.circuitBreaker.state,
                    failures: this.circuitBreaker.failures,
                    available: this.circuitBreaker.state !== 'OPEN'
                },
                cache: {
                    size: this.responseCache.size,
                    maxSize: this.maxCacheSize,
                    hitRate: this.getCacheHitRate(),
                    dataVersion: this.dataVersion
                },
                database: await this.checkDatabaseHealth()
            },
            performance: {
                queue: {
                    pending: this.requestQueue.length,
                    active: this.activeRequests,
                    maxConcurrent: this.maxConcurrentRequests
                },
                stats: this.performanceStats,
                avgResponseTime: this.performanceStats.avgResponseTime
            }
        };
    }

    async checkDatabaseHealth() {
        try {
            await neo4jRepository.execute('RETURN 1 as health', {});
            return { status: 'healthy', available: true };
        } catch (error) {
            return {
                status: 'unhealthy',
                available: false,
                error: error.message
            };
        }
    }

    getCacheHitRate() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        if (total === 0) return "0%";
        return `${((this.cacheStats.hits / total) * 100).toFixed(2)}%`;
    }

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
            circuitBreakerState: this.circuitBreaker.state,
            dataVersion: this.dataVersion
        };
    }

    getPerformanceStats() {
        const errorRate = this.performanceStats.totalRequests > 0
            ? ((this.performanceStats.failedRequests / this.performanceStats.totalRequests) * 100).toFixed(2)
            : 0;

        const successRate = this.performanceStats.totalRequests > 0
            ? ((this.performanceStats.successfulRequests / this.performanceStats.totalRequests) * 100).toFixed(2)
            : 0;

        return {
            ...this.performanceStats,
            errorRate: `${errorRate}%`,
            successRate: `${successRate}%`,
            uptime: Math.round((Date.now() - this.performanceStats.lastResetTime) / 1000)
        };
    }

    // =====================================================
    // BACKGROUND TASKS
    // =====================================================
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

    startPerformanceLogging() {
        // Log performance stats every 10 minutes
        setInterval(() => {
            const stats = this.getPerformanceStats();
            const cacheStats = this.getCacheStats();

            logger.info('[Performance] Stats:', {
                requests: stats,
                cache: cacheStats,
                queue: {
                    pending: this.requestQueue.length,
                    active: this.activeRequests
                },
                circuitBreaker: this.circuitBreaker.state
            });
        }, 10 * 60 * 1000); // 10 minutes
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================
    resetPerformanceStats() {
        this.performanceStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            responseTimeSum: 0,
            lastResetTime: Date.now()
        };
        logger.info('[Performance] Stats reset');
    }

    // Method để trigger data version update manually
    async triggerDataVersionUpdate() {
        this.updateDataVersion();
        logger.info('[Cache] Data version manually updated, cache cleared');
    }

    // Graceful shutdown
    async shutdown() {
        logger.info('[BotService] Starting graceful shutdown...');

        // Wait for active requests to complete (max 30 seconds)
        const maxWaitTime = 30000;
        const startTime = Date.now();

        while (this.activeRequests > 0 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.info('[BotService] Graceful shutdown completed');
    }
}

module.exports = new BotService();