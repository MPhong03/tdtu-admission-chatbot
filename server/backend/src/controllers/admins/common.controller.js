const HttpResponse = require("../../data/responses/http.response");
const commonService = require("../../services/admins/common.service");
const logger = require("../../utils/logger.util");

class CommonController {
    async getAllConfigs(req, res) {
        try {
            const configs = await commonService.getAllConfigs();
            return res.json(HttpResponse.success('Lấy danh sách cấu hình thành công', configs));
        } catch (err) {
            logger.error('Get All Configs Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
    
    async updateConfigByKey(req, res) {
        const key = req.params.key;
        const { value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json(HttpResponse.error('Key và value là bắt buộc'));
        }

        try {
            const updated = await commonService.updateConfig(key, value);
            if (!updated) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy cấu hình để cập nhật'));
            }
            return res.json(HttpResponse.success('Cập nhật cấu hình thành công', updated));
        } catch (err) {
            logger.error('Update Config Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new CommonController();

/*
class DemoController {
    async demoMethod(req, res) {
        try {
            const data = {};
            return res.json(HttpResponse.success('Message', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new DemoController();
*/