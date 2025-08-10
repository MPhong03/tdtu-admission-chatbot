const HttpResponse = require("../../data/responses/http.response");
const StatisticService = require("../../services/admins/statistic.service");

class StatisticController {
    // Thống kê tổng quats
    async getSummaryStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getSummaryStats(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê tổng hợp thành công", data));
        } catch (error) {
            console.error("Error getting summary stats:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê tổng hợp", -1, error.message));
        }
    }

    // Thống kê số câu hỏi theo ngày
    async getCountQuestionsByDay(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByDay(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê theo ngày thành công", data));
        } catch (error) {
            console.error("Error getting questions by day:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê theo ngày", -1, error.message));
        }
    }

    // Thống kê số câu hỏi theo trạng thái
    async getCountQuestionsByStatus(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByStatus(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê theo trạng thái thành công", data));
        } catch (error) {
            console.error("Error getting questions by status:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê theo trạng thái", -1, error.message));
        }
    }

    // Thống kê tần suất từ xuất hiện trong các câu hỏi
    async getWordCloud(req, res) {
        try {
            const { startDate, endDate, limit = 100 } = req.query;
            const data = await StatisticService.getWordCloud(startDate, endDate, parseInt(limit));
            return res.json(HttpResponse.success("Lấy word cloud thành công", data));
        } catch (error) {
            console.error("Error getting word cloud:", error);
            return res.json(HttpResponse.error("Lỗi lấy word cloud", -1, error.message));
        }
    }

    // === CÁC ENDPOINT MỚI CHO THỐNG KÊ CHI TIẾT ===

    /** Thống kê tổng hợp mới với phân loại chi tiết */
    async getDetailedSummaryStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getDetailedSummaryStats(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê chi tiết thành công", data));
        } catch (error) {
            console.error("Error getting detailed summary stats:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê chi tiết", -1, error.message));
        }
    }

    /** Thống kê verification (tỷ lệ trả lời đúng/sai) */
    async getVerificationStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getVerificationStats(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê verification thành công", data));
        } catch (error) {
            console.error("Error getting verification stats:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê verification", -1, error.message));
        }
    }

    /** Thống kê phân loại lỗi chi tiết */
    async getErrorTypeStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getErrorTypeStats(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê loại lỗi thành công", data));
        } catch (error) {
            console.error("Error getting error type stats:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê loại lỗi", -1, error.message));
        }
    }

    /** Thống kê số câu hỏi theo loại lỗi */
    async getCountQuestionsByErrorType(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByErrorType(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê theo loại lỗi thành công", data));
        } catch (error) {
            console.error("Error getting questions by error type:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê theo loại lỗi", -1, error.message));
        }
    }

    /** Thống kê số câu hỏi theo kết quả verification */
    async getCountQuestionsByVerificationResult(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByVerificationResult(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê theo kết quả verification thành công", data));
        } catch (error) {
            console.error("Error getting questions by verification result:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê theo kết quả verification", -1, error.message));
        }
    }

    /** Thống kê verification score trung bình theo ngày */
    async getAverageVerificationScoreByDay(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getAverageVerificationScoreByDay(startDate, endDate);
            return res.json(HttpResponse.success("Lấy thống kê verification score theo ngày thành công", data));
        } catch (error) {
            console.error("Error getting average verification score by day:", error);
            return res.json(HttpResponse.error("Lỗi lấy thống kê verification score theo ngày", -1, error.message));
        }
    }
}

module.exports = new StatisticController();
