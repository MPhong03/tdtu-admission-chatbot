const GroupService = require('../services/chatbots/group.service');
const HttpResponse = require('../data/responses/http.response');

class GroupController {
    // // Tạo nhóm ngành
    // async create(req, res) {
    //     try {
    //         const result = await GroupService.create(req.body);
    //         res.json(HttpResponse.success("Tạo nhóm ngành thành công", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Tạo nhóm ngành thất bại", -1, err.message));
    //     }
    // }

    // // Lấy danh sách nhóm ngành
    // async getAll(req, res) {
    //     try {
    //         const result = await GroupService.getAll();
    //         res.json(HttpResponse.success("Danh sách nhóm ngành", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Lỗi lấy nhóm ngành", -1, err.message));
    //     }
    // }

    // // Lấy nhóm ngành theo id
    // async getById(req, res) {
    //     try {
    //         const result = await GroupService.getById(req.params.id);
    //         res.json(HttpResponse.success("Thông tin nhóm ngành", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Lỗi lấy nhóm ngành", -1, err.message));
    //     }
    // }

    // // Xóa nhóm ngành
    // async delete(req, res) {
    //     try {
    //         await GroupService.delete(req.params.id);
    //         res.json(HttpResponse.success("Xóa nhóm ngành thành công"));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Xóa nhóm ngành thất bại", -1, err.message));
    //     }
    // }

    // // Lấy danh sách ngành trong nhóm
    // async getMajors(req, res) {
    //     try {
    //         const result = await GroupService.getMajors(req.params.id);
    //         res.json(HttpResponse.success("Danh sách ngành thuộc nhóm", result));
    //     } catch (err) {
    //         res.json(HttpResponse.error("Không lấy được danh sách ngành", -1, err.message));
    //     }
    // }
}

module.exports = new GroupController();