const {
    N_DocumentService,
    N_YearService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');
const { convertHtmlToText } = require('../../utils/calculator.util');

class DocumentController {
    async create(req, res) {
        try {
            const { year_id, html, ...document } = req.body;
            if (html) req.body.text = convertHtmlToText(html);
            var newDoc = await N_DocumentService.create(req.body);
            if (year_id) await N_YearService.linkToDocument(year_id, newDoc.id);
            return res.json(HttpResponse.success('Tạo tài liệu thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async update(req, res) {
        try {
            const { year_id, html, ...document } = req.body;
            if (req.body.html) req.body.text = convertHtmlToText(req.body.html);
            await N_DocumentService.update(req.params.id, req.body);
            if (year_id) await N_YearService.linkToDocument(year_id, req.params.id);
            return res.json(HttpResponse.success('Cập nhật tài liệu thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async delete(req, res) {
        try {
            await N_DocumentService.delete(req.params.id);
            return res.json(HttpResponse.success('Xóa tài liệu thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const document = await N_DocumentService.getDetail(id);
            if (!document) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy tài liệu'));
            }
            return res.json(HttpResponse.success('Lấy chi tiết tài liệu thành công', document));
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
                    { text: keyword }
                ]
            };
            const data = await N_DocumentService.paginate({ page: +page, pageSize: +size, query: filter });
            return res.json(HttpResponse.success('Lấy danh sách tài liệu thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new DocumentController();