const ElasticService = require("../services/elastic.service");

class ElasticController {
    async getTemplates(req, res) {
        const templates = ElasticService.getAvailableTemplates();
        res.json({ templates });
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
        const { indexName } = req.params;
        const result = await ElasticService.getAllData(indexName);
        res.json(result);
    }    
}

module.exports = new ElasticController();
