const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const ElasticRepository = require("../repositories/elastic.repository");
const { convertSchemaToElasticMapping } = require("../utils/elastic.util");
const HttpResponse = require("../data/responses/http.response");
const llmService = require("./llm.service");
const { group } = require("console");

// Cấu hình schema (type → schema Mongoose)
const SCHEMA_MAP = {
    group: require("../models/group.model"),
    major: require("../models/major.model"),
    programme: require("../models/programme.model"),
    majorProgramme: require("../models/majorprgramme.model"),
    document: require("../models/document.model"),
    article: require("../models/article.model")
};

class ElasticService {
    getAvailableTypes() {
        return Object.keys(SCHEMA_MAP);
    }

    getIndexName(type) {
        if (!SCHEMA_MAP[type]) return null;
        return `kag_${type}`;
    }

    async ensureIndexExists(type) {
        const indexName = this.getIndexName(type);
        if (!indexName) return HttpResponse.error(`Không tìm thấy schema cho loại '${type}'.`);

        const exists = await ElasticRepository.checkIndexExists(indexName);
        if (!exists) {
            return await this.createIndex(type);
        }
        return HttpResponse.success(`Index '${indexName}' đã tồn tại.`);
    }

    async createIndex(type) {
        try {
            const schema = SCHEMA_MAP[type];
            if (!schema) return HttpResponse.error(`Schema '${type}' không tồn tại.`);

            const indexName = this.getIndexName(type);
            const mapping = convertSchemaToElasticMapping(schema);

            await ElasticRepository.createIndexWithMapping(indexName, mapping);
            return HttpResponse.success(`Index '${indexName}' đã được tạo.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi tạo index '${type}': ${error.message}`);
        }
    }

    async deleteIndex(type) {
        try {
            const indexName = this.getIndexName(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            const success = await ElasticRepository.deleteIndex(indexName);
            return success
                ? HttpResponse.success(`Index '${indexName}' đã được xóa.`)
                : HttpResponse.error(`Index '${indexName}' không tồn tại.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi xóa index '${type}': ${error.message}`);
        }
    }

    async addData(type, data) {
        try {
            const indexName = this.getIndexName(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);
    
            await this.ensureIndexExists(type);
    
            const enrichedData = await Promise.all(data.map(async (doc) => {
                const id = doc._id || doc.id || new mongoose.Types.ObjectId().toString();
                delete doc._id;
    
                if (!doc.embedding) {
                    const text = `${doc.name || ""} ${doc.description || ""} ${(doc.tag || []).join(" ")}`;
                    const embedding = await llmService.getEmbedding(text);
                    if (embedding) {
                        doc.embedding = embedding;
                    }
                }
    
                return { ...doc, id };
            }));
    
            await ElasticRepository.addData(indexName, enrichedData);
            return HttpResponse.success(`Dữ liệu đã được thêm vào '${indexName}' thành công.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi thêm dữ liệu vào '${type}': ${error.message}`);
        }
    }

    async search(type, query, fields = ["*"], from = 0, size = 10) {
        try {
            const indexName = this.getIndexName(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            const results = await ElasticRepository.search(indexName, query, fields, from, size);
            return HttpResponse.success("Kết quả tìm kiếm:", results);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi tìm kiếm trong '${type}': ${error.message}`);
        }
    }

    // VECTOR SEARCH
    async searchByVector(type, queryText, size = 5) {
        try {
            const indexName = this.getIndexName(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);
    
            // Lấy embedding từ văn bản truy vấn
            const embedding = await llmService.getEmbedding(queryText);
            if (!embedding) return HttpResponse.error("Không tạo được vector embedding từ truy vấn.");
    
            // Gọi tìm kiếm vector
            const results = await ElasticRepository.searchByVector(indexName, embedding, size);
            return HttpResponse.success("Kết quả tìm kiếm bằng vector:", results);
        } catch (error) {
            return HttpResponse.error(`Lỗi tìm kiếm vector cho '${type}': ${error.message}`);
        }
    }    

    async getAllData(type) {
        try {
            const indexName = this.getIndexName(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            const data = await ElasticRepository.getAllData(indexName);
            return HttpResponse.success(`Dữ liệu từ '${indexName}':`, data);
        } catch (error) {
            return HttpResponse.error(error.message);
        }
    }
}

module.exports = new ElasticService();