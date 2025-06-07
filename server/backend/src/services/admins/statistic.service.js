const BaseRepository = require("../../repositories/common/base.repository");
const History = require("../../models/users/history.model");
const User = require("../../models/users/user.model");

class StatisticService {
    constructor() {
        this.historyRepo = new BaseRepository(History);
        this.userRepo = new BaseRepository(User);
    }

    _buildDateFilter(startDate, endDate) {
        if (!startDate && !endDate) return {};
        const filter = {};
        if (startDate) filter.$gte = new Date(startDate);
        if (endDate) filter.$lte = new Date(endDate);
        return { createdAt: filter };
    }

    async getTotalInteractions(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);
        return this.historyRepo.count(filter);
    }

    async getTotalUsers(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);
        filter.role = 'user';
        return this.userRepo.count(filter);
    }

    async getAnswerStats(startDate, endDate) {
        const filter = this._buildDateFilter(startDate, endDate);

        const [total, success, error, unanswered] = await Promise.all([
            this.historyRepo.count(filter),
            this.historyRepo.count({ ...filter, status: 'success' }),
            this.historyRepo.count({ ...filter, status: 'error' }),
            this.historyRepo.count({ ...filter, status: 'unanswered' })
        ]);

        return {
            total,
            success,
            error,
            unanswered,
            successRate: total > 0 ? (success / total) : 0,
            errorRate: total > 0 ? (error / total) : 0,
            unansweredRate: total > 0 ? (unanswered / total) : 0
        };
    }

    async getSummaryStats(startDate, endDate ) {
        const [totalUsers, totalInteractions, answerStats] = await Promise.all([
            this.getTotalUsers(startDate, endDate),
            this.getTotalInteractions(startDate, endDate),
            this.getAnswerStats(startDate, endDate),
        ]);

        return {
            totalUsers,
            totalInteractions,
            ...answerStats
        };
    }

    // Thống kê số câu hỏi theo ngày
    async getCountQuestionsByDay(startDate, endDate) {
        const match = {};
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        return this.historyRepo.aggregate(pipeline);
    }

    // Thống kê số câu hỏi theo trạng thái
    async getCountQuestionsByStatus(startDate, endDate) {
        const match = {};
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ];

        return this.historyRepo.aggregate(pipeline);
    }
}

module.exports = new StatisticService();
