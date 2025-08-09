const logger = require("../../../utils/logger.util");

class VerificationService {
    constructor(geminiService, promptService, cacheService) {
        this.gemini = geminiService;
        this.prompts = promptService;
        this.cache = cacheService;

        this.config = {
            enabled: process.env.ENABLE_VERIFICATION !== 'false',
            asyncMode: process.env.VERIFICATION_ASYNC !== 'false',
            sampleRate: parseFloat(process.env.VERIFICATION_SAMPLE_RATE) || 0.3, // Verify 30% answers
            minAnswerLength: parseInt(process.env.MIN_ANSWER_LENGTH_VERIFY) || 50,
            excludeCategories: ['inappropriate', 'off_topic'] // Don't verify these
        };
    }

    // ===== MAIN VERIFICATION METHOD =====
    async verifyAnswer(question, answer, contextNodes = [], category = 'simple_admission') {
        if (!this.shouldVerify(question, answer, category)) {
            return this.getSkippedVerification('not_eligible');
        }

        try {
            const verification = await this.performVerification(question, answer, contextNodes);
            logger.info(`[Verification] Q: "${question.substring(0, 50)}..." - Score: ${verification.score} - Result: ${verification.isCorrect ? 'CORRECT' : 'INCORRECT'}`);
            return verification;

        } catch (error) {
            logger.warn("[Verification] Failed:", error.message);
            return this.getSkippedVerification('error');
        }
    }

