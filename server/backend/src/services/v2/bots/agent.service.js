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
            useValidationForEnrichment: process.env.USE_VALIDATION_FOR_ENRICHMENT !== 'false',
            // NEW: Dynamic enrichment config
            dynamicEnrichmentEnabled: process.env.ENABLE_DYNAMIC_ENRICHMENT !== 'false',
            earlyTerminationThreshold: parseFloat(process.env.EARLY_TERMINATION_THRESHOLD) || 0.8,
            minScoreImprovementThreshold: parseFloat(process.env.MIN_SCORE_IMPROVEMENT) || 0.05
        };

        // Reference to bot service for progress tracking
        this.botService = null;
    }

    setBotService(botService) {
        this.botService = botService;
    }

    emitProgress(step, description, details = {}) {
        if (this.botService) {
            this.botService.emitProgress(step, description, details);
        }
    }

    // === DYNAMIC ENRICHMENT DECISION ===
    shouldContinueEnrichment(contextScoreHistory, enrichmentStep, previousEnrichments) {
        if (!this.config.dynamicEnrichmentEnabled) {
            return enrichmentStep <= this.config.maxEnrichmentQueries;
        }

        const currentScore = contextScoreHistory[contextScoreHistory.length - 1] || 0;
        
        // Early termination if score is high enough
        if (currentScore >= this.config.earlyTerminationThreshold) {
            logger.info(`[Agent] Early termination: score ${currentScore.toFixed(3)} >= ${this.config.earlyTerminationThreshold}`);
            return false;
        }

        // Stop if we've reached max steps
        if (enrichmentStep > this.config.maxEnrichmentQueries) {
            return false;
        }

        // Dynamic max based on current score
        const dynamicMax = currentScore < 0.3 ? 3 : 
                          currentScore < 0.6 ? 2 : 1;
        
        if (enrichmentStep > dynamicMax) {
            logger.info(`[Agent] Dynamic limit reached: step ${enrichmentStep} > ${dynamicMax} (score: ${currentScore.toFixed(3)})`);
            return false;
        }

        // Check score improvement trend
        if (contextScoreHistory.length >= 2) {
            const recentImprovement = currentScore - contextScoreHistory[contextScoreHistory.length - 2];
            if (recentImprovement < this.config.minScoreImprovementThreshold) {
                logger.info(`[Agent] Poor improvement: ${recentImprovement.toFixed(3)} < ${this.config.minScoreImprovementThreshold}, considering stop`);
                
                // Stop if last 2 enrichments didn't help much
                if (enrichmentStep > 1 && recentImprovement <= 0) {
                    logger.info(`[Agent] Stopping due to negative improvement`);
                    return false;
                }
            }
        }

        // Check if recent enrichments are failing
        const recentFailures = previousEnrichments.slice(-2).filter(e => e.failed || e.resultCount === 0).length;
        if (recentFailures >= 2) {
            logger.info(`[Agent] Stopping due to consecutive failures: ${recentFailures}/2`);
            return false;
        }

        return true;
    }

    // === BATCH CONTEXT SCORING ===
    async batchScoreContexts(question, contextGroups) {
        try {
            // Build batch prompt for multiple context groups
            const batchPrompt = this.prompts.buildPrompt('batchContextScore', {
                user_question: question,
                context_groups: JSON.stringify(contextGroups.map((group, idx) => ({
                    stepName: group.stepName,
                    contextCount: group.contextNodes.length,
                    sampleContext: group.contextNodes.slice(0, 3)
                })))
            });

            const cacheKey = this.cache.generateCacheKey(batchPrompt, 'batch_context_score');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(batchPrompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            // Parse batch results
            if (result && result.scores) {
                return result.scores.map((scoreData, idx) => ({
                    score: Math.max(0, Math.min(1, parseFloat(scoreData.score) || 0)),
                    reasoning: scoreData.reasoning || 'Batch scoring result',
                    contextSize: contextGroups[idx].contextNodes.length,
                    stepName: contextGroups[idx].stepName
                }));
            }

            // Fallback to individual scoring if batch fails
            logger.warn("[Agent] Batch scoring failed, falling back to individual scoring");
            return await Promise.all(
                contextGroups.map(group => 
                    this.scoreContext(question, group.contextNodes, group.stepName)
                )
            );

        } catch (error) {
            logger.error("[Agent] Batch context scoring failed:", error);
            // Fallback to individual scoring
            return await Promise.all(
                contextGroups.map(group => 
                    this.scoreContext(question, group.contextNodes, group.stepName)
                )
            );
        }
    }

    // === ENRICHMENT EFFECTIVENESS ANALYSIS ===
    analyzeEnrichmentEffectiveness(previousEnrichments, contextScoreHistory) {
        const analysis = {
            totalAttempts: previousEnrichments.length,
            successfulAttempts: previousEnrichments.filter(e => e.resultCount > 0).length,
            failedAttempts: previousEnrichments.filter(e => e.failed || e.resultCount === 0).length,
            skippedAttempts: previousEnrichments.filter(e => e.skipped).length,
            averageResults: previousEnrichments.reduce((sum, e) => sum + (e.resultCount || 0), 0) / Math.max(1, previousEnrichments.length),
            scoreImprovement: contextScoreHistory.length > 1 ? 
                contextScoreHistory[contextScoreHistory.length - 1] - contextScoreHistory[0] : 0,
            diversityScore: this.calculateQueryDiversity(previousEnrichments)
        };

        logger.info(`[Agent] Enrichment effectiveness: ${analysis.successfulAttempts}/${analysis.totalAttempts} successful, score improvement: +${analysis.scoreImprovement.toFixed(3)}, diversity: ${analysis.diversityScore.toFixed(2)}`);
        
        return analysis;
    }

    calculateQueryDiversity(enrichments) {
        const nodeTypes = new Set();
        const infoTypes = new Set();
        const purposes = new Set();

        enrichments.forEach(e => {
            if (e.cypher) {
                // Extract node types from cypher (simple regex)
                const nodeMatches = e.cypher.match(/\((\w+):(\w+)\)/g);
                if (nodeMatches) {
                    nodeMatches.forEach(match => {
                        const nodeType = match.match(/:(\w+)\)/)?.[1];
                        if (nodeType) nodeTypes.add(nodeType);
                    });
                }
            }
            if (e.infoType && e.infoType !== 'none') infoTypes.add(e.infoType);
            if (e.purpose && e.purpose !== 'Skipped') purposes.add(e.purpose);
        });

        // Diversity score: 0-1 based on variety of approaches
        const maxPossibleTypes = 7; // Major, Programme, MajorProgramme, Document, Tuition, Scholarship, Year
        const maxPossibleInfoTypes = 5; // scholarship, career, requirements, comparison, documents
        
        return (nodeTypes.size / maxPossibleTypes + infoTypes.size / maxPossibleInfoTypes) / 2;
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
    async planEnrichmentQuery(question, mainContext, analysis, stepNumber, previousEnrichments = [], contextScoreHistory = []) {
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
            // Build enrichment history for better planning
            const enrichmentHistory = previousEnrichments.map((enr, idx) => ({
                step: idx + 1,
                query: enr.cypher || 'Unknown',
                resultCount: enr.resultCount || 0,
                purpose: enr.purpose || 'Unknown',
                infoType: enr.infoType || 'Unknown'
            }));

            const currentContextScore = contextScoreHistory.length > 0 ? contextScoreHistory[contextScoreHistory.length - 1] : 0;
            const scoreImprovement = contextScoreHistory.length > 1 ? 
                (contextScoreHistory[contextScoreHistory.length - 1] - contextScoreHistory[contextScoreHistory.length - 2]) : 0;

            const prompt = this.prompts.buildPrompt('enrichment', {
                user_question: question,
                step: stepNumber.toString(),
                max_steps: this.config.maxEnrichmentQueries.toString(),
                context_count: mainContext.length.toString(),
                analysis_info: JSON.stringify(analysis),
                sample_context: JSON.stringify(mainContext.slice(0, 3)), // More sample context
                enrichment_targets: analysis.strategy?.enrichmentTargets?.join(', ') || 'none',
                // NEW: Enhanced context for better planning
                previous_enrichments: JSON.stringify(enrichmentHistory),
                current_context_score: currentContextScore.toFixed(3),
                score_improvement: scoreImprovement.toFixed(3),
                context_score_history: JSON.stringify(contextScoreHistory.map(s => s.toFixed(3)))
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
            this.emitProgress('main_query', 'Đang tìm kiếm dữ liệu...');
            
            const cypherData = await this.cypher.generateAndExecuteCypher(question, questionEmbedding, chatHistory);
            
            mainCypher = cypherData.cypher || "";
            allContext = cypherData.contextNodes || [];

            if (cypherData.wasValidated) {
                this.emitProgress('main_query_validation', 'Đang kiểm tra và tối ưu tìm kiếm...');
            }

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
            this.emitProgress('context_score_main', 'Đang đánh giá thông tin...');
            
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
        let previousEnrichments = []; // Track previous enrichment attempts

        while (
            this.shouldContinueEnrichment(contextScoreHistory, enrichmentStep, previousEnrichments) &&
            currentContextScore < this.config.minConfidenceThreshold &&
            allContext.length <= this.config.maxContextSize
        ) {
            logger.info(`[Agent] Starting enrichment step ${enrichmentStep} (current score: ${currentContextScore.toFixed(3)})`);
            
            this.emitProgress(`enrichment_${enrichmentStep}`, `Đang mở rộng tìm kiếm (${enrichmentStep}/${this.config.maxEnrichmentQueries})...`);

            const enrichment = await this.planEnrichmentQuery(question, allContext, analysis, enrichmentStep, previousEnrichments, contextScoreHistory);

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

                        // Track this enrichment for next iteration
                        previousEnrichments.push({
                            cypher: enrichment.cypher,
                            resultCount: enrichmentContext.length,
                            purpose: enrichment.purpose,
                            infoType: enrichment.infoType,
                            wasValidated: enrichmentResult.wasValidated
                        });

                        // ===== SCORE CONTEXT AFTER ENRICHMENT =====
                        this.emitProgress(`context_score_enrichment_${enrichmentStep}`, 'Đang đánh giá thông tin bổ sung...');
                        
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
                        
                        // Track failed enrichment for next iteration learning
                        previousEnrichments.push({
                            cypher: enrichment.cypher,
                            resultCount: 0,
                            purpose: enrichment.purpose,
                            infoType: enrichment.infoType,
                            wasValidated: enrichmentResult.wasValidated,
                            failed: true,
                            failureReason: 'No results returned'
                        });

                        // Add failed step to agentSteps for tracking
                        agentSteps.push({
                            step: `enrichment_${enrichmentStep}_failed`,
                            description: `Enrichment ${enrichmentStep} không tìm thấy kết quả`,
                            cypher: enrichment.cypher,
                            resultCount: 0,
                            failureReason: 'No results',
                            timestamp: Date.now() - processingStartTime
                        });

                        enrichmentStep++;
                        // Continue to next iteration instead of breaking
                        // This allows the agent to try different approaches
                    }
                } else {
                    logger.info(`[Agent] No enrichment planned for step ${enrichmentStep}, stopping`);
                    
                    // Track skipped enrichment
                    previousEnrichments.push({
                        cypher: null,
                        resultCount: 0,
                        purpose: 'Skipped',
                        infoType: 'none',
                        wasValidated: false,
                        skipped: true,
                        skipReason: 'No valid query generated or not needed'
                    });
                    
                    break;
                }
            }

            // ===== STEP 4: ENRICHMENT EFFECTIVENESS ANALYSIS =====
            const enrichmentAnalysis = this.analyzeEnrichmentEffectiveness(previousEnrichments, contextScoreHistory);

            // ===== STEP 5: GENERATE FINAL ANSWER =====
            const answer = await this.generateComplexAnswer(question, allContext, analysis, agentSteps, chatHistory);

            const processingTime = (Date.now() - processingStartTime) / 1000;

            // ===== PREPARE DETAILED RESULT =====
            const finalContextScore = contextScoreHistory[contextScoreHistory.length - 1] || 0;
            const enrichmentStepsCount = enrichmentStep - 1;

            logger.info(`[Complex] Agent completed: ${agentSteps.length} steps, ${enrichmentStepsCount} enrichments, final score: ${finalContextScore.toFixed(3)}`);
            logger.info(`[Complex] Enrichment analysis: ${JSON.stringify(enrichmentAnalysis)}`);

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
                agentSteps: agentSteps,
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

                // === ENRICHMENT ANALYSIS ===
                enrichmentAnalysis: enrichmentAnalysis,
                enrichmentDiversity: enrichmentAnalysis.diversityScore,
                enrichmentSuccessRate: enrichmentAnalysis.totalAttempts > 0 ? 
                    enrichmentAnalysis.successfulAttempts / enrichmentAnalysis.totalAttempts : 0,

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