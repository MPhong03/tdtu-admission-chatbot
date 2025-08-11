const logger = require("../../../utils/logger.util");
const GeminiService = require("./gemini.service");
const PromptService = require("./prompt.service");
const ClassificationService = require("./classification.service");
const CypherService = require("./cypher.service");
const AgentService = require("./agent.service");
const AnswerService = require("./answer.service");
const MonitoringService = require("./monitoring.service");
const CacheService = require("../cachings/cache.service");
const VerificationService = require("./verification.service");
const WebSocketProgressService = require("../../../websocket-progress.service");

class BotService {
    constructor() {
        // Initialize core services
        this.cache = new CacheService(
            process.env.REDIS_URL || 'redis://localhost:6379',
            {
                ttlSeconds: parseInt(process.env.CACHE_TTL) || 7 * 24 * 60 * 60,
                maxMemoryItems: parseInt(process.env.MAX_CACHE_SIZE) || 2000,
                enableFallback: process.env.ENABLE_FALLBACK !== 'false'
            }
        );

        this.gemini = new GeminiService();
        this.prompts = new PromptService();
        this.classification = new ClassificationService(this.gemini, this.prompts, this.cache);
        this.cypher = new CypherService(this.gemini, this.prompts, this.cache);
        this.agent = new AgentService(this.gemini, this.prompts, this.cache, this.cypher);
        this.answer = new AnswerService(this.gemini, this.prompts, this.cache, this.cypher);
        this.monitoring = new MonitoringService(this.gemini, this.cache);
        this.verification = new VerificationService(this.gemini, this.prompts, this.cache);

        // Set bot service reference for progress tracking
        this.agent.setBotService(this);

        // Service configuration
        this.config = {
            maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
            confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7,
            enableClassification: process.env.ENABLE_CLASSIFICATION !== 'false',
            // NEW: Cypher validation configuration
            enableCypherValidation: process.env.ENABLE_CYPHER_VALIDATION !== 'false',
            cypherValidationMode: process.env.CYPHER_VALIDATION_MODE || 'auto' // 'auto', 'always', 'never'
        };

        // Progress tracking
        this.socketInstance = null;
        this.currentRequestId = null;

        // Initialize
        this.initialize();
    }

    // ===== PROGRESS TRACKING METHODS =====
    setSocketInstance(socket) {
        this.socketInstance = socket;
    }

    setCurrentRequestId(requestId) {
        this.currentRequestId = requestId;
    }

    emitProgress(step, description, details = {}) {
        // Hỗ trợ cả socket trực tiếp và WebSocket progress service
        if (this.socketInstance && this.currentRequestId) {
            // Socket trực tiếp (cho socket handler)
            this.socketInstance.emit('chat:progress', {
                requestId: this.currentRequestId,
                step,
                description,
                timestamp: Date.now(),
                ...details
            });
            logger.info(`[Progress] ${step}: ${description}`);
        } else if (this.currentRequestId) {
            // WebSocket progress service (cho HTTP API)
            WebSocketProgressService.emitProgress(this.currentRequestId, step, description, details);
        }
    }

    mapStepToUserFriendly(step) {
        const stepMap = {
            'classification': 'Đang phân tích câu hỏi...',
            'analysis': 'Đang phân tích chi tiết...',
            'main_query': 'Đang tìm kiếm dữ liệu...',
            'main_query_validation': 'Đang kiểm tra và tối ưu tìm kiếm...',
            'context_score_main': 'Đang đánh giá thông tin...',
            'enrichment_1': 'Đang mở rộng tìm kiếm (1/3)...',
            'enrichment_2': 'Đang mở rộng tìm kiếm (2/3)...',
            'enrichment_3': 'Đang mở rộng tìm kiếm (3/3)...',
            'context_score_enrichment_1': 'Đang đánh giá thông tin bổ sung...',
            'context_score_enrichment_2': 'Đang đánh giá thông tin bổ sung...',
            'context_score_enrichment_3': 'Đang đánh giá thông tin bổ sung...',
            'answer_generation': 'Đang tạo câu trả lời...',
            'verification': 'Đang kiểm tra chất lượng câu trả lời...'
        };
        return stepMap[step] || `Đang xử lý ${step}...`;
    }

