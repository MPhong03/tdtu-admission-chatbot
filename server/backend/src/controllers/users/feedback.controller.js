const HttpResponse = require("../../data/responses/http.response");
const FeedbackService = require("../../services/users/feedback.service");
const HistoryService = require("../../services/users/history.service");

class FeedbackController {
    // Gửi phản hồi
    async createFeedback(req, res) {
        try {
            const userId = req.user?.id;
            const feedbackData = req.body;

            if (!feedbackData.historyId) {
                return res.json(HttpResponse.error("Thiếu thông tin bắt buộc"));
            }

            var history = await HistoryService.getHistoryId(feedbackData.historyId);
            if (!history) {
                return res.json(HttpResponse.error("Không tìm thấy đoạn tin nhắn này", -1));
            }

            feedbackData.answer = history.answer || "";
            feedbackData.question = history.question || "";
            feedbackData.cypher = history.cypher || "";
            feedbackData.contextNodes = history.contextNodes || "";

            const result = await FeedbackService.createFeedback(userId, feedbackData);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Gửi phản hồi thất bại", -1, err.message));
        }
    }

    // Cập nhật phản hồi (chỉ owner mới được phép)
    async updateFeedback(req, res) {
        try {
            const userId = req.user?.id;
            const feedbackId = req.params.id;
            const updateData = req.body;

            const existingFeedback = await FeedbackService.getFeedbackById(userId, feedbackId);
            if (!existingFeedback) {
                return res.json(HttpResponse.error("Feedback không tồn tại", -1));
            }

            const updated = await FeedbackService.updateFeedback(feedbackId, updateData);
            return res.json(updated);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Cập nhật phản hồi thất bại", -1, err.message));
        }
    }

    // Lấy phản hồi theo ID
    async getFeedbackById(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const result = await FeedbackService.getFeedbackById(userId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lấy phản hồi thất bại", -1, err.message));
        }
    }

    // Phân trang phản hồi của người dùng
    async paginateFeedbacks(req, res) {
        try {
            const userId = req.user?.id;
            const { page = 1, size = 10 } = req.query;
            const result = await FeedbackService.paginateFeedbacks(userId, parseInt(page), parseInt(size));
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lấy danh sách phản hồi thất bại", -1, err.message));
        }
    }

    // Cập nhật trạng thái phản hồi (admin)
    async updateFeedbackStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status) {
                return res.json(HttpResponse.error("Trạng thái là bắt buộc"));
            }
            const result = await FeedbackService.updateFeedbackStatus(id, status);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Cập nhật trạng thái phản hồi thất bại", -1, err.message));
        }
    }

    // Xóa phản hồi
    async deleteFeedback(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const result = await FeedbackService.deleteFeedback(userId, id);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Xóa phản hồi thất bại", -1, err.message));
        }
    }

    // Lấy danh sách phản hồi (admin)
    async getFeedbacks(req, res) {
        try {
            const { page = 1, size = 10, status } = req.query;
            const result = await FeedbackService.getFeedbacks(parseInt(page), parseInt(size), status);
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Lấy danh sách phản hồi thất bại", -1, err.message));
        }
    }

    // Admin thêm / sửa / xóa phản hồi feedback
    async modifyAdminReply(req, res) {
        try {
            const adminId = req.user?.id;
            const feedbackId = req.params.id;
            const replyId = req.params.replyId || null;
            const { message } = req.body;

            let action;
            if (req.method === "POST") {
                action = "add";
            } else if (req.method === "PUT") {
                if (!replyId) return res.json(HttpResponse.error("Thiếu ID của phản hồi cần sửa"));
                action = "update";
            } else if (req.method === "DELETE") {
                if (!replyId) return res.json(HttpResponse.error("Thiếu ID của phản hồi cần xóa"));
                action = "delete";
            }

            const result = await FeedbackService.modifyAdminReply(feedbackId, action, { replyId, adminId, message });

            if (!result) {
                return res.json(HttpResponse.error("Không thể thao tác phản hồi", -1));
            }

            return res.json(HttpResponse.success("Thao tác phản hồi thành công", result));
        } catch (err) {
            console.error("Lỗi thao tác phản hồi admin:", err);
            return res.json(HttpResponse.error("Lỗi xử lý phản hồi admin", -1, err.message));
        }
    }
}

module.exports = new FeedbackController();
