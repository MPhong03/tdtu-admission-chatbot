const {
    N_ScholarshipService,
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');
const { convertHtmlToText } = require('../../utils/calculator.util');

class ScholarshipController {
    async create(req, res) {
        try {
            const { year_id, ...scholarship } = req.body;
            if (req.body.content) req.body.text = convertHtmlToText(req.body.content);
            await N_ScholarshipService.create(scholarship);
            if (year_id) await N_ScholarshipService.linkToYear(scholarship.id, year_id);
            return res.json(HttpResponse.success('Tạo học bổng thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async update(req, res) {
        try {
            const { year_id, ...scholarship } = req.body;
            if (req.body.content) req.body.text = convertHtmlToText(req.body.content);
            const updated = await N_ScholarshipService.update(req.params.id, req.body);
            if (year_id) await N_ScholarshipService.linkToYear(updated.id, year_id);
            return res.json(HttpResponse.success('Cập nhật học bổng thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async delete(req, res) {
        try {
            await N_ScholarshipService.delete(req.params.id);
            return res.json(HttpResponse.success('Xóa học bổng thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const detail = await N_ScholarshipService.getDetail(id);
            if (!detail) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy học bổng'));
            }
            return res.json(HttpResponse.success('Lấy chi tiết học bổng thành công', detail));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async list(req, res) {
        try {
            const { page = 1, size = 10, keyword } = req.query;
            const filter = {
                $or: [
                    { name: keyword },
                    { content: keyword },
                ]
            };
            const data = await N_ScholarshipService.paginate({ page: +page, pageSize: +size, query: filter });
            return res.json(HttpResponse.success('Lấy danh sách học bổng thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new ScholarshipController();