const mongoose = require("mongoose"); 
const ElasticService = require("../services/chatbots/elastic.service");
const llmService = require("../services/chatbots/llm.service");

class ElasticController {
    // async getAvailableTypes(req, res) {
    //     const types = ElasticService.getAvailableTypes();
    //     res.json({ types });
    // }

    // async createIndex(req, res) {
    //     const { type } = req.params;
    //     const result = await ElasticService.createIndex(type);
    //     res.json(result);
    // }

    // async deleteIndex(req, res) {
    //     const { type } = req.params;
    //     const result = await ElasticService.deleteIndex(type);
    //     res.json(result);
    // }

    // async addData(req, res) {
    //     const { type } = req.params;
    //     const data = req.body;
    //     const result = await ElasticService.addData(type, data);
    //     res.json(result);
    // }

    // async search(req, res) {
    //     const { type } = req.params;
    //     const { query } = req.query;
    //     const result = await ElasticService.search(type, query);
    //     res.json(result);
    // }

    // async getAllData(req, res) {
    //     const { type } = req.params;
    //     const result = await ElasticService.getAllData(type);
    //     res.json(result);
    // }

    // // FROM JSON
    // async addDataFromJson(req, res) {
    //     const { type } = req.params;
    //     const data = [];
    
    //     if (!Array.isArray(req.body)) {
    //         return res.status(400).json({
    //             Code: -1,
    //             Message: "Dữ liệu truyền vào phải là một mảng JSON"
    //         });
    //     }
    
    //     for (const item of req.body) {
    //         if (type === "majorProgramme" && item.content) {
    //             for (const [key, value] of Object.entries(item.content)) {
    //                 const normalizedKey = key
    //                     .toLowerCase()
    //                     .replace(/[^a-z0-9]/gi, '_')
    //                     .replace(/_+/g, '_')
    //                     .replace(/^_|_$/g, '');
    //                 item[normalizedKey] = value;
    //             }
    //         }
    
    //         if (!item._id) {
    //             item.id = new mongoose.Types.ObjectId().toString(); // dùng new + toString
    //         } else {
    //             item.id = item._id.toString(); // dùng lại id cũ nếu có
    //         }
    //         delete item._id;
    
    //         data.push(item);
    //     }
    
    //     try {
    //         const result = await ElasticService.addData(type, data);
    //         return res.json(result);
    //     } catch (error) {
    //         return res.status(500).json({
    //             Code: -1,
    //             Message: `Lỗi khi index dữ liệu: ${error.message}`
    //         });
    //     }
    // }

    // // VECTOR SEARCH
    // async searchByVector(req, res) {
    //     const { type } = req.params;
    //     const { query } = req.query;
    //     const result = await ElasticService.searchByVector(type, query);
    //     res.json(result);
    // }
}

module.exports = new ElasticController();
