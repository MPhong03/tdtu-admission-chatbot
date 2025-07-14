const {
    N_TuitionService, 
    N_YearService, 
    N_ProgrammeService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');
const { convertHtmlToText } = require('../../utils/calculator.util');

class TuitionController {
    async create(req, res) {
        try {
            const { year_id, programme_id, ...tuition } = req.body;
            if (req.body.content) req.body.text = convertHtmlToText(req.body.content);
            await N_TuitionService.create(tuition);
            if (year_id) await N_TuitionService.linkToYear(tuition.id, year_id);
            if (programme_id) {
                await N_TuitionService.linkToProgramme(tuition.id, programme_id);
                await N_ProgrammeService.linkToTuition(programme_id, tuition.id);
            }
            return res.json(HttpResponse.success('Tạo học phí thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async update(req, res) {
        try {
            const { year_id, programme_id, ...tuition } = req.body;
            if (req.body.content) req.body.text = convertHtmlToText(req.body.content);
            await N_TuitionService.update(req.params.id, req.body);
            if (year_id) await N_TuitionService.linkToYear(tuition.id, year_id);
            if (programme_id) {
                await N_TuitionService.linkToProgramme(tuition.id, programme_id);
                await N_ProgrammeService.linkToTuition(programme_id, tuition.id);
            }
            return res.json(HttpResponse.success('Cập nhật học phí thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async delete(req, res) {
        try {
            await N_TuitionService.delete(req.params.id);
            return res.json(HttpResponse.success('Xóa học phí thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const detail = await N_TuitionService.getDetail(id);
            if (!detail) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy học phí'));
            }
            return res.json(HttpResponse.success('Lấy chi tiết học phí thành công', detail));
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
            const data = await N_TuitionService.paginate({ page: +page, pageSize: +size, query: filter });
            return res.json(HttpResponse.success('Lấy danh sách học phí thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new TuitionController();