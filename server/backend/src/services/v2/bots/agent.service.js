const logger = require("../../../utils/logger.util");

class AgentService {
    constructor(geminiService, promptService, cacheService, cypherService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;
        this.cypher = cypherService;
        
        this.config = {
            maxEnrichmentQueries: parseInt(process.env.MAX_ENRICHMENT_QUERIES) || 1,
            enableSmartSkipping: true
        };
    }

    async analyzeComplexQuestion(question, chatHistory, classification) {
        try {
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

    async planEnrichmentQuery(question, mainContext, analysis, step = 1) {
        if (!analysis.strategy?.needsEnrichment || step > this.config.maxEnrichmentQueries) {
            return null;
        }

        // Skip enrichment if sufficient context
        if (mainContext.length >= 10) {
            logger.info("[Agent] Skipping enrichment - sufficient context");
            return null;
        }

        try {
            const prompt = this.prompts.buildPrompt('enrichment', {
                user_question: question,
                step: step.toString(),
                max_steps: this.config.maxEnrichmentQueries.toString(),
                context_count: mainContext.length.toString(),
                analysis_info: JSON.stringify(analysis),
                sample_context: JSON.stringify(mainContext.slice(0, 2)),
                enrichment_targets: analysis.strategy.enrichmentTargets?.join(', ') || 'none'
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
                logger.info(`[Agent] Planning enrichment step ${step}: ${result.purpose}`);
                return result;
            }
            return null;

        } catch (error) {
            logger.warn(`[Agent] Enrichment planning step ${step} failed`, error);
            return null;
        }
    }

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
                analysis_reasoning: analysis.reasoning
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'complex_answer');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            return result;

        } catch (error) {
            logger.error("[Agent] Complex answer generation failed", error);
            // Fallback to simple template
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

    async processComplexAdmission(question, questionEmbedding, chatHistory, classification) {
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
            const cypherResult = await this.cypher.generateCypher(question, questionEmbedding, chatHistory);
            cypher = cypherResult?.cypher || "";
            const is_social = cypherResult?.is_social || false;

            if (is_social) {
                const socialAnswer = await this.generateSocialAnswer(question, chatHistory);
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
                const mainContext = await this.cypher.executeQuery(cypher);
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
                            const enrichmentContext = await this.cypher.executeQuery(enrichment.cypher);
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
                const fallbackAnswer = await this.generateSocialAnswer(question, chatHistory);

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
            logger.error("[Complex] Agent processing failed", error);
            throw error; // Let parent handle fallback
        }
    }

    async generateSocialAnswer(question, chatHistory) {
        try {
            const prompt = this.prompts.buildPrompt('social', {
                user_question: question
            });

            const cacheKey = this.cache.generateCacheKey(prompt, 'social');
            let result = await this.cache.get(cacheKey);

            if (!result) {
                result = await this.gemini.queueRequest(prompt);
                if (result) {
                    await this.cache.set(cacheKey, result);
                }
            }

            return result || "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        } catch (error) {
            return "Chào bạn! Tôi sẵn sàng hỗ trợ thông tin tuyển sinh TDTU, bạn muốn hỏi gì nào?";
        }
    }
}

module.exports = AgentService;