const HttpResponse = require("../../data/responses/http.response");
const StatisticService = require("../../services/admins/statistic.service");

class StatisticController {
    // Thống kê tổng quats
    async getSummaryStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getSummaryStats(startDate, endDate);
            res.json(HttpResponse.success("Thống kê", data));
        } catch (err) {
            console.error(err);
            res.json(HttpResponse.error("Internal Server Error", -1, err.message));
        }
    }

    // Thống kê số câu hỏi theo ngày
    async getCountQuestionsByDay(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByDay(startDate, endDate);
            res.json(HttpResponse.success("Thống kê số câu hỏi theo ngày", data));
        } catch (err) {
            console.error(err);
            res.json(HttpResponse.error("Internal Server Error", -1, err.message));
        }
    }

    // Thống kê số câu hỏi theo trạng thái
    async getCountQuestionsByStatus(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await StatisticService.getCountQuestionsByStatus(startDate, endDate);
            res.json(HttpResponse.success("Thống kê số câu hỏi theo trạng thái", data));
        } catch (err) {
            console.error(err);
            res.json(HttpResponse.error("Internal Server Error", -1, err.message));
        }
    }

    // Thống kê tần suất từ xuất hiện trong các câu hỏi
    async getWordCloud(req, res) {
        try {
            const { startDate, endDate, limit = 100 } = req.query;
            const data = await StatisticService.getWordCloud(startDate, endDate, limit);
            res.json(HttpResponse.success("Thống kê tần suất từ xuất hiện trong các câu hỏi", data));
        } catch (err) {
            console.error(err);
            res.json(HttpResponse.error("Internal Server Error", -1, err.message));
        }
    }
}

module.exports = new StatisticController();
