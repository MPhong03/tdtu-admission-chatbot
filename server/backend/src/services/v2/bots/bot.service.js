const logger = require("../../../utils/logger.util");
const GeminiService = require("./gemini.service");
const PromptService = require("./prompt.service");
const ClassificationService = require("./classification.service");
const CypherService = require("./cypher.service");
const AgentService = require("./agent.service");
const AnswerService = require("./answer.service");
const MonitoringService = require("./monitoring.service");
const CacheService = require("../cachings/cache.service");

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

        // Service configuration
        this.config = {
            maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
            confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7,
            enableClassification: process.env.ENABLE_CLASSIFICATION !== 'false'
        };

        // Initialize
        this.initialize();
    }

    async initialize() {
        try {
            // Load Gemini configuration
            await this.gemini.loadConfig();
            logger.info("[BotService] Successfully initialized all services");
        } catch (error) {
            logger.error("[BotService] Initialization failed:", error);
        }
    }

    // ===================================================
    // MAIN GENERATE ANSWER METHOD - Simplified Orchestration
    // ===================================================
    async generateAnswer(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substr(2, 9);

        logger.info(`[${requestId}] Processing: "${question.substring(0, 80)}..."`);

        try {
            // Phase 1: Classification
            const classification = await this.classification.classify(question, chatHistory);
            logger.info(`[${requestId}] Classification: ${classification.category} (${classification.confidence})`);

            let result;

            // Phase 2: Route to appropriate handler
            switch (classification.category) {
                case 'inappropriate':
                    result = this.answer.generateInappropriateResponse(question, classification);
                    break;

                case 'off_topic':
                    result = await this.answer.generateOffTopicResponse(question, classification, chatHistory);
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

            // Add metadata
            result.requestId = requestId;
            result.classification = classification;
            result.processingTime = (Date.now() - startTime) / 1000;

            return result;

        } catch (error) {
            logger.error(`[${requestId}] Critical error:`, error);
            return this.answer.generateEmergencyFallback(question, requestId);
        } finally {
            const totalTime = (Date.now() - startTime) / 1000;
            logger.info(`[${requestId}] Completed in ${totalTime}s`);
        }
    }

    // ===================================================
    // SIMPLIFIED HANDLER METHODS
    // ===================================================
    async handleSimpleAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Simple] Processing with traditional RAG");

        try {
            const result = await this.answer.generateSimpleAnswer(question, questionEmbedding, chatHistory);
            result.category = 'simple_admission';
            result.processingMethod = 'rag_simple';
            return result;
        } catch (error) {
            logger.error("[Simple] Traditional RAG failed:", error);
            return this.answer.generateEmergencyFallback(question);
        }
    }

    async handleComplexAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Processing with Agent intelligence");

        try {
            return await this.agent.processComplexAdmission(question, questionEmbedding, chatHistory, classification);
        } catch (error) {
            logger.error("[Complex] Agent processing failed, fallback to simple", error);
            return await this.handleSimpleAdmission(question, questionEmbedding, chatHistory, classification);
        }
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
        return await this.monitoring.healthCheck();
    }

    getStats() {
        return this.monitoring.getPerformanceStats();
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
        logger.info('[BotService] Starting graceful shutdown...');

        const shutdownPromises = [];

        // Wait for active Gemini requests
        const maxWaitTime = 30000;
        const startTime = Date.now();

        while (this.gemini.activeRequests > 0 && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Shutdown cache
        if (this.cache && typeof this.cache.disconnect === 'function') {
            shutdownPromises.push(this.cache.disconnect());
        }

        await Promise.allSettled(shutdownPromises);
        logger.info('[BotService] Graceful shutdown completed');
    }

    // ===================================================
    // LEGACY COMPATIBILITY METHODS
    // ===================================================
    
    // Keep for backward compatibility
    async generateAnswerTraditional(question, questionEmbedding, chatHistory = []) {
        return await this.answer.generateSimpleAnswer(question, questionEmbedding, chatHistory);
    }

    async generateCypher(question, questionEmbedding) {
        return await this.cypher.generateCypher(question, questionEmbedding);
    }

    async getContextFromCypher(cypher, params = {}, options = {}) {
        return await this.cypher.executeQuery(cypher, params, options);
    }

    async classifyQuestion(question, chatHistory = []) {
        return await this.classification.classify(question, chatHistory);
    }

    // Service getters for external access
    getGeminiService() { return this.gemini; }
    getCacheService() { return this.cache; }
    getPromptService() { return this.prompts; }
    getClassificationService() { return this.classification; }
    getCypherService() { return this.cypher; }
    getAgentService() { return this.agent; }
    getAnswerService() { return this.answer; }
    getMonitoringService() { return this.monitoring; }
}

module.exports = new BotService();