    async initialize() {
        try {
            logger.info("[BotService] Starting initialization...");
            
            // Load Gemini configuration
            await this.gemini.loadConfig();
            logger.info("[BotService] Gemini config loaded");
            
            // Log validation service status
            const validationStats = this.cypher.getValidationStats();
            logger.info("[BotService] Cypher validation enabled:", validationStats.enabled);
            
            logger.info("[BotService] Successfully initialized all services");
        } catch (error) {
            logger.error("[BotService] Initialization failed:", error);
        }
    }

    // ===================================================
    // MAIN GENERATE ANSWER METHOD - With Cypher Validation
    // ===================================================
    async generateAnswer(question, questionEmbedding, chatHistory = [], socket = null) {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substr(2, 9);

        // Set up progress tracking
        if (socket) {
            this.setSocketInstance(socket);
            this.setCurrentRequestId(requestId);
        }

        logger.info(`[${requestId}] Processing: "${question.substring(0, 80)}..." (validation: ${this.config.enableCypherValidation})`);

        try {
            // Phase 1: Classification with enhanced data collection
            this.emitProgress('classification', this.mapStepToUserFriendly('classification'));
            
            const classification = await this.classification.classify(question, chatHistory);
            logger.info(`[${requestId}] Classification: ${classification.category} (${classification.confidence})`);

            let result;

            // Phase 2: Route to appropriate handler with enhanced tracking
            switch (classification.category) {
                case 'inappropriate':
                    result = this.answer.generateInappropriateResponse(question, classification);
                    result = this.enhanceResultWithStandardData(result, classification, startTime);
                    break;

                case 'off_topic':
                    result = await this.answer.generateOffTopicResponse(question, classification, chatHistory);
                    result = this.enhanceResultWithStandardData(result, classification, startTime);
                    break;

                case 'simple_admission':
                    result = await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
                    break;

                case 'complex_admission':
                    result = await this.handleComplexAdmission(question, questionEmbedding, chatHistory, classification);
                    break;

                default:
                    logger.warn(`[${requestId}] Unknown category: ${classification.category}, fallback to simple`);
                    result = await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
            }

            // Add final metadata
            result.requestId = requestId;
            result.classification = classification;
            if (!result.processingTime) {
                result.processingTime = (Date.now() - startTime) / 1000;
            }

            // ===== NEW: ADD CYPHER VALIDATION INFO =====
            if (result.validationInfo) {
                result.cypherValidationSummary = this.summarizeValidationInfo(result.validationInfo, result.validationSummary);
            }

            // ===== ADD VERIFICATION INFO =====
            this.emitProgress('answer_generation', this.mapStepToUserFriendly('answer_generation'));
            
            result.verificationInfo = await this.performAnswerVerification(
                question, 
                result.answer, 
                result.contextNodes || [], 
                classification.category,
                result.contextScore || 0 // Pass contextScore to verification
            );

            // Add verification data to result for HistoryService
            result.isVerified = result.verificationInfo.isVerified;
            result.verificationScore = result.verificationInfo.score;
            result.verificationReason = result.verificationInfo.reasoning;
            result.verificationResult = result.verificationInfo.isCorrect ? 'correct' : (result.verificationInfo.isIncorrect ? 'incorrect' : 'pending');

            this.emitProgress('verification', this.mapStepToUserFriendly('verification'));

            // Log final tracking info
            this.logTrackingInfo(requestId, result);

            // Emit completion
            this.emitProgress('completed', 'Hoàn thành xử lý!', { 
                processingTime: result.processingTime,
                questionType: classification.category 
            });

            return result;

        } catch (error) {
            logger.error(`[${requestId}] Critical error:`, error);
            const fallback = this.answer.generateEmergencyFallback(question, requestId);
            return this.enhanceResultWithStandardData(fallback, null, startTime);
        } finally {
            const totalTime = (Date.now() - startTime) / 1000;
            logger.info(`[${requestId}] Completed in ${totalTime}s`);
        }
    }

