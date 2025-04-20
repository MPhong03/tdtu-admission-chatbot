const Neo4jService = require('../services/neo4j.service');
const HttpResponse = require('../data/responses/http.response');

class ReasoningController {
    async getMajorsByGroup(req, res) {
        try {
            const result = await Neo4jService.findMajorsByGroup(req.params.id);
            res.json(HttpResponse.success("Danh sách ngành theo nhóm ngành", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi khi truy vấn ngành theo nhóm", -1, err.message));
        }
    }

    async getProgrammesByMajor(req, res) {
        try {
            const result = await Neo4jService.findProgrammesByMajor(req.params.id);
            res.json(HttpResponse.success("Danh sách hệ đào tạo theo ngành", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi khi truy vấn hệ đào tạo theo ngành", -1, err.message));
        }
    }

    async getMajorProgrammeByProgramme(req, res) {
        try {
            const result = await Neo4jService.findMajorProgrammeByProgramme(req.params.id);
            res.json(HttpResponse.success("Danh sách ngành-hệ theo hệ đào tạo", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi khi truy vấn ngành-hệ", -1, err.message));
        }
    }

    async getFullPathFromProgramme(req, res) {
        try {
            const result = await Neo4jService.fullPathFromProgramme(req.params.id);
            res.json(HttpResponse.success("Truy xuất toàn bộ chuỗi từ hệ đào tạo", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi khi truy ngược hệ đào tạo", -1, err.message));
        }
    }

    async getFullPathFromMajorProgramme(req, res) {
        try {
            const result = await Neo4jService.fullPathFromMajorProgramme(req.params.id);
            res.json(HttpResponse.success("Truy xuất toàn bộ chuỗi từ ngành-hệ", result));
        } catch (err) {
            res.json(HttpResponse.error("Lỗi khi truy ngược ngành-hệ", -1, err.message));
        }
    }
}

module.exports = new ReasoningController();
