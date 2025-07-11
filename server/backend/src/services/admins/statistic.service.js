const BaseRepository = require("../../repositories/common/base.repository");
const History = require("../../models/users/history.model");
const User = require("../../models/users/user.model");
const diacritics = require("diacritics");
const stopwords = require("stopwords-vi");

class StatisticService {
    constructor() {
        this.historyRepo = new BaseRepository(History);
        this.userRepo = new BaseRepository(User);
        this.stopwordSet = new Set(stopwords);
    }

    /** Tạo filter theo mốc thời gian */
    _buildDateFilter(startDate, endDate) {
        if (!startDate && !endDate) return {};
        const filter = {};
        if (startDate) filter.$gte = new Date(startDate);
        if (endDate) filter.$lte = new Date(endDate);
        return { createdAt: filter };
    }

    /** Tổng số lượt tương tác trong thời gian */
    async getTotalInteractions(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);
        return this.historyRepo.count(filter);
    }

    /** Tổng số người dùng (role=user) */
    async getTotalUsers(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);
        filter.role = "user";
        return this.userRepo.count(filter);
    }

    /** Thống kê số câu trả lời theo trạng thái (success/error/unanswered) */
    async getAnswerStats(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);

        const [total, success, error, unanswered] = await Promise.all([
            this.historyRepo.count(filter),
            this.historyRepo.count({ ...filter, status: "success" }),
            this.historyRepo.count({ ...filter, status: "error" }),
            this.historyRepo.count({ ...filter, status: "unanswered" }),
        ]);

        return {
            total,
            success,
            error,
            unanswered,
            successRate: total ? success / total : 0,
            errorRate: total ? error / total : 0,
            unansweredRate: total ? unanswered / total : 0,
        };
    }

    /** Tóm tắt tổng hợp: số người dùng, lượt hỏi, và tỷ lệ thành công */
    async getSummaryStats(startDate, endDate) {
        const [totalUsers, totalInteractions, answerStats] = await Promise.all([
            this.getTotalUsers(startDate, endDate),
            this.getTotalInteractions(startDate, endDate),
            this.getAnswerStats(startDate, endDate),
        ]);

        return {
            totalUsers,
            totalInteractions,
            ...answerStats,
        };
    }

    /** Thống kê số câu hỏi mỗi ngày */
    async getCountQuestionsByDay(startDate, endDate) {
        const match = this._buildDateFilter(startDate, endDate);

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ];

        return this.historyRepo.aggregate(pipeline);
    }

    /** Thống kê số câu hỏi theo trạng thái */
    async getCountQuestionsByStatus(startDate, endDate) {
        const match = this._buildDateFilter(startDate, endDate);

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { $ifNull: ["$status", "unknown"] },
                    count: { $sum: 1 },
                },
            },
        ];

        return this.historyRepo.aggregate(pipeline);
    }

    // ================== Word Cloud ==================

    /** Chuẩn hóa text: chuyển thường + bỏ dấu */
    _normalizeText(text) {
        return diacritics.remove(text.toLowerCase());
    }

    /** Token hóa: tách từ theo ký tự không phải chữ */
    _tokenize(text) {
        return text
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u) // tách từ có dấu, giữ nguyên chữ cái Unicode
            .filter(Boolean);
    }

    /** Lọc bỏ stopword */
    _filterStopwords(originalWords) {
        const stopSet = new Set(stopwords);
        return originalWords.filter((word) => {
            const nonDiacritic = diacritics.remove(word);
            return !stopSet.has(nonDiacritic);
        });
    }

    /** Đếm số lần xuất hiện của từng từ */
    _countFrequencies(words) {
        const freq = new Map();
        for (const word of words) {
            freq.set(word, (freq.get(word) || 0) + 1);
        }
        return [...freq.entries()].map(([word, count]) => ({ word, count }));
    }

    /** Tạo n-grams từ mảng từ */
    _createNgrams(tokens, n = 2) {
        const ngrams = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            const phrase = tokens.slice(i, i + n).join(" ");
            ngrams.push(phrase);
        }
        return ngrams;
    }

    /**
     * Tạo word cloud từ câu hỏi người dùng đã hỏi
     * @param {Date} startDate - thời gian bắt đầu
     * @param {Date} endDate - thời gian kết thúc
     * @param {number} limit - số từ tối đa trả về
     */
    async getWordCloud(startDate, endDate, limit = 100) {
        const filter = this._buildDateFilter(startDate, endDate);

        const histories = await this.historyRepo
            .asQueryable(filter)
            .select("question")
            .sort({ createdAt: -1 })
            .limit(1000)
            .exec();

        if (histories.length === 0) return [];

        const allPhrases = [];

        for (const h of histories) {
            const tokens = this._tokenize(h.question);
            const filteredTokens = this._filterStopwords(tokens);

            // Tạo n-gram (2 đến 3 từ)
            const bigrams = this._createNgrams(filteredTokens, 2);
            const trigrams = this._createNgrams(filteredTokens, 3);
            allPhrases.push(...bigrams, ...trigrams);
        }

        const phraseCounts = this._countFrequencies(allPhrases);

        return phraseCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
}

module.exports = new StatisticService();
