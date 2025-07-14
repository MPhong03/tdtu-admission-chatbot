const BaseRepository = require("../../repositories/common/base.repository");

const User = require("../../models/users/user.model");
const HttpResponse = require("../../data/responses/http.response");

const UserRepo = new BaseRepository(User);

class UserService {
    // =========== ADMIN ==========
    async getAllUsers({ page = 1, size = 10, query = {} }) {
        try {
            const skip = (page - 1) * size;

            // Base condition: role = 'user'
            const condition = { role: "user" };

            // AND conditions
            for (const [key, value] of Object.entries(query)) {
                if (key === "$or") continue;
                if (value !== null && value !== undefined && value !== "") {
                    condition[key] = { $regex: value, $options: "i" };
                }
            }

            // OR conditions
            if (Array.isArray(query.$or) && query.$or.length > 0) {
                const orConditions = [];

                query.$or.forEach(orClause => {
                    if (typeof orClause !== "object" || !orClause) return;

                    for (const [key, value] of Object.entries(orClause)) {
                        if (value !== null && value !== undefined && value !== "") {
                            orConditions.push({
                                [key]: { $regex: value, $options: "i" }
                            });
                        }
                    }
                });

                if (orConditions.length > 0) {
                    condition["$or"] = orConditions;
                }
            }

            const queryBuilder = UserRepo.asQueryable(condition)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size)
                .lean();

            const [users, totalItems] = await Promise.all([
                queryBuilder.exec(),
                UserRepo.count(condition)
            ]);

            return HttpResponse.success("Danh sách người dùng", {
                items: users,
                pagination: {
                    page,
                    size,
                    totalItems,
                    totalPages: Math.ceil(totalItems / size),
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