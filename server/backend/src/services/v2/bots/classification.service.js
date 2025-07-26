const logger = require("../../../utils/logger.util");

class ClassificationService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        
        this.config = {
            enabled: process.env.ENABLE_CLASSIFICATION !== 'false',
            confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7
        };
    }

    async classify(question, chatHistory = []) {
        if (!this.config.enabled) {
            return {
                category: 'simple_admission',
                confidence: 0.8,
                reasoning: 'Classification disabled, default to simple admission',
                processingMethod: 'rag_simple'
            };
        }

        try {
            const prompt = this.prompts.buildPrompt('classification', {
                user_question: question,
                chat_history: JSON.stringify(chatHistory.slice(-2))
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'classification');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt, 'high');
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            // Validate result
            if (this.isValidClassification(result)) {
                logger.info(`[Classification] ${result.category} (confidence: ${result.confidence})`);
                return result;
            }

            // Fallback
            logger.warn("[Classification] Invalid result, using safe fallback");
            return this.getSafeFallback();

        } catch (error) {
            logger.error("[Classification] Failed, using safe fallback", error);
            return this.getSafeFallback();
        }
    }

    isValidClassification(result) {
        if (!result || typeof result !== 'object') return false;

        const validCategories = ['inappropriate', 'off_topic', 'simple_admission', 'complex_admission'];
        return validCategories.includes(result.category) &&
               typeof result.confidence === 'number' &&
               result.confidence >= 0 && result.confidence <= 1 &&
               typeof result.reasoning === 'string' &&
               result.reasoning.length > 10;
    }

    getSafeFallback() {
        return {
            category: 'simple_admission',
            confidence: 0.5,
            reasoning: 'Fallback classification due to parsing error',
            processingMethod: 'rag_simple'
        };
    }
}

module.exports = ClassificationService;