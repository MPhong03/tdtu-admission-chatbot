const HttpResponse = require("../../data/responses/http.response");
const HistoryService = require("../../services/users/history.service");

class HistoryController {
    // Paginate folders
    async paginates(req, res) {
        try {
            const { page = 1, size = 10 } = req.query;

            const result = await HistoryService.getAllChat({
                page: parseInt(page),
                size: parseInt(size)
            });
            
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to paginate folders", -1, err.message));
        }
    }

    // Update admin answer
    async updateAdminAnswer(req, res) {
        try {
            const { id } = req.params;
            const { answer } = req.body;
            const userId = req.user?.id || null;

            if (!answer || answer.trim() === "") {
                return res.json(HttpResponse.error("Nội dung phản hồi không được để trống"));
            }

            const result = await HistoryService.updateAdminAnswer(id, userId, answer.trim());
            
            if (!result) {
                return res.json(HttpResponse.error("Không tìm thấy lịch sử chat hoặc cập nhật thất bại"));
            }

            return res.json(HttpResponse.success("Cập nhật phản hồi thành công", result));
        } catch (error) {
            console.error("Error updating admin answer:", error);
            return res.json(HttpResponse.error("Lỗi hệ thống khi cập nhật phản hồi"));
        }
    }
}

module.exports = new HistoryController();