const elasticClient = require("../configs/elastic.config");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

class ElasticRepository {
    async createIndexWithMapping(indexName, mapping) {
        try {
            const exists = await elasticClient.indices.exists({ index: indexName });
            if (!exists) {
                await elasticClient.indices.create({
                    index: indexName,
                    body: {
                        mappings: {
                            properties: mapping
                        }
                    }
                });
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
            const body = await elasticClient.indices.exists({ index: indexName });
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
            const body = data.flatMap(doc => {
                const id = doc.id || uuidv4();
                delete doc.id;

                if (doc.embedding && Array.isArray(doc.embedding)) {
                    doc.embedding = doc.embedding.map(v => parseFloat(v));
                }

                return [{ index: { _index: indexName, _id: id } }, doc];
            });
    
            const bulkResponse = await elasticClient.bulk({ refresh: true, body });
    
            if (bulkResponse.errors) {
                const erroredDocuments = [];
                bulkResponse.items.forEach((action, i) => {
                    const operation = Object.keys(action)[0];
                    const status = action[operation].status;
                    if (status >= 400) {
                        erroredDocuments.push({
                            status,
                            error: action[operation].error,
                            document: data[i]
                        });
                    }
                });
    
                console.error("Lỗi khi bulk insert:", erroredDocuments);
                throw new Error(`Bulk insert encountered errors. Số lỗi: ${erroredDocuments.length}`);
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
                            type: "best_fields",
                            fuzziness: "AUTO",
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

    async searchByVector(indexName, queryVector, size = 3) {
        try {
            const result = await elasticClient.search({
                index: indexName,
                body: {
                    size,
                    query: {
                        script_score: {
                            query: { match_all: {} },
                            script: {
                                source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                params: { query_vector: queryVector }
                            }
                        }
                    }
                }
            });
    
            return result.hits.hits.map(hit => {
                const { embedding, ...rest } = hit._source;  // loại bỏ embedding
                return {
                    ...rest,
                    _score: hit._score
                };
            });            
        } catch (error) {
            throw new Error(`Lỗi vector search: ${error.message}`);
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