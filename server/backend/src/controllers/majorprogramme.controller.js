const MajorProgrammeService = require('../services/major-programme.service');
const HttpResponse = require('../data/responses/http.response');

class MajorProgrammeController {
    // Tạo chương trình ngành-hệ
    async create(req, res) {
        try {
            const result = await MajorProgrammeService.create(req.body);
            res.json(HttpResponse.success("Tạo chương trình ngành-hệ thành công", result));
        } catch (err) {
            res.json(HttpResponse.error("Tạo chương trình ngành-hệ thất bại", -1, err.message));
        }
    }

    // Lấy danh sách ngành-hệ
    async getAll(req, res) {
        try {
            const result = await MajorProgrammeService.getAll();
            res.json(HttpResponse.success("Danh sách ngành-hệ", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi lấy ngành-hệ", -1, err.message));
        }
    }

    // Lấy ngành-hệ theo id
    async getById(req, res) {
        try {
            const result = await MajorProgrammeService.getById(req.params.id);
            res.json(HttpResponse.success("Thông tin ngành-hệ", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi lấy ngành-hệ", -1, err.message));
        }
    }

    // Xóa ngành-hệ
    async delete(req, res) {
        try {
            await MajorProgrammeService.delete(req.params.id);
            res.json(HttpResponse.success("Xóa ngành-hệ thành công"));
        } catch (err) {
            res.json(HttpResponse.error("Xóa ngành-hệ thất bại", -1, err.message));
        }
    }
}

module.exports = new MajorProgrammeController();