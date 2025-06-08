const elasticClient = require("../../configs/elastic.config");
const { cosineSimilarity } = require("../../utils/calculator.util");
const llmService = require("./llm.service");
const { v4: uuidv4 } = require("uuid");

const DEFAULT_INDEX = 'documents';
const DEFAULT_CHUNK_SIZE = 500;

class ElasticService {
    constructor() { }

    /**
     * Tạo index cho Elasticsearch nếu chưa tồn tại.
     * @param {string} index - Tên index muốn khởi tạo (mặc định là 'documents')
     */
    async createIndex(index = DEFAULT_INDEX) {
        try {
            const exists = await elasticClient.indices.exists({ index });
            if (!exists) {
                await elasticClient.indices.create({
                    index,
                    body: {
                        settings: {
                            number_of_shards: 5,
                            number_of_replicas: 1
                        },
                        mappings: {
                            properties: {
                                doc_id: { type: 'keyword' },
                                chunk_id: { type: 'keyword' },
                                title: { type: 'text' },
                                content: { type: 'text', analyzer: 'standard' },
                                embedding: {
                                    type: 'dense_vector',
                                    dims: 384,
                                    index: true,
                                    similarity: 'cosine'
                                },
                                metadata: {
                                    type: 'object',
                                    properties: {
                                        original_doc: { type: 'keyword' },
                                        chunk_order: { type: 'integer' },
                                        created_at: { type: 'date' }
                                    }
                                }
                            }
                        }
                    }
                });
                console.log(`Index ${index} created successfully`);
            }
        } catch (error) {
            console.error('Error creating index:', error);
            throw error;
        }
    }

    /**
     * Chia nhỏ văn bản thành các đoạn theo số từ (ít dùng, ưu tiên splitTextBySentences).
     */
    splitText(text, maxLength = DEFAULT_CHUNK_SIZE) {
        if (!text) return [];
        const words = text.split(/\s+/);
        const chunks = [];
        let chunk = [];
        let len = 0;

        for (const word of words) {
            len += word.length + 1;
            if (len > maxLength) {
                chunks.push(chunk.join(' '));
                chunk = [word];
                len = word.length + 1;
            } else {
                chunk.push(word);
            }
        }
        if (chunk.length) chunks.push(chunk.join(' '));
        return chunks;
    }

    /**
     * Chia nhỏ văn bản thành các đoạn theo số câu.
     */
    splitTextBySentences(text, maxSentences = 20) {
        if (!text) return [];
        const sentences = text.match(/[^.!?。？！]+[.!?。？！]+/g) || [text];
        const chunks = [];
        for (let i = 0; i < sentences.length; i += maxSentences) {
            const chunk = sentences.slice(i, i + maxSentences).join(' ').trim();
            if (chunk) chunks.push(chunk);
        }
        return chunks;
    }

