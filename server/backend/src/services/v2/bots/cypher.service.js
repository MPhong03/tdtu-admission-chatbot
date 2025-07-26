const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");

class CypherService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 2;
    }

    async generateCypher(question, questionEmbedding) {
        const prompt = this.prompts.buildPrompt('cypher', {
            user_question: question
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
}

module.exports = CypherService;