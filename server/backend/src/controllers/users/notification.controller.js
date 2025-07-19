const HttpResponse = require("../../data/responses/http.response");
const NotificationService = require("../../services/users/notification.service");

class NotificationController {
    // Paginate folders
    async paginates(req, res) {
        try {
            const { page = 1, size = 10 } = req.query;
            const userId = req.user?.id || null;
            const visitorId = req.visitorId || null;

            const result = await NotificationService.getNotifications({
                userId,
                visitorId,
                page: parseInt(page),
                size: parseInt(size)
            });
            
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to paginate folders", -1, err.message));
        }
    }

    // Mark notification as read
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const result = await NotificationService.markAsRead({ notificationId: id });
            return res.json(HttpResponse.success("Notification marked as read", result));
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to mark notification as read", -1, err.message));
        }
    }
}

module.exports = new NotificationController();