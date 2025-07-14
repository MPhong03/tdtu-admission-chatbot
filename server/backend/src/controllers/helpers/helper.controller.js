const HttpResponse = require("../../data/responses/http.response");
const helperService = require("../../services/helpers/helper.service");
const logger = require("../../utils/logger.util");

class HelperController {
    async convertDocumentToHtml(req, res) {
        try {
            const { file } = req;
            if (!file) {
                return res.status(400).json(HttpResponse.error("Vui lòng upload file tài liệu."));
            }

            const htmlContent = await helperService.convertDocumentToHtml(file);
            return res.json(HttpResponse.success("Xử lý thành công", htmlContent));
        } catch (err) {
            logger.error("Convert Document to HTML Error:", err);
            return res.status(500).json(HttpResponse.error("Internal Server Error"));
        }
    }
}

module.exports = new HelperController();