const Feedback = require("../../models/users/feedback.model");
const Notification = require("../../models/users/notification.model");
const History = require("../../models/users/history.model");
const BaseRepository = require("../../repositories/common/base.repository");
const HttpResponse = require("../../data/responses/http.response");
const { nanoid } = require("nanoid");

class FeedbackService {
    constructor() {
        this.repo = new BaseRepository(Feedback);
        this.notificationRepo = new BaseRepository(Notification);
        this.historyRepo = new BaseRepository(History);
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
     * Cập nhật feedback cho câu trả lời
     */
    async updateFeedback(feedbackId, feedbackData) {
        try {
            const updated = await this.repo.update(feedbackId, feedbackData);
            return HttpResponse.success("Cập nhật phản hồi thành cong", updated);
        } catch (error) {
            console.error("Error updating feedback:", error);
            return HttpResponse.error("Cập nhật phản hồi thất bại");
        }
    }

    /**
     * Lấy danh sách feedback của user (có phân trang)
     */
    async paginateFeedbacks(userId, page = 1, size = 10) {
        try {
            const filter = { userId };
            const result = await this.repo.paginate(filter, page, size, [{ path: 'historyId', select: '-contextNodes' }], undefined, ["contextNodes"]);
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
            const feedback = await this.repo.getById(feedbackId, ["historyId", "userId"]);
            // if (!feedback || String(feedback.userId) !== String(userId)) {
            //     return HttpResponse.error("Không tìm thấy phản hồi hoặc không có quyền", -1);
            // }
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

    /**
     * Lấy danh sách feedback cdành cho admin (có phân trang)
     */
    async getFeedbacks(page = 1, size = 10, status = null) {
        try {
            const filter = {};
            if (status) filter.status = status;
            const result = await this.repo.paginate(filter, page, size, [{ path: 'historyId', select: '-contextNodes' }], { createdAt: -1 }, ["contextNodes"]);
            return HttpResponse.success("Lấy danh sách phản hồi thành công", result);
        } catch (error) {
            console.error("Error retrieving feedbacks:", error);
            return HttpResponse.error("Lấy danh sách phản hồi thất bại");
        }
    }

    /**
     * Thêm, sửa hoặc xóa phản hồi của admin
     * @param {'add'|'update'|'delete'} action 
     */
    async modifyAdminReply(feedbackId, action, { replyId, adminId, message }) {
        try {
            const feedback = await this.repo.getById(feedbackId);
            if (!feedback) return null;

            switch (action) {
                case 'add':
                    feedback.adminReplies.push({
                        id: nanoid(),
                        adminId,
                        message,
                        createdAt: new Date()
                    });
                    break;
                case 'update':
                    const replyToUpdate = feedback.adminReplies.find(r => r.id === replyId);
                    if (!replyToUpdate) return null;
                    replyToUpdate.message = message;
                    break;
                case 'delete':
                    feedback.adminReplies = feedback.adminReplies.filter(r => r.id !== replyId);
                    break;
            }

            await feedback.save();

            if (action === 'add' || action === 'update') {
                const history = await this.historyRepo.getById(feedback.historyId);

                if (history) {
                    await this.notificationRepo.create({
                        userId: feedback.userId,
                        chatId: history.chatId,
                        type: "admin_reply",
                        message: "Nhân viên đã phản hồi feedback: " + message,
                        historyId: feedback.historyId
                    });
                }
            }

            return feedback;
        } catch (err) {
            console.error("Lỗi khi thao tác với phản hồi admin:", err);
            return null;
        }
    }
}

module.exports = new FeedbackService();
