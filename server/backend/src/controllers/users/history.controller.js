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
}

module.exports = new HistoryController();