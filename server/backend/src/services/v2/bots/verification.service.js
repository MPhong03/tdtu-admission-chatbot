const logger = require("../../../utils/logger.util");

class VerificationService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;

        this.config = {
            enabled: process.env.ENABLE_VERIFICATION !== 'false',
            mode: process.env.VERIFICATION_MODE || 'post_async', // 'pre_response', 'post_async', 'background'
            sampleRate: parseFloat(process.env.VERIFICATION_SAMPLE_RATE) || 0.3, // Verify 30% answers
            minAnswerLength: parseInt(process.env.MIN_ANSWER_LENGTH_VERIFY) || 50,
            excludeCategories: ['inappropriate', 'off_topic'], // Don't verify these
            preResponseTimeout: parseInt(process.env.VERIFICATION_PRE_TIMEOUT) || 5000, // 5s timeout for pre-response
            highPriorityThreshold: parseFloat(process.env.VERIFICATION_HIGH_PRIORITY_THRESHOLD) || 0.8 // High confidence threshold
        };
    }

    // ===== MAIN VERIFICATION METHOD =====
    async verifyAnswer(question, answer, contextNodes = [], category = 'simple_admission', options = {}) {
        const { mode = this.config.mode, timeout = this.config.preResponseTimeout } = options;
        
        if (!this.shouldVerify(question, answer, category)) {
            return this.getSkippedVerification('not_eligible');
        }

        try {
            // Pre-response verification (blocking)
            if (mode === 'pre_response') {
                return await this.performVerificationWithTimeout(question, answer, contextNodes, timeout);
            }
            
            // Post-response async verification (non-blocking)
            if (mode === 'post_async') {
                return await this.performVerification(question, answer, contextNodes);
            }
            
            // Background verification (always async)
            if (mode === 'background') {
                return this.getSkippedVerification('background_mode');
            }

            // Default to post_async
            return await this.performVerification(question, answer, contextNodes);

        } catch (error) {
            logger.warn("[Verification] Failed:", error.message);
            return this.getSkippedVerification('error');
        }
    }

    // ===== PRE-RESPONSE VERIFICATION (BLOCKING) =====
    async performVerificationWithTimeout(question, answer, contextNodes, timeout = 5000) {
        const verificationPromise = this.performVerification(question, answer, contextNodes);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Verification timeout')), timeout);
        });

        try {
            const verification = await Promise.race([verificationPromise, timeoutPromise]);
            logger.info(`[Verification] Pre-response completed: Score: ${verification.score} - Result: ${verification.isCorrect ? 'CORRECT' : 'INCORRECT'}`);
            return verification;
        } catch (error) {
            if (error.message === 'Verification timeout') {
                logger.warn(`[Verification] Pre-response timeout after ${timeout}ms, falling back to async`);
                return this.getSkippedVerification('timeout');
            }
            throw error;
        }
    }

    // ===== POST-RESPONSE ASYNC VERIFICATION =====
    async verifyAnswerAsync(historyId, question, answer, contextNodes = [], category = 'simple_admission') {
        if (this.config.mode === 'background') {
            // Background mode: always run async
            this.scheduleBackgroundVerification(historyId, question, answer, contextNodes, category);
            return;
        }

        if (this.config.mode === 'post_async') {
            // Post-async mode: run immediately but don't block response
            setImmediate(async () => {
                try {
                    const verification = await this.verifyAnswer(question, answer, contextNodes, category);
                    if (verification.isVerified) {
                        await this.updateHistoryVerification(historyId, verification);
                    }
                } catch (error) {
                    logger.error(`[Verification] Async verification failed for history ${historyId}:`, error);
                }
            });
        }
    }

    // ===== BACKGROUND VERIFICATION =====
    scheduleBackgroundVerification(historyId, question, answer, contextNodes, category) {
        // Schedule for later execution (e.g., during low traffic periods)
        const delay = Math.random() * 30000 + 10000; // 10-40 seconds delay
        
        setTimeout(async () => {
            try {
                const verification = await this.verifyAnswer(question, answer, contextNodes, category);
                if (verification.isVerified) {
                    await this.updateHistoryVerification(historyId, verification);
                }
            } catch (error) {
                logger.error(`[Verification] Background verification failed for history ${historyId}:`, error);
            }
        }, delay);
    }

    // ===== SMART VERIFICATION DECISION =====
    shouldVerifyWithMode(question, answer, category, contextScore = 0) {
        if (!this.shouldVerify(question, answer, category)) {
            return { shouldVerify: false, mode: 'skip', reason: 'not_eligible' };
        }

        // High confidence answers: use pre-response verification
        if (contextScore > this.config.highPriorityThreshold) {
            return { shouldVerify: true, mode: 'pre_response', reason: 'high_confidence' };
        }

        // Complex questions: use post-async verification
        if (category === 'complex_admission') {
            return { shouldVerify: true, mode: 'post_async', reason: 'complex_question' };
        }

        // Simple questions: use background verification
        if (category === 'simple_admission') {
            return { shouldVerify: true, mode: 'background', reason: 'simple_question' };
        }

        // Default: use configured mode
        return { shouldVerify: true, mode: this.config.mode, reason: 'default' };
    }

    // ===== CORE VERIFICATION LOGIC =====
    async performVerification(question, answer, contextNodes) {
        const prompt = this.buildVerificationPrompt(question, answer, contextNodes);

        const cacheKey = this.cache.generateCacheKey(prompt, 'verification');
        let result = await this.cache.get(cacheKey);

        if (!result) {
            result = await this.gemini.queueRequest(prompt, 'normal');
            if (result) {
                await this.cache.set(cacheKey, result, 24 * 60 * 60); // Cache for 24 hours
            }
        }

        return this.parseVerificationResult(result);
    }

    buildVerificationPrompt(question, answer, contextNodes) {
        const contextSample = contextNodes.slice(0, 5); // Only use first 5 for verification

        return `
BẠN LÀ CHUYÊN GIA ĐÁNH GIÁ CHẤT LƯỢNG CÂU TRẢ LỜI TUYỂN SINH.

Nhiệm vụ: Đánh giá xem câu trả lời có ĐÚNG và PHÙ HỢP với câu hỏi tuyển sinh hay không.

=== ĐẦU VÀO ===
Câu hỏi: "${question}"

Câu trả lời của bot: "${answer}"

Context data (mẫu): ${JSON.stringify(contextSample, null, 2)}

=== TIÊU CHÍ ĐÁNH GIÁ ===
1. ĐÚNG NGHIỆP VỤ (40%):
   - Thông tin học phí, ngành học, chương trình đào tạo chính xác
   - Không bịa đặt thông tin không có trong context
   - Mã ngành, năm học, điều kiện xét tuyển đúng

2. TÍNH LIÊN QUAN (30%):
   - Trả lời đúng trọng tâm câu hỏi
   - Không lạc đề hoặc nói chung chung
   - Giải quyết được intent chính của user

3. ĐỘ ĐẦY ĐỦ (20%):
   - Cung cấp thông tin cần thiết để user hiểu rõ
   - Không bỏ sót yếu tố quan trọng
   - Có hướng dẫn tiếp theo nếu cần

4. TÍNH CHÍNH XÁC (10%):
   - Không có thông tin sai lệch
   - Số liệu, ngày tháng chính xác
   - Thông tin cập nhật

=== YÊU CẦU TRẢ LỜI ===
Trả về JSON với format:
{
    "score": 0.85,
    "isCorrect": true,
    "reasoning": "Câu trả lời chính xác về thông tin ngành học và học phí...",
    "issues": [],
    "suggestions": "Có thể bổ sung thêm thông tin về điều kiện xét tuyển"
}

Trong đó:
- score: Điểm từ 0-1 (1 = hoàn hảo)
- isCorrect: true/false (true nếu score >= 0.7)
- reasoning: Lý do đánh giá
- issues: Danh sách vấn đề tìm thấy
- suggestions: Gợi ý cải thiện
`;

        return prompt;
    }

    parseVerificationResult(result) {
        if (!result) {
            return this.getSkippedVerification('no_result');
        }

        try {
            let parsed;
            if (typeof result === 'string') {
                // Try to extract JSON from string
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    parsed = JSON.parse(result);
                }
            } else {
                parsed = result;
            }

            const score = Math.max(0, Math.min(1, parseFloat(parsed.score) || 0));
            const isCorrect = score >= 0.7;

            return {
                isVerified: true,
                score,
                isCorrect,
                isIncorrect: !isCorrect,
                reasoning: parsed.reasoning || 'No reasoning provided',
                issues: parsed.issues || [],
                suggestions: parsed.suggestions || ''
            };

        } catch (error) {
            logger.warn("[Verification] Failed to parse verification result:", error.message);
            return this.getSkippedVerification('parse_error');
        }
    }

    shouldVerify(question, answer, category) {
        if (!this.config.enabled) return false;
        if (this.config.excludeCategories.includes(category)) return false;
        if (!answer || answer.length < this.config.minAnswerLength) return false;
        
        // Random sampling based on sample rate
        return Math.random() < this.config.sampleRate;
    }

    getSkippedVerification(reason) {
        return {
            isVerified: false,
            score: 0,
            isCorrect: null,
            isIncorrect: false,
            reasoning: `Verification skipped: ${reason}`,
            issues: [],
            suggestions: ''
        };
    }

    async updateHistoryVerification(historyId, verification) {
        try {
            const updateData = {
                isVerified: verification.isVerified,
                verificationScore: verification.score,
                verificationReason: verification.reasoning,
                verificationResult: verification.isCorrect ? 'correct' : 'incorrect'
            };

            // Update status to incorrect_answer if verification failed
            if (verification.isIncorrect) {
                updateData.status = 'incorrect_answer';
            }

            await this.historyRepo.updateById(historyId, updateData);
            logger.info(`[Verification] Updated history ${historyId} with verification result`);
        } catch (error) {
            logger.error(`[Verification] Failed to update history ${historyId}:`, error);
        }
    }

    // ===== CONFIGURATION METHODS =====
    setMode(mode) {
        const validModes = ['pre_response', 'post_async', 'background'];
        if (validModes.includes(mode)) {
            this.config.mode = mode;
            logger.info(`[Verification] Mode changed to: ${mode}`);
        } else {
            logger.warn(`[Verification] Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
        }
    }

    setSampleRate(rate) {
        if (rate >= 0 && rate <= 1) {
            this.config.sampleRate = rate;
            logger.info(`[Verification] Sample rate changed to: ${rate}`);
        }
    }

    setPreResponseTimeout(timeout) {
        if (timeout > 0) {
            this.config.preResponseTimeout = timeout;
            logger.info(`[Verification] Pre-response timeout changed to: ${timeout}ms`);
        }
    }

    // ===== BATCH VERIFICATION FOR ADMIN =====
    async verifyHistoryBatch(historyIds, options = {}) {
        const { mode = 'background', limit = 50 } = options;
        
        // Limit batch size to prevent overload
        const limitedIds = historyIds.slice(0, limit);
        
        logger.info(`[Verification] Starting batch verification for ${limitedIds.length} histories in ${mode} mode`);

        const results = [];
        const batchSize = 5; // Process 5 at a time

        for (let i = 0; i < limitedIds.length; i += batchSize) {
            const batch = limitedIds.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (historyId) => {
                try {
                    // Get history data
                    const history = await this.historyRepo.getById(historyId);
                    if (!history) {
                        return { historyId, status: 'not_found' };
                    }

                    // Parse context nodes
                    let contextNodes = [];
                    try {
                        contextNodes = history.contextNodes ? JSON.parse(history.contextNodes) : [];
                    } catch (e) {
                        contextNodes = [];
                    }

                    // Perform verification
                    const verification = await this.verifyAnswer(
                        history.question,
                        history.answer,
                        contextNodes,
                        history.questionType || 'simple_admission'
                    );

                    if (verification.isVerified) {
                        await this.updateHistoryVerification(historyId, verification);
                    }

                    return {
                        historyId,
                        status: 'completed',
                        verification
                    };

                } catch (error) {
                    logger.error(`[Verification] Batch item ${historyId} failed:`, error);
                    return {
                        historyId,
                        status: 'failed',
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Small delay between batches
            if (i + batchSize < limitedIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.info(`[Verification] Batch verification completed: ${results.length} results`);
        return results;
    }

    // ===== STATISTICS =====
    async getVerificationStats(timeRange = '7d') {
        try {
            const stats = await this.historyRepo.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(Date.now() - this.parseTimeRange(timeRange))
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: [{ $gte: ["$verificationScore", 0.7] }, "correct", "incorrect"]
                        },
                        count: { $sum: 1 },
                        avgScore: { $avg: "$verificationScore" }
                    }
                }
            ]);

            return {
                verificationStats: stats,
                summary: this.calculateVerificationSummary(stats)
            };
        } catch (error) {
            logger.error("[Verification] Failed to get stats:", error);
            return { verificationStats: [], summary: {} };
        }
    }

    parseTimeRange(timeRange) {
        const ranges = {
            '1d': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        return ranges[timeRange] || ranges['7d'];
    }

    calculateVerificationSummary(stats) {
        const total = stats.reduce((sum, item) => sum + item.count, 0);
        const correct = stats.find(item => item._id === 'correct')?.count || 0;
        const incorrect = stats.find(item => item._id === 'incorrect')?.count || 0;

        return {
            total,
            correct,
            incorrect,
            correctRate: total > 0 ? correct / total : 0,
            incorrectRate: total > 0 ? incorrect / total : 0
        };
    }
}

module.exports = VerificationService;