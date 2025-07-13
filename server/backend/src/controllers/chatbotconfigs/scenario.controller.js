const HttpResponse = require("../../data/responses/http.response");
const ScenarioService = require("../../services/chatbots/scenario.service");

class ScenarioController {
    // async createScenario(req, res) {
    //     try {
    //         const scenario = await ScenarioService.createScenario(req.body);
    //         res.json(HttpResponse.success("Tạo scenario thành công", scenario));
    //     } catch (err) {
    //         console.error(err);
    //         res.json(HttpResponse.error("Tạo scenario thất bại", -1, err.message));
    //     }
    // }

    // async getScenarios(req, res) {
    //     try {
    //         const scenarios = await ScenarioService.getScenarios(req.query);
    //         res.json(HttpResponse.success("Nhận kết quả", scenarios));
    //     } catch (err) {
    //         console.error(err);
    //         res.json(HttpResponse.error("Lấy danh sách scenario thất bại", -1, err.message));
    //     }
    // }

    // async getScenario(req, res) {
    //     try {
    //         const scenario = await ScenarioService.getScenarioById(req.params.id);
    //         res.json(HttpResponse.success("Nhận kết quả", scenario));
    //     } catch (err) {
    //         console.error(err);
    //         res.json(HttpResponse.error("Lấy scenario thất bại", -1, err.message));
    //     }
    // }

    // async updateScenario(req, res) {
    //     try {
    //         const scenario = await ScenarioService.updateScenario(req.params.id, req.body);
    //         res.json(HttpResponse.success("Cập nhật scenario thành công", scenario));
    //     } catch (err) {
    //         console.error(err);
    //         res.json(HttpResponse.error("Cập nhật scenario thất bại", -1, err.message));
    //     }
    // }

    // async deleteScenario(req, res) {
    //     try {
    //         await ScenarioService.deleteScenario(req.params.id);
    //         res.json(HttpResponse.success("Xóa scenario thành công"));
    //     } catch (err) {
    //         console.error(err);
    //         res.json(HttpResponse.error("Xóa scenario thất bại", -1, err.message));
    //     }
    // }
}

module.exports = new ScenarioController();
