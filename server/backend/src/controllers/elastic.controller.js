const ElasticService = require("../services/elastic.service");

class ElasticController {
    async getAvailableTypes(req, res) {
        const types = ElasticService.getAvailableTypes();
        res.json({ types });
    }

    async createIndex(req, res) {
        const { type } = req.params;
        const result = await ElasticService.createIndex(type);
        res.json(result);
    }

    async deleteIndex(req, res) {
        const { type } = req.params;
        const result = await ElasticService.deleteIndex(type);
        res.json(result);
    }

    async addData(req, res) {
        const { type } = req.params;
        const data = req.body;
        const result = await ElasticService.addData(type, data);
        res.json(result);
    }

    async search(req, res) {
        const { type } = req.params;
        const { query } = req.query;
        const result = await ElasticService.search(type, query);
        res.json(result);
    }

    async getAllData(req, res) {
        const { type } = req.params;
        const result = await ElasticService.getAllData(type);
        res.json(result);
    }
}

module.exports = new ElasticController();