    /**
     * Lưu một tài liệu vào Elasticsearch.
     * Nếu không truyền docId, sẽ tự động sinh mã docId (uuid).
     * @param {string|undefined} docId - ID của tài liệu (nếu không truyền sẽ tự sinh)
     * @param {string} title - Tiêu đề tài liệu
     * @param {string} content - Nội dung tài liệu
     * @param {string} index - Tên index muốn lưu (mặc định là 'documents')
     * @returns {Promise<object>} - Kết quả chứa doc_id và số lượng chunk đã lưu
     */
    async saveDocument(docId, title, content, index = DEFAULT_INDEX) {
        // Tự động sinh docId nếu không truyền
        if (!docId) docId = uuidv4();
        if (!title || !content) throw new Error("title and content are required");
        const chunks = this.splitTextBySentences(content);
        if (!chunks.length) throw new Error("Content too short or invalid");
        const docs = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await llmService.getEmbeddingV2(chunk);
            if (!embedding) throw new Error(`Failed to generate embedding for chunk ${i}`);
            docs.push({
                index: { _index: index, _id: `${docId}_chunk${i}` }
            });
            docs.push({
                doc_id: docId,
                chunk_id: `${docId}_chunk${i}`,
                title,
                content: chunk,
                embedding,
                metadata: {
                    original_doc: docId,
                    chunk_order: i,
                    created_at: new Date().toISOString()
                }
            });
        }
        const bulkResponse = await elasticClient.bulk({ refresh: true, body: docs });
        if (bulkResponse.errors) {
            const erroredDocuments = [];
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                    erroredDocuments.push({
                        status: action[operation].status,
                        error: action[operation].error,
                        operation: docs[i * 2],
                        document: docs[i * 2 + 1],
                    });
                }
            });
            console.error("Bulk errors:", JSON.stringify(erroredDocuments, null, 2));
            throw new Error("Failed to save all document chunks");
        }
        return { doc_id: docId, chunk_count: chunks.length, index };
    }

    /**
     * Lấy tất cả các chunk của một tài liệu dựa trên docId.
     * @param {string} docId
     * @param {string} index - Tên index muốn truy vấn (mặc định là 'documents')
     */
    async getDocument(docId, index = DEFAULT_INDEX) {
        if (!docId) throw new Error("docId is required");
        const response = await elasticClient.search({
            index,
            body: {
                query: { term: { doc_id: docId } },
                sort: [{ 'metadata.chunk_order': 'asc' }]
            }
        });
        const hits = response.hits.hits;
        if (!hits.length) throw new Error("Document not found");
        return {
            doc_id: docId,
            title: hits[0]._source.title,
            chunks: hits.map(hit => ({
                chunk_id: hit._source.chunk_id,
                content: hit._source.content,
                chunk_order: hit._source.metadata.chunk_order
            }))
        };
    }

    /**
     * Lấy toàn bộ dữ liệu (tất cả các documents/chunks) của 1 index.
     * @param {string} index - Tên index muốn lấy dữ liệu
     * @param {number} size - Số lượng tối đa (default 1000)
     * @returns {Promise<object[]>}
     */
    async getAllDocuments(index = DEFAULT_INDEX, size = 1000) {
        const response = await elasticClient.search({
            index,
            body: {
                query: { match_all: {} },
                size
            }
        });
        return response.hits.hits.map(hit => {
            let source = hit._source;
            return {
                doc_id: source.doc_id,
                chunk_id: source.chunk_id,
                title: source.title,
                content: source.content,
                metadata: source.metadata
            }
        });
    }

    /**
     * Lấy danh sách các index hiện có trong Elasticsearch.
     * @returns {Promise<string[]>}
     */
    async listIndices() {
        // Chỉ lấy các index không phải index hệ thống (không bắt đầu bằng ".")
        const catIndices = await elasticClient.cat.indices({ format: "json" });
        return catIndices
            .map(idx => idx.index)
            .filter(name => !name.startsWith('.'));
    }

    /**
     * Cập nhật nội dung tài liệu.
     */
    async updateDocument(docId, title, content, index = DEFAULT_INDEX) {
        await this.deleteDocument(docId, index);
        return this.saveDocument(docId, title, content, index);
    }

    /**
     * Xóa toàn bộ các chunk của một tài liệu dựa vào docId.
     */
    async deleteDocument(docId, index = DEFAULT_INDEX) {
        if (!docId) throw new Error("docId is required");
        await elasticClient.deleteByQuery({
            index,
            body: { query: { term: { doc_id: docId } } }
        });
        return { doc_id: docId, deleted: true, index };
    }

    /**
     * Tìm kiếm tài liệu với các chế độ: keyword, semantic, hybrid, custom_cosine.
     * @param {string} query
     * @param {string} searchType
     * @param {number} size
     * @param {string} index - Tên index muốn search (mặc định là 'documents')
     */
    async searchDocuments(query, searchType = "semantic", size = 10, index = DEFAULT_INDEX) {
        if (!query) throw new Error("Query is required");
        let searchQuery;
        if (searchType === "keyword") {
            searchQuery = {
                query: { match: { content: { query, analyzer: "standard" } } },
                size
            };
        } else if (searchType === "semantic" || searchType === "hybrid" || searchType === "custom_cosine") {
            const queryEmbedding = await llmService.getEmbeddingV2(query);
            if (!queryEmbedding) throw new Error("Failed to generate query embedding");
            if (searchType === "semantic") {
                searchQuery = {
                    query: {
                        script_score: {
                            query: { match_all: {} },
                            script: {
                                source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                params: { query_vector: queryEmbedding }
                            }
                        }
                    },
                    size
                };
            } else if (searchType === "hybrid") {
                searchQuery = {
                    query: {
                        bool: {
                            should: [
                                { match: { content: { query, analyzer: "standard" } } },
                                {
                                    script_score: {
                                        query: { match_all: {} },
                                        script: {
                                            source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                            params: { query_vector: queryEmbedding }
                                        }
                                    }
                                }
                            ],
                            minimum_should_match: 1
                        }
                    },
                    size
                };
            } else if (searchType === "custom_cosine") {
                // Manual cosine search
                const response = await elasticClient.search({
                    index,
                    body: {
                        query: { match_all: {} },
                        size: 1000
                    }
                });
                const hits = response.hits.hits;
                return hits
                    .map(hit => ({
                        doc_id: hit._source.doc_id,
                        chunk_id: hit._source.chunk_id,
                        title: hit._source.title,
                        content: hit._source.content,
                        score: cosineSimilarity(queryEmbedding, hit._source.embedding),
                        metadata: hit._source.metadata
                    }))
                    .filter(result => result.score > 0.5)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, size);
            }
        } else {
            throw new Error('Invalid search type. Use "keyword", "semantic", "hybrid", or "custom_cosine".');
        }

        const response = await elasticClient.search({
            index,
            body: searchQuery
        });
        return response.hits.hits.map(hit => ({
            doc_id: hit._source.doc_id,
            chunk_id: hit._source.chunk_id,
            title: hit._source.title,
            content: hit._source.content,
            score: hit._score,
            metadata: hit._source.metadata
        }));
    }
}

module.exports = new ElasticService();