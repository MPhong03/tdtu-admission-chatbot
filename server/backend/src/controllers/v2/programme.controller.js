const {
    N_ProgrammeService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');

class ProgrammeController {
    async create(req, res) {
        try {
            await N_ProgrammeService.create(req.body);
            return res.json(HttpResponse.success('Tạo chương trình học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async update(req, res) {
        try {
            await N_ProgrammeService.update(req.params.id, req.body);
            return res.json(HttpResponse.success('Cập nhật chương trình học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async delete(req, res) {
        try {
            await N_ProgrammeService.delete(req.params.id);
            return res.json(HttpResponse.success('Xóa chương trình học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const detail = await N_ProgrammeService.getDetail(id);
            if (!detail) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy chương trình học'));
            }
            return res.json(HttpResponse.success('Lấy chi tiết chương trình học thành công', detail));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async list(req, res) {
        try {
            const { page = 1, pageSize = 10 } = req.query;
            const data = await N_ProgrammeService.paginate({ page: +page, pageSize: +pageSize });
            return res.json(HttpResponse.success('Lấy danh sách chương trình học thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new ProgrammeController();