    // ===== ASYNC VERIFICATION FOR BATCH PROCESSING =====
    async verifyAnswerAsync(historyId, question, answer, contextNodes = [], category = 'simple_admission') {
        if (!this.config.asyncMode) return;

        // Run verification in background without blocking response
        setImmediate(async () => {
            try {
                const verification = await this.verifyAnswer(question, answer, contextNodes, category);

                if (verification.isVerified) {
                    // Update history record with verification result
                    await this.updateHistoryVerification(historyId, verification);
                }
            } catch (error) {
                logger.error(`[Verification] Async verification failed for history ${historyId}:`, error);
            }
        });
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

4. CHẤT LƯỢNG TRÌNH BÀY (10%):
   - Dễ hiểu, logic, có cấu trúc
   - Thân thiện, chuyên nghiệp
   - Có thông tin liên hệ TDTU

=== CÁC TRƯỜNG HỢP SAI THƯỜNG GẶP ===
- Bot trả lời nhưng không dựa vào context
- Thông tin học phí/mã ngành sai
- Trả lời không đúng câu hỏi (answer mismatch)
- Thiếu thông tin quan trọng user cần
- Nói quá chung chung, không cụ thể

=== ĐIỂM SỐ ===
- 0.0-0.4: SAI - Câu trả lời có vấn đề nghiêm trọng
- 0.5-0.6: KHUYẾT THIẾU - Đúng nhưng thiếu thông tin quan trọng  
- 0.7-0.8: TỐT - Đúng và đầy đủ cơ bản
- 0.9-1.0: XUẤT SẮC - Hoàn hảo về mọi mặt

Trả về JSON:
{
    "score": 0.85,
    "isCorrect": true,
    "reasoning": "Câu trả lời chính xác về học phí ngành CNTT, cung cấp đầy đủ thông tin cần thiết và có hướng dẫn liên hệ.",
    "issues": [],
    "suggestions": "Có thể bổ sung thêm thông tin về học bổng"
}
        `.trim();
    }

    parseVerificationResult(result) {
        try {
            const parsed = typeof result === 'string' ? JSON.parse(result) : result;

            return {
                isVerified: true,
                score: Math.max(0, Math.min(1, parseFloat(parsed.score) || 0)),
                isCorrect: parsed.isCorrect === true,
                isIncorrect: parsed.isCorrect === false,
                reasoning: parsed.reasoning || 'No reasoning provided',
                issues: parsed.issues || [],
                suggestions: parsed.suggestions || '',
                timestamp: new Date()
            };

        } catch (error) {
            logger.warn("[Verification] Failed to parse verification result:", error.message);
            return this.getSkippedVerification('parse_error');
        }
    }

    // ===== SAMPLING & FILTERING LOGIC =====
    shouldVerify(question, answer, category) {
        // Check if verification is enabled
        if (!this.config.enabled) return false;

        // Skip excluded categories
        if (this.config.excludeCategories.includes(category)) return false;

        // Skip very short answers (likely errors or social responses)
        if (answer.length < this.config.minAnswerLength) return false;

        // Skip emergency fallback responses
        if (answer.includes('hệ thống đang gặp sự cố') || answer.includes('xin lỗi, tôi không thể')) return false;

        // Apply sampling rate
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
            suggestions: '',
            timestamp: new Date()
        };
    }

    // ===== DATABASE UPDATE =====
    async updateHistoryVerification(historyId, verification) {
        try {
            const HistoryRepo = require("../../../repositories/common/base.repository");
            const History = require("../../../models/users/history.model");
            const historyRepo = new HistoryRepo(History);

            const updateData = {
                isVerified: verification.isVerified,
                verificationScore: verification.score,
                verificationReason: verification.reasoning
            };

            // Update status to incorrect_answer if verification failed
            if (verification.isIncorrect) {
                updateData.status = 'incorrect_answer';
            }

            await historyRepo.update(historyId, updateData);
            logger.info(`[Verification] Updated history ${historyId} with verification result`);

        } catch (error) {
            logger.error(`[Verification] Failed to update history ${historyId}:`, error);
        }
    }

    // ===== BATCH VERIFICATION FOR ADMIN =====
    async verifyHistoryBatch(historyIds, options = {}) {
        const results = [];
        const limit = options.limit || 10;
        const limitedIds = historyIds.slice(0, limit);

        logger.info(`[Verification] Starting batch verification for ${limitedIds.length} histories`);

        for (const historyId of limitedIds) {
            try {
                const HistoryRepo = require("../../../repositories/common/base.repository");
                const History = require("../../../models/users/history.model");
                const historyRepo = new HistoryRepo(History);

                const history = await historyRepo.getById(historyId);
                if (!history) continue;

                // Parse context nodes
                let contextNodes = [];
                try {
                    contextNodes = history.contextNodes ? JSON.parse(history.contextNodes) : [];
                } catch (e) {
                    contextNodes = [];
                }

                const verification = await this.verifyAnswer(
                    history.question,
                    history.answer,
                    contextNodes,
                    history.questionType
                );

                if (verification.isVerified) {
                    await this.updateHistoryVerification(historyId, verification);
                }

                results.push({
                    historyId,
                    question: history.question.substring(0, 100),
                    verification
                });

            } catch (error) {
                logger.error(`[Verification] Batch item ${historyId} failed:`, error);
                results.push({
                    historyId,
                    error: error.message
                });
            }
        }

        logger.info(`[Verification] Batch verification completed: ${results.length} results`);
        return results;
    }

    // ===== ANALYTICS =====
    async getVerificationStats(timeRange = '7d') {
        try {
            const HistoryRepo = require("../../../repositories/common/base.repository");
            const History = require("../../../models/users/history.model");
            const historyRepo = new HistoryRepo(History);

            const endDate = new Date();
            const startDate = new Date();

            switch (timeRange) {
                case '1d': startDate.setDate(endDate.getDate() - 1); break;
                case '7d': startDate.setDate(endDate.getDate() - 7); break;
                case '30d': startDate.setDate(endDate.getDate() - 30); break;
                default: startDate.setDate(endDate.getDate() - 7);
            }

            const pipeline = [
                {
                    $match: {
                        createdAt: { $gte: startDate, $lte: endDate },
                        isVerified: true
                    }
                },
                {
                    $group: {
                        _id: {
                            questionType: "$questionType",
                            isCorrect: {
                                $cond: [{ $gte: ["$verificationScore", 0.7] }, "correct", "incorrect"]
                            }
                        },
                        count: { $sum: 1 },
                        avgScore: { $avg: "$verificationScore" }
                    }
                }
            ];

            const stats = await historyRepo.model.aggregate(pipeline);

            return {
                timeRange,
                verificationStats: stats,
                summary: this.calculateVerificationSummary(stats)
            };

        } catch (error) {
            logger.error("[Verification] Failed to get stats:", error);
            return { error: error.message };
        }
    }

    calculateVerificationSummary(stats) {
        const total = stats.reduce((sum, item) => sum + item.count, 0);
        const correct = stats
            .filter(item => item._id.isCorrect === 'correct')
            .reduce((sum, item) => sum + item.count, 0);

        const accuracy = total > 0 ? (correct / total * 100).toFixed(2) : 0;
        const avgScore = stats.length > 0
            ? (stats.reduce((sum, item) => sum + (item.avgScore * item.count), 0) / total).toFixed(3)
            : 0;

        return {
            totalVerified: total,
            correctAnswers: correct,
            incorrectAnswers: total - correct,
            accuracyRate: `${accuracy}%`,
            averageScore: avgScore
        };
    }
}

module.exports = VerificationService;