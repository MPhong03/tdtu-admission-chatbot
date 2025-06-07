const elasticService = require("../services/chatbots/elastic.service");

class ElasticController {
    /**
     * Tạo mới một index trên Elasticsearch.
     * Nếu index chưa tồn tại, sẽ tạo mới với mapping chuẩn.
     * Query param: index (tuỳ chọn, mặc định là 'documents')
     */
    async createIndex(req, res) {
        try {
            const index = req.query.index || undefined;
            await elasticService.createIndex(index);
            res.status(200).json({ message: `Index created or already exists${index ? `: ${index}` : ""}` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Lưu một tài liệu vào Elasticsearch, sẽ tự động chunk theo câu.
     * Body: { title, content } hoặc { docId, title, content }
     * Query param: index (tuỳ chọn, mặc định là 'documents')
     */
    async saveDocument(req, res) {
        // docId là tùy chọn
        const { docId, title, content } = req.body;
        const index = req.query.index || undefined;
        try {
            const result = await elasticService.saveDocument(docId, title, content, index);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Lấy toàn bộ các chunk của một tài liệu theo docId.
     * Route param: docId
     * Query param: index (tuỳ chọn, mặc định là 'documents')
     */
    async getDocument(req, res) {
        const { docId } = req.params;
        const index = req.query.index || undefined;
        try {
            const result = await elasticService.getDocument(docId, index);
            res.status(200).json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    /**
     * Lấy toàn bộ dữ liệu của một index (tối đa 1000 documents/chunks).
     * Query param: index (tùy chọn, mặc định là 'documents'), size (tùy chọn)
     */
    async getAllDocuments(req, res) {
        const index = req.query.index || undefined;
        const size = req.query.size ? Number(req.query.size) : 1000;
        try {
            const result = await elasticService.getAllDocuments(index, size);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Trả về danh sách các index hiện có trong Elasticsearch.
     */
    async listIndices(req, res) {
        try {
            const indices = await elasticService.listIndices();
            res.status(200).json(indices);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Cập nhật tài liệu (xóa toàn bộ chunk cũ và lưu lại chunk mới).
     * Route param: docId
     * Body: { title, content }
     * Query param: index (tuỳ chọn, mặc định là 'documents')
     */
    async updateDocument(req, res) {
        const { docId } = req.params;
        const { title, content } = req.body;
        const index = req.query.index || undefined;
        try {
            const result = await elasticService.updateDocument(docId, title, content, index);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Xóa toàn bộ chunk của một tài liệu theo docId.
     * Route param: docId
     * Query param: index (tuỳ chọn, mặc định là 'documents')
     */
    async deleteDocument(req, res) {
        const { docId } = req.params;
        const index = req.query.index || undefined;
        try {
            const result = await elasticService.deleteDocument(docId, index);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Tìm kiếm tài liệu (theo từ khoá, semantic, hybrid, custom cosine).
     * Query string: query, searchType, size, index (index tuỳ chọn)
     */
    async searchDocuments(req, res) {
        const { query, searchType, size } = req.query;
        const index = req.query.index || undefined;
        try {
            const result = await elasticService.searchDocuments(query, searchType, Number(size) || 5, index);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new ElasticController();