    // ===== NEW: CYPHER VALIDATION SUMMARY =====
    summarizeValidationInfo(validationInfo, validationSummary = null) {
        const summary = {
            enabled: this.config.enableCypherValidation,
            mode: this.config.cypherValidationMode,
            mainQueryValidated: false,
            totalCorrections: 0,
            totalOptimizations: 0,
            totalRetries: 0,
            validationTime: 0
        };

        // Main query validation info
        if (validationInfo) {
            summary.mainQueryValidated = true;
            summary.totalCorrections += validationInfo.wasCorrected ? 1 : 0;
            summary.totalOptimizations += validationInfo.wasOptimized ? 1 : 0;
            summary.totalRetries += (validationInfo.syntaxRetries || 0) + (validationInfo.contextRetries || 0);
            summary.validationTime = validationInfo.validationTime || 0;
        }

        // Agent validation summary (for complex queries)
        if (validationSummary) {
            summary.enrichmentQueriesValidated = validationSummary.enrichmentQueriesValidated;
            summary.totalCorrections += validationSummary.totalSyntaxCorrections;
            summary.totalOptimizations += validationSummary.totalContextOptimizations;
        }

        return summary;
    }

    // ===== ANSWER VERIFICATION =====
    async performAnswerVerification(question, answer, contextNodes, category, contextScore = 0) {
        try {
            // Smart verification decision based on question type and context score
            const verificationDecision = this.verification.shouldVerifyWithMode(question, answer, category, contextScore);
            
            if (!verificationDecision.shouldVerify) {
                return this.verification.getSkippedVerification('not_eligible');
            }

            // Use the determined mode for verification
            const verification = await this.verification.verifyAnswer(
                question, 
                answer, 
                contextNodes, 
                category, 
                { mode: verificationDecision.mode }
            );

            logger.info(`[Verification] Mode: ${verificationDecision.mode} (${verificationDecision.reason}) - Score: ${verification.score} - Result: ${verification.isCorrect ? 'CORRECT' : 'INCORRECT'}`);

            return verification;

        } catch (error) {
            logger.warn("[BotService] Verification failed:", error.message);
            return {
                isVerified: false,
                score: 0,
                isCorrect: null,
                isIncorrect: false,
                reasoning: `Verification error: ${error.message}`,
                issues: [],
                suggestions: ''
            };
        }
    }

    // ===== ASYNC VERIFICATION TRIGGER =====
    async triggerAsyncVerification(historyId, question, answer, contextNodes, category) {
        // Perform verification immediately and return result
        return await this.verification.verifyAnswerAsync(historyId, question, answer, contextNodes, category);
    }

