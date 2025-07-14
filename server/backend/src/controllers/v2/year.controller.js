const {
    N_YearService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');

class YearController {
    async create(req, res) {
        try {
            await N_YearService.create(req.body);
            return res.json(HttpResponse.success('Tạo năm học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async update(req, res) {
        try {
            await N_YearService.update(req.params.id, req.body);
            return res.json(HttpResponse.success('Cập nhật năm học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async delete(req, res) {
        try {
            await N_YearService.delete(req.params.id);
            return res.json(HttpResponse.success('Xóa năm học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const detail = await N_YearService.getDetail(id);
            if (!detail) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy năm học'));
            }
            return res.json(HttpResponse.success('Lấy chi tiết năm học thành công', detail));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async list(req, res) {
        try {
            const { page = 1, size = 10, keyword } = req.query;
            const filter = {
                name: keyword
            };
            const data = await N_YearService.paginate({ page: +page, pageSize: +size, query: filter });
            return res.json(HttpResponse.success('Lấy danh sách năm học thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new YearController();