const BaseRepository = require("../../repositories/common/base.repository");

const User = require("../../models/users/user.model");
const HttpResponse = require("../../data/responses/http.response");

const UserRepo = new BaseRepository(User);

class UserService {
    // =========== ADMIN ==========
    async getAllUsers({ page = 1, size = 10 }) {
        try {
            const skip = (page - 1) * size;

            const query = UserRepo.asQueryable()
                // .populate("userId", "username email")
                // .populate("chatId", "name")
                .where({ role: "user" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size);

            const [users, totalItems] = await Promise.all([
                query.exec(),
                UserRepo.count()
            ]);

            return HttpResponse.success("Danh sách người dùng", {
                items: users,
                pagination: {
                    page,
                    size,
                    totalItems,
                    hasMore: page * size < totalItems
                }
            });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            return HttpResponse.error("Lỗi hệ thống khi lấy lịch sử chat");
        }
    }
}

module.exports = new UserService();