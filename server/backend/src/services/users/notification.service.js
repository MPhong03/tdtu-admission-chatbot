const Notification = require("../../models/users/notification.model");
const HttpResponse = require("../../data/responses/http.response");
const BaseRepository = require("../../repositories/common/base.repository");

const NotificationRepo = new BaseRepository(Notification);

class NotificationService {
    /**
     * Lấy danh sách thông báo của người dùng
     */
    async getNotifications({ userId, visitorId, page = 1, size = 10 }) {
        try {
            const skip = (page - 1) * size;

            const filter = { };
            if (userId) filter.userId = userId;
            if (!userId && visitorId) filter.visitorId = visitorId;

            const query = NotificationRepo.asQueryable(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [items, total] = await Promise.all([
                query.exec(),
                NotificationRepo.count(filter)
            ]);

            return HttpResponse.success("Lấy thông báo thành công", {
                items: items,
                pagination: {
                    page: Number(page),
                    size: Number(size),
                    hasMore: page * size < total,
                    totalItems: total,
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }

    /**
     * Cập nhật thông báo đã đọc
     */
    async markAsRead({ notificationId }) {
        try {
            const updatedNotification = await NotificationRepo.update(notificationId, {
                isRead: true,
            });

            return updatedNotification;
        } catch (error) {
            console.error("Error updating chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi cập nhật lịch sử chat");
        }
    }
}

module.exports = new NotificationService();