const HttpResponse = require("../../data/responses/http.response");
const UserService = require("../../services/admins/user.service");

class UserController {
    // Paginate folders
    async paginates(req, res) {
        try {
            const { page = 1, size = 10, keyword } = req.query;

            const result = await UserService.getAllUsers({
                page: parseInt(page),
                size: parseInt(size),
                query: {
                    $or: [
                        { username: keyword },
                        { email: keyword },
                    ]
                }
            });
            
            return res.json(result);
        } catch (err) {
            console.error(err);
            return res.json(HttpResponse.error("Failed to paginate folders", -1, err.message));
        }
    }
}

module.exports = new UserController();