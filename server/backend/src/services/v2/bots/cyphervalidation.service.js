const logger = require("../../../utils/logger.util");
const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");

class CypherValidationService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        
        this.config = {
            enabled: process.env.ENABLE_CYPHER_VALIDATION !== 'false',
            maxSyntaxRetries: parseInt(process.env.MAX_SYNTAX_RETRIES) || 5,
            maxContextRetries: parseInt(process.env.MAX_CONTEXT_RETRIES) || 2,
            minContextThreshold: parseInt(process.env.MIN_CONTEXT_THRESHOLD) || 2,
            validationDelay: parseInt(process.env.VALIDATION_DELAY) || 300, // ms delay between retries
            enableContextOptimization: process.env.ENABLE_CONTEXT_OPTIMIZATION !== 'false'
        };
    }

    // ===== MAIN VALIDATION METHOD =====
    async validateAndExecuteCypher(question, initialCypher, questionEmbedding, chatHistory = []) {
        if (!this.config.enabled) {
            return await this.executeDirectly(initialCypher);
        }

        const startTime = Date.now();
        const validationId = Math.random().toString(36).substr(2, 9);
        
        logger.info(`[${validationId}] Starting Cypher validation: "${initialCypher.substring(0, 100)}..."`);

        try {
            // Phase 1: Syntax validation and correction
            const syntaxValidated = await this.validateSyntax(initialCypher, question, validationId);
            
            // Phase 2: Context optimization (if enabled)
            const finalResult = this.config.enableContextOptimization 
                ? await this.optimizeForContext(syntaxValidated, question, questionEmbedding, chatHistory, validationId)
                : syntaxValidated;

            const totalTime = (Date.now() - startTime) / 1000;
            logger.info(`[${validationId}] Validation completed in ${totalTime}s - Final context: ${finalResult.contextNodes.length} nodes`);

            return {
                ...finalResult,
                validationId,
                validationTime: totalTime,
                wasOptimized: finalResult.wasOptimized || syntaxValidated.wasCorrected || false
            };

        } catch (error) {
            logger.error(`[${validationId}] Validation failed:`, error);
            // Fallback to direct execution
            const fallbackResult = await this.executeDirectly(initialCypher);
            return {
                ...fallbackResult,
                validationId,
                validationTime: (Date.now() - startTime) / 1000,
                wasOptimized: false,
                validationError: error.message
            };
        }
    }

    // ===== PHASE 1: SYNTAX VALIDATION =====
    async validateSyntax(cypher, question, validationId) {
        let currentCypher = cypher;
        let syntaxRetries = 0;
        let lastError = null;
        let contextNodes = [];

        logger.info(`[${validationId}] Phase 1: Syntax validation`);

        while (syntaxRetries < this.config.maxSyntaxRetries) {
            try {
                // Attempt to execute Cypher
                contextNodes = await neo4jRepository.execute(currentCypher, {}, { raw: false });
                
                logger.info(`[${validationId}] Syntax OK - Got ${contextNodes.length} nodes (attempt ${syntaxRetries + 1})`);
                
                return {
                    cypher: currentCypher,
                    contextNodes,
                    wasCorrected: syntaxRetries > 0,
                    syntaxRetries,
                    isValid: true
                };

            } catch (error) {
                lastError = error;
                syntaxRetries++;
                
                logger.warn(`[${validationId}] Syntax error (attempt ${syntaxRetries}/${this.config.maxSyntaxRetries}): ${error.message}`);

                if (syntaxRetries < this.config.maxSyntaxRetries) {
                    // Add delay to avoid overwhelming Gemini
                    await this.delay(this.config.validationDelay);
                    
                    // Ask LLM to fix syntax error
                    const correctedCypher = await this.requestSyntaxCorrection(currentCypher, error.message, question, validationId);
                    
                    if (correctedCypher && correctedCypher !== currentCypher) {
                        currentCypher = correctedCypher;
                        logger.info(`[${validationId}] Trying corrected Cypher: "${currentCypher.substring(0, 100)}..."`);
                    } else {
                        logger.warn(`[${validationId}] LLM couldn't correct syntax, keeping original`);
                        break;
                    }
                }
            }
        }

        // After max retries, return with empty context but valid structure
        logger.warn(`[${validationId}] Max syntax retries reached, returning with empty context`);
        return {
            cypher: currentCypher,
            contextNodes: [],
            wasCorrected: false,
            syntaxRetries,
            isValid: false,
            syntaxError: lastError?.message
        };
    }

    // ===== PHASE 2: CONTEXT OPTIMIZATION =====
    async optimizeForContext(syntaxResult, question, questionEmbedding, chatHistory, validationId) {
        // Skip optimization if syntax validation failed
        if (!syntaxResult.isValid) {
            return syntaxResult;
        }

        // Skip if we already have sufficient context
        if (syntaxResult.contextNodes.length >= this.config.minContextThreshold) {
            logger.info(`[${validationId}] Phase 2: Sufficient context (${syntaxResult.contextNodes.length}), skipping optimization`);
            return syntaxResult;
        }

        logger.info(`[${validationId}] Phase 2: Context optimization - current: ${syntaxResult.contextNodes.length} nodes`);

        let currentCypher = syntaxResult.cypher;
        let bestContextNodes = syntaxResult.contextNodes;
        let bestCypher = currentCypher;
        let contextRetries = 0;

        while (contextRetries < this.config.maxContextRetries) {
            contextRetries++;
            
            // Add delay between optimization attempts
            await this.delay(this.config.validationDelay);
            
            logger.info(`[${validationId}] Context optimization attempt ${contextRetries}/${this.config.maxContextRetries}`);

            try {
                // Ask LLM to optimize Cypher for better context
                const optimizedCypher = await this.requestContextOptimization(
                    currentCypher, 
                    question, 
                    bestContextNodes.length, 
                    contextRetries,
                    validationId
                );

                if (optimizedCypher && optimizedCypher !== currentCypher) {
                    logger.info(`[${validationId}] Trying optimized Cypher: "${optimizedCypher.substring(0, 100)}..."`);
                    
                    // Test optimized Cypher
                    const optimizedContext = await neo4jRepository.execute(optimizedCypher, {}, { raw: false });
                    
                    logger.info(`[${validationId}] Optimization result: ${optimizedContext.length} nodes`);

                    // Keep the best result (most context)
                    if (optimizedContext.length > bestContextNodes.length) {
                        bestContextNodes = optimizedContext;
                        bestCypher = optimizedCypher;
                        logger.info(`[${validationId}] New best context: ${optimizedContext.length} nodes`);
                        
                        // If we have enough context now, stop optimization
                        if (optimizedContext.length >= this.config.minContextThreshold) {
                            break;
                        }
                    }
                    
                    currentCypher = optimizedCypher;
                } else {
                    logger.info(`[${validationId}] No optimization suggested, stopping`);
                    break;
                }

            } catch (error) {
                logger.warn(`[${validationId}] Optimization attempt ${contextRetries} failed:`, error.message);
                // Continue with next attempt or current best
            }
        }

        const wasOptimized = bestCypher !== syntaxResult.cypher || contextRetries > 0;
        
        logger.info(`[${validationId}] Phase 2 complete - Final: ${bestContextNodes.length} nodes, optimized: ${wasOptimized}`);

        return {
            ...syntaxResult,
            cypher: bestCypher,
            contextNodes: bestContextNodes,
            wasOptimized,
            contextRetries
        };
    }

    // ===== LLM CORRECTION METHODS =====
    async requestSyntaxCorrection(cypher, errorMessage, question, validationId) {
        try {
            const prompt = this.buildSyntaxCorrectionPrompt(cypher, errorMessage, question);
            
            const cacheKey = this.cache.generateCacheKey(prompt, 'cypher_syntax_fix');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt, 'high');
                if (result) {
                    await this.cache.set(cacheKey, result, 3600); // Cache for 1 hour
                }
            }

            return this.extractCypherFromResult(result, validationId);

        } catch (error) {
            logger.error(`[${validationId}] Syntax correction request failed:`, error);
            return null;
        }
    }

    async requestContextOptimization(cypher, question, currentContextCount, attemptNumber, validationId) {
        try {
            const prompt = this.buildContextOptimizationPrompt(cypher, question, currentContextCount, attemptNumber);
            
            const cacheKey = this.cache.generateCacheKey(prompt, 'cypher_context_optimize');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt, 'normal');
                if (result) {
                    await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
                }
            }

            return this.extractCypherFromResult(result, validationId);

        } catch (error) {
            logger.error(`[${validationId}] Context optimization request failed:`, error);
            return null;
        }
    }

    // ===== PROMPT BUILDERS =====
    buildSyntaxCorrectionPrompt(cypher, errorMessage, question) {
        return `${this.prompts.getTemplate('nodeEdgeDescription')}

BẠN LÀ CHUYÊN GIA SỬA LỖI CÚ PHÁP CYPHER CHO HỆ THỐNG TUYỂN SINH.

=== NHIỆM VỤ ===
Sửa lỗi cú pháp trong câu lệnh Cypher dưới đây.

=== THÔNG TIN ===
Câu hỏi gốc: "${question}"
Cypher có lỗi: 
\`\`\`cypher
${cypher}
\`\`\`

Lỗi từ Neo4j: "${errorMessage}"

=== YÊU CẦU ===
1. Phân tích lỗi cú pháp cụ thể
2. Sửa đúng cú pháp Cypher
3. Giữ nguyên logic truy vấn gốc
4. Đảm bảo tương thích với schema Neo4j

=== QUY TẮC ===
- CHƯA ĐƯỢC thay đổi logic truy vấn
- CHỈ sửa cú pháp và tên thuộc tính
- Sử dụng đúng tên node/relationship từ schema
- Trả về CHÍNH XÁC câu Cypher đã sửa

Trả về JSON:
{
    "corrected_cypher": "MATCH (n:Document) RETURN n LIMIT 10",
    "changes_made": "Sửa tên thuộc tính từ 'title' thành 'name'",
    "confidence": 0.9
}`;
    }

    buildContextOptimizationPrompt(cypher, question, currentContextCount, attemptNumber) {
        return `${this.prompts.getTemplate('nodeEdgeDescription')}

BẠN LÀ CHUYÊN GIA TỐI ƯU HÓA CYPHER CHO HỆ THỐNG TUYỂN SINH.

=== NHIỆM VỤ ===
Tối ưu hóa câu lệnh Cypher để tìm được NHIỀU THÔNG TIN HƠN cho câu hỏi tuyển sinh.

=== THÔNG TIN ===
Câu hỏi: "${question}"
Cypher hiện tại:
\`\`\`cypher
${cypher}
\`\`\`

Kết quả hiện tại: ${currentContextCount} nodes
Lần tối ưu: ${attemptNumber}/2

=== CHIẾN LƯỢC TỐI ƯU HÓA ===
${attemptNumber === 1 ? `
**Lần 1: MỞ RỘNG PHẠM VI**
- Giảm điều kiện lọc quá strict
- Thêm OPTIONAL MATCH cho thông tin liên quan  
- Mở rộng quan hệ (depth 2-3)
- Tìm thêm các node liên quan (Major, Program, Document)
` : `
**Lần 2: THAY ĐỔI CÁCH TIẾP CẬN**
- Đổi strategy hoàn toàn (từ exact match sang fuzzy)
- Tìm theo category/type thay vì tên cụ thể
- Sử dụng text search thay vì property match
- Mở rộng sang các entity type khác
`}

=== YÊU CẦU ===
- Tìm được NHIỀU HƠN ${currentContextCount} nodes
- Vẫn LIÊN QUAN đến câu hỏi tuyển sinh
- Ưu tiên Document, Major, Program có thông tin hữu ích
- Không làm câu lệnh quá phức tạp

=== QUY TẮC ===
- TRẢ VỀ CYPHER MỚI nếu có ý tưởng tối ưu
- TRẢ VỀ null nếu không có cách cải thiện
- GIẢI THÍCH rõ lý do thay đổi

Trả về JSON:
{
    "optimized_cypher": "MATCH (n:Document)-[:RELATES_TO]->(m) WHERE ... RETURN n,m LIMIT 20",
    "optimization_reason": "Mở rộng sang node liên quan và tăng LIMIT",
    "expected_improvement": "Từ 2 lên 10-15 nodes",
    "confidence": 0.8
}

Hoặc nếu không cải thiện được:
{
    "optimized_cypher": null,
    "reason": "Cypher đã tối ưu, không thể cải thiện thêm"
}`;
    }

    // ===== UTILITY METHODS =====
    extractCypherFromResult(result, validationId) {
        try {
            if (!result) return null;

            let parsed;
            if (typeof result === 'string') {
                // Try to extract from JSON block first
                const jsonMatch = result.match(/```json\s*([\s\S]*?)```/i);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1]);
                } else {
                    parsed = JSON.parse(result);
                }
            } else {
                parsed = result;
            }

            // Extract the actual Cypher query
            const cypher = parsed.corrected_cypher || parsed.optimized_cypher;
            
            if (cypher && typeof cypher === 'string' && cypher.trim().length > 10) {
                return cypher.trim();
            }

            return null;

        } catch (error) {
            logger.warn(`[${validationId}] Failed to extract Cypher from LLM result:`, error.message);
            return null;
        }
    }

    async executeDirectly(cypher) {
        try {
            const contextNodes = await neo4jRepository.execute(cypher, {}, { raw: false });
            return {
                cypher,
                contextNodes,
                wasCorrected: false,
                wasOptimized: false,
                isValid: true
            };
        } catch (error) {
            logger.error("[CypherValidation] Direct execution failed:", error);
            return {
                cypher,
                contextNodes: [],
                wasCorrected: false,
                wasOptimized: false,
                isValid: false,
                executionError: error.message
            };
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== ANALYTICS & MONITORING =====
    getValidationStats() {
        // This could be expanded to track validation success rates, common errors, etc.
        return {
            enabled: this.config.enabled,
            maxSyntaxRetries: this.config.maxSyntaxRetries,
            maxContextRetries: this.config.maxContextRetries,
            minContextThreshold: this.config.minContextThreshold
        };
    }
}

module.exports = CypherValidationService;