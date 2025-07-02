const Feedback = require("../../models/systemconfigs/feedback.model");
const BaseRepository = require("../../repositories/common/base.repository");
const HttpResponse = require("../../data/responses/http.response");

class FeedbackService {
    constructor() {
        this.repo = new BaseRepository(Feedback);
    }

    /**
     * Gửi feedback cho câu trả lời
     */
    async createFeedback(userId, feedbackData) {
        try {
            const data = { ...feedbackData, userId };
            const created = await this.repo.create(data);
            return HttpResponse.success("Gửi phản hồi thành công", created);
        } catch (error) {
            console.error("Error creating feedback:", error);
            return HttpResponse.error("Gửi phản hồi thất bại");
        }
    }

    /**
     * Lấy danh sách feedback của user (có phân trang)
     */
    async paginateFeedbacks(userId, page = 1, size = 10) {
        try {
            const filter = { userId };
            const result = await this.repo.paginate(filter, page, size, ["historyId"]);
            return HttpResponse.success("Lấy danh sách phản hồi thành công", result);
        } catch (error) {
            console.error("Error retrieving feedbacks:", error);
            return HttpResponse.error("Lấy danh sách phản hồi thất bại");
        }
    }

    /**
     * Lấy feedback theo ID (chỉ owner mới được xem)
     */
    async getFeedbackById(userId, feedbackId) {
        try {
            const feedback = await this.repo.getById(feedbackId, ["historyId"]);
            if (!feedback || String(feedback.userId) !== String(userId)) {
                return HttpResponse.error("Không tìm thấy phản hồi hoặc không có quyền", -1);
            }
            return HttpResponse.success("Lấy phản hồi thành công", feedback);
        } catch (error) {
            console.error("Error retrieving feedback:", error);
            return HttpResponse.error("Lấy phản hồi thất bại");
        }
    }

    /**
     * Cập nhật trạng thái xử lý phản hồi
     */
    async updateFeedbackStatus(feedbackId, status) {
        try {
            const updated = await this.repo.update(feedbackId, { status });
            if (!updated) {
                return HttpResponse.error("Không tìm thấy phản hồi để cập nhật", -1);
            }
            return HttpResponse.success("Cập nhật trạng thái phản hồi thành công", updated);
        } catch (error) {
            console.error("Error updating feedback status:", error);
            return HttpResponse.error("Cập nhật trạng thái phản hồi thất bại");
        }
    }

    /**
     * Xóa phản hồi
     */
    async deleteFeedback(userId, feedbackId) {
        try {
            const feedback = await this.repo.getById(feedbackId);
            if (!feedback || String(feedback.userId) !== String(userId)) {
                return HttpResponse.error("Không tìm thấy phản hồi hoặc không có quyền", -1);
            }
            await this.repo.delete(feedbackId);
            return HttpResponse.success("Xóa phản hồi thành công");
        } catch (error) {
            console.error("Error deleting feedback:", error);
            return HttpResponse.error("Xóa phản hồi thất bại");
        }
    }
}

module.exports = new FeedbackService();