    // ===================================================
    // ENHANCED HANDLER METHODS WITH CYPHER VALIDATION
    // ===================================================
    async handleSimpleAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Simple] Processing with enhanced RAG (validation enabled)");

        try {
            this.emitProgress('main_query', this.mapStepToUserFriendly('main_query'));
            
            const result = await this.answer.generateSimpleAnswer(question, questionEmbedding, chatHistory);

            this.emitProgress('context_score_main', this.mapStepToUserFriendly('context_score_main'));
            
            // Calculate context score
            const contextScore = this.calculateSimpleContextScore(result.contextNodes || []);

            // Enhance simple admission result with all required tracking data
            const enhancedResult = {
                ...result,
                category: 'simple_admission',
                processingMethod: result.validationInfo ? 'rag_simple' : 'rag_simple',

                // === CLASSIFICATION INFO ===
                questionType: 'simple_admission',
                classificationConfidence: classification?.confidence || 0,
                classificationReasoning: classification?.reasoning || 'Simple admission classification',

                // === ENRICHMENT INFO (None for simple) ===
                enrichmentSteps: 0,
                enrichmentDetails: JSON.stringify([]),
                enrichmentQueries: [],
                enrichmentResults: [],

                // === CONTEXT SCORING INFO ===
                contextScore: contextScore,
                contextScoreHistory: [],
                contextScoreReasons: [],

                // === AGENT INFO (None for simple) ===
                agentSteps: JSON.stringify([]),

                // === CYPHER VALIDATION INFO ===
                cypherValidated: !!result.validationInfo,
                validationInfo: result.validationInfo || null
            };

            // Calculate context score history for simple case
            if (enhancedResult.contextScore > 0) {
                enhancedResult.contextScoreHistory = [enhancedResult.contextScore];
                enhancedResult.contextScoreReasons = [`Simple RAG context with ${(result.contextNodes || []).length} nodes`];
            }

            return enhancedResult;

        } catch (error) {
            logger.error("[Simple] Enhanced RAG failed:", error);
            const fallback = this.answer.generateEmergencyFallback(question);
            return this.enhanceResultWithStandardData(fallback, classification);
        }
    }

    async handleComplexAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Processing with Agent intelligence (validation enabled)");

        try {
            this.emitProgress('analysis', this.mapStepToUserFriendly('analysis'));
            
            // Agent service already returns all the enhanced tracking data including validation
            const result = await this.agent.processComplexAdmission(question, questionEmbedding, chatHistory, classification);

            // Ensure all required fields are present and properly formatted
            const enhancedResult = {
                ...result,

                // === ENSURE CLASSIFICATION INFO ===
                questionType: result.questionType || 'complex_admission',
                classificationConfidence: result.classificationConfidence || classification?.confidence || 0,
                classificationReasoning: result.classificationReasoning || classification?.reasoning || 'Complex admission classification',

                // === ENSURE ENRICHMENT INFO ===
                enrichmentSteps: result.enrichmentSteps || 0,
                enrichmentDetails: result.enrichmentDetails || JSON.stringify([]),
                enrichmentQueries: result.enrichmentQueries || [],
                enrichmentResults: result.enrichmentResults || [],

                // === ENSURE CONTEXT SCORING INFO ===
                contextScore: result.contextScore || 0,
                contextScoreHistory: result.contextScoreHistory || [],
                contextScoreReasons: result.contextScoreReasons || [],

                // === ENSURE AGENT INFO ===
                agentSteps: Array.isArray(result.agentSteps) ? JSON.stringify(result.agentSteps) : (result.agentSteps || ''),

                // === ENSURE CYPHER VALIDATION INFO ===
                cypherValidated: !!result.validationSummary,
                validationSummary: result.validationSummary || null,

                // === UPDATE PROCESSING METHOD ===
                processingMethod: result.validationSummary ? 'agent_complex' : 'agent_complex'
            };

            return enhancedResult;

        } catch (error) {
            logger.error("[Complex] Agent processing failed, fallback to simple", error);
            return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
        }
    }

    // ===================================================
    // UTILITY METHODS FOR DATA ENHANCEMENT
    // ===================================================
    enhanceResultWithStandardData(result, classification, startTime) {
        const processingTime = startTime ? (Date.now() - startTime) / 1000 : result.processingTime || 0;

        return {
            ...result,

            // === CLASSIFICATION INFO ===
            questionType: result.questionType || classification?.category || 'unknown',
            classificationConfidence: result.classificationConfidence || classification?.confidence || 0,
            classificationReasoning: result.classificationReasoning || classification?.reasoning || 'Standard processing',

            // === ENRICHMENT INFO (Default for non-agent processing) ===
            enrichmentSteps: result.enrichmentSteps || 0,
            enrichmentDetails: result.enrichmentDetails || JSON.stringify([]),
            enrichmentQueries: result.enrichmentQueries || [],
            enrichmentResults: result.enrichmentResults || [],

            // === CONTEXT SCORING INFO ===
            contextScore: result.contextScore || this.calculateSimpleContextScore(result.contextNodes || []),
            contextScoreHistory: result.contextScoreHistory || [],
            contextScoreReasons: result.contextScoreReasons || [],

            // === AGENT INFO ===
            agentSteps: Array.isArray(result.agentSteps) ? JSON.stringify(result.agentSteps) : (result.agentSteps || ''),
            processingMethod: result.processingMethod || 'rag_simple',
            processingTime,

            // === CYPHER VALIDATION INFO ===
            cypherValidated: result.cypherValidated || false,
            validationInfo: result.validationInfo || null,

            // === VERIFICATION INFO ===
            verificationInfo: result.verificationInfo || {
                isVerified: false,
                score: 0,
                reason: ''
            }
        };
    }

    calculateSimpleContextScore(contextNodes) {
        if (!contextNodes || contextNodes.length === 0) return 0;

        // Simple scoring logic based on context availability
        if (contextNodes.length >= 10) return 0.8;
        if (contextNodes.length >= 5) return 0.6;
        if (contextNodes.length >= 2) return 0.4;
        return 0.2;
    }

    logTrackingInfo(requestId, result) {
        const trackingInfo = {
            requestId,
            questionType: result.questionType,
            processingMethod: result.processingMethod,
            enrichmentSteps: result.enrichmentSteps,
            contextScore: result.contextScore,
            processingTime: result.processingTime,
            classificationConfidence: result.classificationConfidence,
            cypherValidated: result.cypherValidated
        };

        logger.info(`[${requestId}] Tracking Info:`, trackingInfo);

        // Log cypher validation details
        if (result.cypherValidationSummary) {
            const vSummary = result.cypherValidationSummary;
            logger.info(`[${requestId}] Validation: corrections=${vSummary.totalCorrections}, optimizations=${vSummary.totalOptimizations}, retries=${vSummary.totalRetries}`);
        }

        // Log detailed agent steps for complex processing
        if (result.agentSteps) {
            let agentStepsArray = [];
            try {
                agentStepsArray = typeof result.agentSteps === 'string' ? JSON.parse(result.agentSteps) : result.agentSteps;
            } catch (e) {
                agentStepsArray = [];
            }
            if (agentStepsArray.length > 0) {
                logger.info(`[${requestId}] Agent Steps: ${agentStepsArray.length} total steps`);
            }
        }

        // Log enrichment details
        if (result.enrichmentSteps > 0) {
            logger.info(`[${requestId}] Enrichment: ${result.enrichmentSteps} steps, final score: ${result.contextScore}`);
        }
    }

    // ===== NEW: CYPHER VALIDATION MANAGEMENT =====
    enableCypherValidation() {
        this.config.enableCypherValidation = true;
        logger.info("[BotService] Cypher validation enabled");
    }

    disableCypherValidation() {
        this.config.enableCypherValidation = false;
        logger.info("[BotService] Cypher validation disabled");
    }

    setCypherValidationMode(mode) {
        if (['auto', 'always', 'never'].includes(mode)) {
            this.config.cypherValidationMode = mode;
            logger.info(`[BotService] Cypher validation mode set to: ${mode}`);
        } else {
            logger.warn(`[BotService] Invalid validation mode: ${mode}. Valid modes: auto, always, never`);
        }
    }

    getCypherValidationStats() {
        return {
            enabled: this.config.enableCypherValidation,
            mode: this.config.cypherValidationMode,
            serviceStats: this.cypher.getValidationStats()
        };
    }

    // ===== VERIFICATION UTILITIES =====
    async getVerificationStats(timeRange = '7d') {
        return await this.verification.getVerificationStats(timeRange);
    }

    async verifyHistoryBatch(historyIds, options = {}) {
        return await this.verification.verifyHistoryBatch(historyIds, options);
    }

    // Add verification service getter
    getVerificationService() { 
        return this.verification; 
    }

    // ===================================================
    // LEGACY METHODS WITH VALIDATION TOGGLE
    // ===================================================

    // Enhanced legacy method with validation support
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = [], useValidation = null) {
        // Use validation based on parameter or global config
        const shouldUseValidation = useValidation !== null ? useValidation : this.config.enableCypherValidation;

        if (shouldUseValidation) {
            // Use new validation-enabled method
            const result = await this.answer.generateSimpleAnswer(question, questionEmbedding, chatHistory);
            return this.enhanceResultWithStandardData(result, null);
        } else {
            // Use legacy method without validation
            const result = await this.answer.generateSimpleAnswerLegacy(question, questionEmbedding, chatHistory);
            return this.enhanceResultWithStandardData(result, null);
        }
    }

    async generateCypher(question, questionEmbedding, chatHistory = []) {
        return await this.cypher.generateCypher(question, questionEmbedding, chatHistory);
    }

    // NEW: Generate and execute Cypher with validation
    async generateAndExecuteCypher(question, questionEmbedding, chatHistory = []) {
        return await this.cypher.generateAndExecuteCypher(question, questionEmbedding, chatHistory);
    }

    async getContextFromCypher(cypher, params = {}, options = {}) {
        return await this.cypher.executeQuery(cypher, params, options);
    }

    async classifyQuestion(question, chatHistory = []) {
        return await this.classification.classify(question, chatHistory);
    }

    // ===================================================
    // DATA VERSIONING - For Cache Invalidation
    // ===================================================
    async updateDataVersion() {
        try {
            // Update cache data version
            await this.cache.updateDataVersion();

            // Clear service-level caches if any
            logger.info('[BotService] Data version updated, caches cleared');
        } catch (error) {
            logger.error('[BotService] Failed to update data version:', error);
        }
    }

    // ===================================================
    // HEALTH & MONITORING
    // ===================================================
    async healthCheck() {
        const baseHealth = await this.monitoring.healthCheck();
        
        // Add validation service health
        const validationHealth = {
            enabled: this.config.enableCypherValidation,
            mode: this.config.cypherValidationMode,
            stats: this.cypher.getValidationStats()
        };

        return {
            ...baseHealth,
            cypherValidation: validationHealth
        };
    }

    getStats() {
        const baseStats = this.monitoring.getPerformanceStats();
        
        // Add validation stats
        return {
            ...baseStats,
            cypherValidation: this.getCypherValidationStats()
        };
    }

    getCacheStats() {
        return this.cache.getStats();
    }

    // ===================================================
    // UTILITY METHODS
    // ===================================================
    resetPerformanceStats() {
        // Reset Gemini stats
        this.gemini.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            responseTimeSum: 0,
            lastResetTime: Date.now()
        };

        logger.info('[BotService] Performance stats reset');
    }

    // ===================================================
    // GRACEFUL SHUTDOWN
    // ===================================================
    async shutdown() {
        logger.info("[BotService] Shutting down...");
        
        try {
            // Clear caches
            await this.cache.clearAllCaches();
            
            // Close database connections
            await this.gemini.shutdown();
            
            logger.info("[BotService] Shutdown completed");
        } catch (error) {
            logger.error("[BotService] Shutdown error:", error);
        }
    }

    // ===================================================
    // SERVICE GETTERS FOR EXTERNAL ACCESS
    // ===================================================
    getGeminiService() { return this.gemini; }
    getCacheService() { return this.cache; }
    getPromptService() { return this.prompts; }
    getClassificationService() { return this.classification; }
    getCypherService() { return this.cypher; }
    getCypherValidationService() { return this.cypher.getValidationService(); }
    getAgentService() { return this.agent; }
    getAnswerService() { return this.answer; }
    getMonitoringService() { return this.monitoring; }
}

module.exports = new BotService();