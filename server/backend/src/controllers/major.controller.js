const MajorService = require('../services/chatbots/major.service');
const HttpResponse = require('../data/responses/http.response');

class MajorController {
    // Tạo ngành học
    async create(req, res) {
        try {
            const result = await MajorService.create(req.body);
            res.json(HttpResponse.success("Tạo ngành học thành công", result));
        } catch (err) {
            res.json(HttpResponse.error("Tạo ngành học thất bại", -1, err.message));
        }
    }

    // Lấy danh sách ngành học
    async getAll(req, res) {
        try {
            const result = await MajorService.getAll();
            res.json(HttpResponse.success("Danh sách ngành học", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi lấy ngành học", -1, err.message));
        }
    }

    // Lấy ngành học theo id
    async getById(req, res) {
        try {
            const result = await MajorService.getById(req.params.id);
            res.json(HttpResponse.success("Thông tin ngành học", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi lấy ngành học", -1, err.message));
        }
    }

    // Xóa ngành học
    async delete(req, res) {
        try {
            await MajorService.delete(req.params.id);
            res.json(HttpResponse.success("Xóa ngành học thành công"));
        } catch (err) {
            res.json(HttpResponse.error("Xóa ngành học thất bại", -1, err.message));
        }
    }
}

module.exports = new MajorController();