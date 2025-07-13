const ProgrammeService = require('../services/chatbots/programme.service');
const HttpResponse = require('../data/responses/http.response');

class ProgrammeController {
    // // Tạo hệ đào tạo
    // async create(req, res) {
    //     try {
    //         const result = await ProgrammeService.create(req.body);
    //         res.json(HttpResponse.success("Tạo hệ đào tạo thành công", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Tạo hệ đào tạo thất bại", -1, err.message));
    //     }
    // }

    // // Lấy danh sách hệ đào tạo
    // async getAll(req, res) {
    //     try {
    //         const result = await ProgrammeService.getAll();
    //         res.json(HttpResponse.success("Danh sách hệ đào tạo", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Lỗi lấy hệ đào tạo", -1, err.message));
    //     }
    // }

    // // Lấy hệ đào tạo theo id
    // async getById(req, res) {
    //     try {
    //         const result = await ProgrammeService.getById(req.params.id);
    //         res.json(HttpResponse.success("Thông tin hệ đào tạo", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Lỗi lấy hệ đào tạo", -1, err.message));
    //     }
    // }

    // // Xóa hệ đào tạo
    // async delete(req, res) {
    //     try {
    //         await ProgrammeService.delete(req.params.id);
    //         res.json(HttpResponse.success("Xóa hệ đào tạo thành công"));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Xóa hệ đào tạo thất bại", -1, err.message));
    //     }
    // }
}

module.exports = new ProgrammeController();