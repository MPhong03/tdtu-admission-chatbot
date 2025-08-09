const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");
const CypherValidationService = require("./cyphervalidation.service");

class CypherService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 2;
        this.validation = new CypherValidationService(geminiService, promptService, cacheService);
    }

    // ===== NEW: MAIN METHOD WITH VALIDATION =====
    async generateAndExecuteCypher(question, questionEmbedding, chatHistory = []) {
        const startTime = Date.now();

        try {
            // Step 1: Generate initial Cypher
            const cypherResult = await this.generateCypher(question, questionEmbedding, chatHistory);

            if (!cypherResult || !cypherResult.cypher) {
                logger.warn("[Cypher] No Cypher generated");
                return {
                    cypher: "",
                    contextNodes: [],
                    labels: [],
                    is_social: false,
                    processingTime: (Date.now() - startTime) / 1000,
                    wasValidated: false
                };
            }

            // Step 2: If social response, return immediately
            if (cypherResult.is_social) {
                return {
                    cypher: "",
                    contextNodes: [],
                    labels: cypherResult.labels || [],
                    is_social: true,
                    processingTime: (Date.now() - startTime) / 1000,
                    wasValidated: false
                };
            }

            // Step 3: Validate and execute with LLM assistance
            const validationResult = await this.validation.validateAndExecuteCypher(
                question,
                cypherResult.cypher,
                questionEmbedding,
                chatHistory
            );

            const processingTime = (Date.now() - startTime) / 1000;

            logger.info(`[Cypher] Enhanced execution completed: ${validationResult.contextNodes.length} nodes (${processingTime}s)`);

            return {
                cypher: validationResult.cypher,
                contextNodes: validationResult.contextNodes,
                labels: cypherResult.labels || [],
                is_social: false,
                processingTime,
                wasValidated: true,
                validationInfo: {
                    wasOptimized: validationResult.wasOptimized,
                    wasCorrected: validationResult.wasCorrected,
                    syntaxRetries: validationResult.syntaxRetries || 0,
                    contextRetries: validationResult.contextRetries || 0,
                    validationTime: validationResult.validationTime,
                    validationId: validationResult.validationId
                }
            };

        } catch (error) {
            logger.error("[Cypher] Generate and execute failed:", error);
            return {
                cypher: "",
                contextNodes: [],
                labels: [],
                is_social: false,
                processingTime: (Date.now() - startTime) / 1000,
                wasValidated: false,
                error: error.message
            };
        }
    }

    async generateCypher(question, questionEmbedding, chatHistory = []) {
        const prompt = this.prompts.buildPrompt('cypher', {
            user_question: question,
            chat_history: JSON.stringify(chatHistory.slice(-2)),
        });

        let retries = 0;
        let lastError = null;

        while (retries < this.maxRetries) {
            try {
                const cacheKey = this.cache.generateCacheKey(prompt, 'cypher');
                let result = await this.cache.get(cacheKey);

                if (!result) {
                    result = await this.gemini.queueRequest(prompt, 'high');
                    if (result) {
                        await this.cache.set(cacheKey, result);
                    }
                }

                // Validate result
                if (this.isValidCypherResult(result)) {
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

    isValidCypherResult(result) {
        if (!result || typeof result !== "object") return false;

        // Check basic structure
        if (!Array.isArray(result.labels) || typeof result.cypher !== "string" || typeof result.is_social !== "boolean") {
            // Handle legacy format without is_social
            if (Array.isArray(result.labels) && typeof result.cypher === "string" && result.is_social === undefined) {
                result.is_social = false;
                return true;
            }
            return false;
        }

        return true;
    }

    async executeQuery(cypher, params = {}, options = {}) {
        try {
            return await neo4jRepository.execute(cypher, params, { raw: false, ...options });
        } catch (err) {
            logger.error("Database query error:", err);
            return [];
        }
    }

    // ===== NEW: VALIDATION SERVICE GETTERS =====
    getValidationService() {
        return this.validation;
    }

    getValidationStats() {
        return this.validation.getValidationStats();
    }
}

module.exports = CypherService;