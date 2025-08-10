const { all } = require("axios");
const logger = require("../../../utils/logger.util");

class AgentService {
    constructor(geminiService, promptService, cacheService, cypherService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        this.cypher = cypherService;

        this.config = {
            maxEnrichmentQueries: parseInt(process.env.MAX_ENRICHMENT_QUERIES) || 3,
            minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD) || 0.75,
            maxContextSize: parseInt(process.env.MAX_CONTEXT_SIZE) || 50,
            enableSmartSkipping: true,
            useValidationForEnrichment: process.env.USE_VALIDATION_FOR_ENRICHMENT !== 'false'
        };
    }

    async analyzeComplexQuestion(question, chatHistory, classification) {
        try {
            const inferredEntities = this.extractEntityFromChatHistory(chatHistory);
            if (inferredEntities) {
                classification.entities = {
                    ...classification.entities,
                    majors: classification.entities.majors?.length > 0 ? classification.entities.majors : inferredEntities.majors,
                    programmes: classification.entities.programmes?.length > 0 ? classification.entities.programmes : inferredEntities.programmes
                };
            }

            const prompt = this.prompts.buildPrompt('analysis', {
                user_question: question,
                classification_info: JSON.stringify(classification),
                chat_history: JSON.stringify(chatHistory.slice(-1))
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'analysis');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt, 'high');
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            return result || this.getFallbackAnalysis();

        } catch (error) {
            logger.error("[Agent] Complex question analysis failed", error);
            return this.getFallbackAnalysis();
        }
    }

    getFallbackAnalysis() {
        return {
            entities: { majors: [], programmes: [], year: "2024", infoTypes: ["general"] },
            intent: { primary: "search", secondary: [], action: "find_info" },
            strategy: { mainTargets: ["Document"], enrichmentTargets: [], needsEnrichment: false },
            reasoning: "Fallback analysis due to error"
        };
    }

    // === IMPROVED CONTEXT SCORING ===
    async scoreContext(question, contextNodes, stepName) {
        try {
            const contextScorePrompt = this.prompts.buildPrompt('contextScore', {
                user_question: question,
                context_json: JSON.stringify(contextNodes.slice(0, 10), null, 2), // Limit for performance
                context_count: contextNodes.length.toString()
            });

            const cacheKey = this.cache.generateCacheKey(contextScorePrompt, 'context_score');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(contextScorePrompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            let score = 0;
            let reasoning = 'Failed to parse scoring result';

            if (result) {
                try {
                    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                    score = Math.max(0, Math.min(1, parseFloat(parsed.score) || 0));
                    reasoning = parsed.reasoning || 'No reasoning provided';
                } catch (e) {
                    logger.warn(`[Agent] Failed to parse context score for ${stepName}:`, e.message);
                    score = contextNodes.length > 0 ? 0.3 : 0; // Basic fallback
                    reasoning = `Parsing error: ${e.message}`;
                }
            }

            logger.info(`[Agent] Context score for ${stepName}: ${score.toFixed(3)} - ${reasoning}`);

            return {
                score,
                reasoning,
                contextSize: contextNodes.length,
                stepName
            };

        } catch (error) {
            logger.error(`[Agent] Context scoring failed for ${stepName}:`, error);
            return {
                score: contextNodes.length > 0 ? 0.2 : 0,
                reasoning: `Scoring failed: ${error.message}`,
                contextSize: contextNodes.length,
                stepName
            };
        }
    }

    // === ENHANCED ENRICHMENT PLANNING ===
    async planEnrichmentQuery(question, mainContext, analysis, stepNumber) {
        if (stepNumber > this.config.maxEnrichmentQueries) {
            logger.info(`[Agent] Max enrichment steps (${this.config.maxEnrichmentQueries}) reached`);
            return null;
        }

        // Skip if we already have too much context
        if (mainContext.length >= this.config.maxContextSize) {
            logger.info(`[Agent] Context size limit (${this.config.maxContextSize}) reached, skipping enrichment`);
            return null;
        }

        try {
            const prompt = this.prompts.buildPrompt('enrichment', {
                user_question: question,
                step: stepNumber.toString(),
                max_steps: this.config.maxEnrichmentQueries.toString(),
                context_count: mainContext.length.toString(),
                analysis_info: JSON.stringify(analysis),
                sample_context: JSON.stringify(mainContext.slice(0, 3)), // More sample context
                enrichment_targets: analysis.strategy?.enrichmentTargets?.join(', ') || 'none'
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'enrichment');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            if (result?.shouldEnrich && result?.cypher) {
                logger.info(`[Agent] Planning enrichment step ${stepNumber}: ${result.purpose || 'No purpose specified'}`);
                return result;
            }

            logger.info(`[Agent] No enrichment needed for step ${stepNumber}`);
            return null;

        } catch (error) {
            logger.warn(`[Agent] Enrichment planning step ${stepNumber} failed:`, error);
            return null;
        }
    }

    // ===== UPDATED: EXECUTE ENRICHMENT WITH VALIDATION =====
    async executeEnrichmentQuery(enrichment, stepNumber, validationId) {
        try {
            if (this.config.useValidationForEnrichment) {
                // Use validation service for enrichment queries
                logger.info(`[Agent] Using validation for enrichment step ${stepNumber}`);
                
                const validationResult = await this.cypher.getValidationService().validateAndExecuteCypher(
                    `Enrichment query step ${stepNumber}`,
                    enrichment.cypher,
                    null, // No embedding needed for enrichment
                    []   // No chat history for enrichment
                );

                return {
                    contextNodes: validationResult.contextNodes,
                    wasValidated: true,
                    validationInfo: {
                        wasOptimized: validationResult.wasOptimized,
                        wasCorrected: validationResult.wasCorrected,
                        syntaxRetries: validationResult.syntaxRetries || 0,
                        contextRetries: validationResult.contextRetries || 0
                    }
                };
            } else {
                // Direct execution (legacy mode)
                const contextNodes = await this.cypher.executeQuery(enrichment.cypher);
                return {
                    contextNodes,
                    wasValidated: false
                };
            }
        } catch (error) {
            logger.error(`[Agent] Enrichment execution step ${stepNumber} failed:`, error);
            return {
                contextNodes: [],
                wasValidated: false,
                error: error.message
            };
        }
    }

    // === MAIN COMPLEX PROCESSING WITH VALIDATION INTEGRATION ===
    async processComplexAdmission(question, questionEmbedding, chatHistory, classification) {
        logger.info("[Complex] Starting Agent processing with Cypher validation");

        const processingStartTime = Date.now();
        let agentSteps = [];
        let allContext = [];
        let mainCypher = "";
        let enrichmentQueries = [];
        let enrichmentResults = [];
        let contextScoreHistory = [];
        let contextScoreReasons = [];

        try {
            // ===== STEP 1: DEEP ANALYSIS =====
            let analysis = await this.analyzeComplexQuestion(question, chatHistory, classification);
            if (typeof analysis === 'string') {
                try {
                    analysis = JSON.parse(analysis);
                } catch (e) {
                    logger.error('[Agent] Failed to parse analysis JSON:', e.message);
                    analysis = this.getFallbackAnalysis();
                }
            }

            agentSteps.push({
                step: "analysis",
                description: "Phân tích sâu câu hỏi phức tạp",
                result: analysis,
                timestamp: Date.now() - processingStartTime
            });

            // ===== STEP 2: MAIN QUERY WITH VALIDATION =====
            const cypherData = await this.cypher.generateAndExecuteCypher(question, questionEmbedding, chatHistory);
            
            mainCypher = cypherData.cypher || "";
            allContext = cypherData.contextNodes || [];

            // Log validation results
            if (cypherData.wasValidated && cypherData.validationInfo) {
                const vInfo = cypherData.validationInfo;
                logger.info(`[Complex] Main query validation: corrected=${vInfo.wasCorrected}, optimized=${vInfo.wasOptimized}, retries=${vInfo.syntaxRetries + vInfo.contextRetries}`);
                
                agentSteps.push({
                    step: "main_query_validation",
                    description: "Validation kết quả truy vấn chính",
                    validationInfo: vInfo,
                    resultCount: allContext.length,
                    timestamp: Date.now() - processingStartTime
                });
            }

            agentSteps.push({
                step: "main_query",
                description: "Truy vấn chính từ phân tích câu hỏi",
                cypher: mainCypher,
                resultCount: allContext.length,
                timestamp: Date.now() - processingStartTime
            });

            // ===== SCORE CONTEXT AFTER MAIN QUERY =====
            const mainContextScore = await this.scoreContext(question, allContext, "main_query");
            contextScoreHistory.push(mainContextScore.score);
            contextScoreReasons.push(mainContextScore.reasoning);

            agentSteps.push({
                step: "context_score_main",
                description: "Đánh giá context sau truy vấn chính",
                contextScore: mainContextScore.score,
                contextReasoning: mainContextScore.reasoning,
                contextSize: allContext.length,
                timestamp: Date.now() - processingStartTime
            });

            logger.info(`[Agent] Main query context score: ${mainContextScore.score.toFixed(3)} (${allContext.length} nodes)`);

            // ===== STEP 3: MULTI-STEP ENRICHMENT WITH VALIDATION =====
            let enrichmentStep = 1;
            let currentContextScore = contextScoreHistory[contextScoreHistory.length - 1] || 0;

            while (
                enrichmentStep <= this.config.maxEnrichmentQueries &&
                currentContextScore < this.config.minConfidenceThreshold &&
                allContext.length <= this.config.maxContextSize
            ) {
                logger.info(`[Agent] Starting enrichment step ${enrichmentStep} (current score: ${currentContextScore.toFixed(3)})`);

                const enrichment = await this.planEnrichmentQuery(question, allContext, analysis, enrichmentStep);

                if (enrichment && enrichment.shouldEnrich && enrichment.cypher) {
                    // Execute enrichment query with validation
                    const enrichmentResult = await this.executeEnrichmentQuery(enrichment, enrichmentStep);
                    const enrichmentContext = enrichmentResult.contextNodes;

                    // Log enrichment execution details
                    logger.info(`[Agent] Enrichment step ${enrichmentStep} query: ${enrichment.cypher}`);
                    logger.info(`[Agent] Enrichment step ${enrichmentStep} result: ${enrichmentContext.length} nodes, validated: ${enrichmentResult.wasValidated}`);

                    if (enrichmentResult.wasValidated && enrichmentResult.validationInfo) {
                        const vInfo = enrichmentResult.validationInfo;
                        logger.info(`[Agent] Enrichment ${enrichmentStep} validation: corrected=${vInfo.wasCorrected}, optimized=${vInfo.wasOptimized}`);
                    }

                    if (enrichmentContext.length > 0) {
                        // Add to all context
                        const beforeCount = allContext.length;
                        allContext.push(...enrichmentContext);

                        // Track enrichment query and results
                        enrichmentQueries.push(enrichment.cypher);
                        enrichmentResults.push(enrichmentContext.length);

                        // Record enrichment step with validation info
                        const enrichmentStepData = {
                            step: `enrichment_${enrichmentStep}`,
                            description: enrichment.purpose || `Enrichment step ${enrichmentStep}`,
                            cypher: enrichment.cypher,
                            resultCount: enrichmentContext.length,
                            totalContextAfter: allContext.length,
                            infoType: enrichment.infoType || 'unknown',
                            wasValidated: enrichmentResult.wasValidated,
                            timestamp: Date.now() - processingStartTime
                        };

                        // Add validation info if available
                        if (enrichmentResult.validationInfo) {
                            enrichmentStepData.validationInfo = enrichmentResult.validationInfo;
                        }

                        agentSteps.push(enrichmentStepData);

                        // ===== SCORE CONTEXT AFTER ENRICHMENT =====
                        const enrichmentContextScore = await this.scoreContext(question, allContext, `enrichment_${enrichmentStep}`);
                        currentContextScore = enrichmentContextScore.score;
                        contextScoreHistory.push(currentContextScore);
                        contextScoreReasons.push(enrichmentContextScore.reasoning);

                        agentSteps.push({
                            step: `context_score_enrichment_${enrichmentStep}`,
                            description: `Đánh giá context sau enrichment ${enrichmentStep}`,
                            contextScore: currentContextScore,
                            contextReasoning: enrichmentContextScore.reasoning,
                            contextSize: allContext.length,
                            scoreImprovement: currentContextScore - (contextScoreHistory[contextScoreHistory.length - 2] || 0),
                            timestamp: Date.now() - processingStartTime
                        });

                        logger.info(`[Agent] Enrichment ${enrichmentStep} completed: +${enrichmentContext.length} nodes, score: ${currentContextScore.toFixed(3)}`);

                        // Check if we've improved enough to stop early
                        if (currentContextScore >= this.config.minConfidenceThreshold) {
                            logger.info(`[Agent] Confidence threshold (${this.config.minConfidenceThreshold}) reached, stopping enrichment`);
                            break;
                        }

                        enrichmentStep++;
                    } else {
                        logger.info(`[Agent] Enrichment step ${enrichmentStep} returned no results.`);
                        break;
                    }
                } else {
                    logger.info(`[Agent] No enrichment planned for step ${enrichmentStep}, stopping`);
                    break;
                }
            }

            // ===== STEP 4: GENERATE FINAL ANSWER =====
            const answer = await this.generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory);

            const processingTime = (Date.now() - processingStartTime) / 1000;

            // ===== PREPARE DETAILED RESULT =====
            const finalContextScore = contextScoreHistory[contextScoreHistory.length - 1] || 0;
            const enrichmentStepsCount = enrichmentStep - 1;

            logger.info(`[Complex] Agent completed: ${agentSteps.length} steps, ${enrichmentStepsCount} enrichments, final score: ${finalContextScore.toFixed(3)}`);

            return {
                answer: this.checkAnswer(answer),
                prompt: "",
                cypher: mainCypher,
                contextNodes: allContext,
                isError: !answer || answer === '' ? true : false,
                is_social: false,
                category: 'complex_admission',
                processingMethod: 'agent_complex',
                processingTime,

                // === DETAILED TRACKING INFO ===
                agentSteps: JSON.stringify(agentSteps),
                analysis: analysis,
                enrichmentSteps: enrichmentStepsCount,
                enrichmentDetails: JSON.stringify(agentSteps),
                enrichmentQueries: enrichmentQueries,
                enrichmentResults: enrichmentResults,
                contextScore: finalContextScore,
                contextScoreHistory: contextScoreHistory,
                contextScoreReasons: contextScoreReasons,
                questionType: 'complex_admission',

                // === CLASSIFICATION INFO ===
                classificationConfidence: classification.confidence || 0,
                classificationReasoning: classification.reasoning || '',

                // === VALIDATION SUMMARY ===
                validationSummary: this.buildValidationSummary(cypherData, agentSteps)
            };

        } catch (error) {
            logger.error("[Complex] Agent processing failed", error);
            throw error; // Let parent handle fallback
        }
    }

    // ===== NEW: BUILD VALIDATION SUMMARY =====
    buildValidationSummary(mainQueryData, agentSteps) {
        const summary = {
            mainQueryValidated: mainQueryData.wasValidated || false,
            enrichmentQueriesValidated: 0,
            totalSyntaxCorrections: 0,
            totalContextOptimizations: 0,
            validationEnabled: this.config.useValidationForEnrichment
        };

        // Count main query corrections
        if (mainQueryData.validationInfo) {
            if (mainQueryData.validationInfo.wasCorrected) summary.totalSyntaxCorrections++;
            if (mainQueryData.validationInfo.wasOptimized) summary.totalContextOptimizations++;
        }

        // Count enrichment validations
        agentSteps.forEach(step => {
            if (step.step.startsWith('enrichment_') && step.validationInfo) {
                summary.enrichmentQueriesValidated++;
                if (step.validationInfo.wasCorrected) summary.totalSyntaxCorrections++;
                if (step.validationInfo.wasOptimized) summary.totalContextOptimizations++;
            }
        });

        return summary;
    }

    async generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory) {
        const limitedHistory = chatHistory.slice(-2);
        const limitedContext = allContext.slice(0, 25); // Increased context limit

        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 200)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        const agentStepsText = agentSteps
            .filter(step => !step.step.startsWith('context_score_') && !step.step.includes('validation')) // Exclude scoring and validation steps from summary
            .map(step => `- ${step.step}: ${step.description} (${step.resultCount || 0} nodes)`)
            .join('\n');

        try {
            const prompt = this.prompts.buildPrompt('complexAnswer', {
                user_question: question,
                chat_history: historyText,
                context_json: JSON.stringify(limitedContext, null, 2),
                primary_intent: analysis.intent?.primary || 'unknown',
                secondary_intents: analysis.intent?.secondary?.join(', ') || 'none',
                entities_info: JSON.stringify(analysis.entities),
                steps_count: agentSteps.length.toString(),
                agent_steps: agentStepsText,
                analysis_reasoning: analysis.reasoning,
                context_score: this.getLatestContextScore(agentSteps).toFixed(3)
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'complex_answer');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            if (result) return result;
            return await this.generateSimpleFallback(question, allContext, chatHistory);

        } catch (error) {
            logger.error("[Agent] Complex answer generation failed", error);
            return await this.generateSimpleFallback(question, allContext, chatHistory);
        }
    }

    async generateSimpleFallback(question, context, chatHistory) {
        const limitedHistory = chatHistory.slice(-2);
        const historyText = limitedHistory.length
            ? limitedHistory.map((item, index) =>
                `Lần ${index + 1}:\n- Người dùng: ${item.question}\n- Bot: ${item.answer.substring(0, 150)}...`).join('\n\n')
            : "Không có lịch sử hội thoại.";

        const prompt = this.prompts.buildPrompt('answer', {
            user_question: question,
            context_json: JSON.stringify(context.slice(0, 15), null, 2),
            chat_history: historyText
        });

        return await this.gemini.queueRequest(prompt);
    }

    // === UTILITY METHODS ===
    extractEntityFromChatHistory(chatHistory) {
        const recent = chatHistory.slice(-3).reverse();
        for (const item of recent) {
            if (item.analysis?.entities?.majors?.length > 0 || item.analysis?.entities?.programmes?.length > 0) {
                return item.analysis.entities;
            }
        }
        return null;
    }

    getLatestContextScore(agentSteps) {
        const scoreSteps = agentSteps.filter(s => s.contextScore !== undefined);
        return scoreSteps.length > 0 ? scoreSteps[scoreSteps.length - 1].contextScore : 0;
    }

    // Kiểm tra answer có rỗng hay null, nếu không có answer thì trả về sử dụng fallback
    checkAnswer(answer) {
        if (!answer || answer === '') {
            return `
**Xin lỗi bạn!**  
Hiện tại hệ thống đang gặp sự cố kết nối với dịch vụ xử lý câu hỏi, vì vậy mình chưa thể trả lời ngay được.  
Bạn có thể liên hệ trực tiếp với bộ phận tuyển sinh TDTU để được hỗ trợ nhanh nhất:

- **Fanpage**: [https://www.facebook.com/tonducthanguniversity](https://www.facebook.com/tonducthanguniversity)  
- **Hotline**: 1900 2024 (phím 2)  
- **Email**: [tuyensinh@tdtu.edu.vn](mailto:tuyensinh@tdtu.edu.vn)  

_Cảm ơn bạn đã quan tâm đến TDTU!_
            `;
        }
        return answer;
    }
}

module.exports = AgentService;