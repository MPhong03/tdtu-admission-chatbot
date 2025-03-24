const elasticClient = require("../configs/elastic.config");
const fs = require("fs");

class ElasticRepository {
    async createIndexTemplate(indexName, template) {
        try {
            await elasticClient.indices.putIndexTemplate({
                name: `${indexName}_template`,
                body: {
                    index_patterns: [`${indexName}*`], // Chỉ định index áp dụng template
                    settings: template.settings,
                    mappings: template.mappings
                }
            });

            console.log(`Index Template '${indexName}_template' đã được tạo.`);
        } catch (error) {
            throw new Error(`Lỗi khi tạo index template: ${error.message}`);
        }
    }

    async createIndex(indexName) {
        try {
            const exists = await elasticClient.indices.exists({ index: indexName });
            if (!exists.body) {
                await elasticClient.indices.create({ index: indexName });
                console.log(`Index '${indexName}' đã được tạo.`);
                return true;
            }
            return false;
        } catch (error) {
            throw new Error(`Lỗi khi tạo index: ${error.message}`);
        }
    }

    async checkIndexExists(indexName) {
        try {
            const { body } = await elasticClient.indices.exists({ index: indexName });
            return body;
        } catch (error) {
            throw new Error(`Error checking index: ${error.message}`);
        }
    }

    async deleteIndex(indexName) {
        try {
            const exists = await this.checkIndexExists(indexName);
            if (exists) {
                await elasticClient.indices.delete({ index: indexName });
                return true;
            }
            return false;
        } catch (error) {
            throw new Error(`Error deleting index: ${error.message}`);
        }
    }

    async addData(indexName, data) {
        try {
            const body = data.flatMap(doc => [{ index: { _index: indexName, _id: doc.id } }, doc]);
            const bulkResponse = await elasticClient.bulk({ refresh: true, body });

            if (bulkResponse.errors) {
                throw new Error("Bulk insert encountered errors.");
            }

            return true;
        } catch (error) {
            throw new Error(`Error adding data: ${error.message}`);
        }
    }

    async search(indexName, query, fields = ["*"], from = 0, size = 10) {
        try {
            const result = await elasticClient.search({
                index: indexName,
                body: {
                    query: {
                        multi_match: {
                            query,
                            fields,
                            fuzziness: "AUTO"
                        }
                    },
                    from,
                    size
                }
            });

            return result.hits.hits.map(hit => hit._source);
        } catch (error) {
            throw new Error(`Error searching: ${error.message}`);
        }
    }

    async getAllData(indexName, size = 1000) {
        try {
            const result = await elasticClient.search({
                index: indexName,
                body: {
                    query: {
                        match_all: {}
                    },
                    size
                }
            });
    
            return result.hits.hits.map(hit => hit._source);
        } catch (error) {
            throw new Error(`Lỗi khi lấy toàn bộ dữ liệu từ '${indexName}': ${error.message}`);
        }
    }    
}

module.exports = new ElasticRepository();
