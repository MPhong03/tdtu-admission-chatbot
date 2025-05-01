const { pipeline } = require('@xenova/transformers');
const axios = require("axios");

class LLMService {
    constructor() {
        this.llmapi = process.env.LLM_API || "http://localhost:8000";
        this.geminiApi = process.env.GEMINI_API_URL || "http://localhost:8000";
        this.apiKey = process.env.GEMINI_API_KEY;
        this.embeddingModel = null;
    }

    async init() {
        if (!this.embeddingModel) {
            this.embeddingModel = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2'
            );
        }
    }

    // Gọi local API để lấy embedding vector
    async getEmbedding(text) {
        try {
            const res = await axios.post(`${this.llmapi}/embedding`, { text });
            return res.data.embedding;
        } catch (err) {
            console.error("Embedding Error:", err);
            return null;
        }
    }

    // Trích xuất embedding vector từ text
    async getEmbeddingV2(text) {
        try {
            await this.init();
            const output = await this.embeddingModel(text, {
                pooling: 'mean',
                normalize: true
            });
            return Array.isArray(output.data)
                ? output.data
                : Object.values(output.data);
        } catch (err) {
            console.error("Embedding Error (NodeJS):", err);
            return null;
        }
    }

    // Gọi local API để tính similarity giữa 1 câu với nhiều câu
    async compareSimilarity(source, targets = []) {
        try {
            const res = await axios.post(`${this.llmapi}/similarity`, { source, targets });
            return res.data.scores;
        } catch (err) {
            console.error("Similarity Error:", err);
            return [];
        }
    }

    // So sánh 1 câu với danh sách nhiều câu
    async compareSimilarityV2(source, targets = []) {
        try {
            await this.init();

            const [sourceEmbedding, ...targetEmbeddings] = await Promise.all([
                this.embeddingModel(source, { pooling: 'mean', normalize: true }),
                ...targets.map(t =>
                    this.embeddingModel(t, { pooling: 'mean', normalize: true })
                )
            ]);

            const sourceVec = sourceEmbedding.data;
            const results = targetEmbeddings.map(te => cosineSimilarity(sourceVec, te.data));
            return results;
        } catch (err) {
            console.error("Similarity Error:", err);
            return [];
        }
    }

    // Gọi local API để tìm thấy entity trong text - KHÔNG SỬ DỤNG
    async analyzeEntity(text) {
        try {
            const res = await axios.post(`${this.llmapi}/analyze`, { text });
            return res.data.entities;
        } catch (err) {
            console.error("Analyze Error:", err);
            return [];
        }
    }

    // Tạo câu trả lời từ prompt qua Gemini API
    /**
     * 
     * @param {
        "contents": [{
            "parts":[{"text": "Explain how AI works"}]
            }]
        } 
     * @returns "Text"
     */
    async generateAnswer(prompt) {
        try {
            const res = await axios.post(`${this.geminiApi}?key=${this.apiKey}`, {
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            });
            return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "[Không có câu trả lời]";
        } catch (err) {
            console.error("Gemini Generate Error:", err);
            return "[Lỗi tạo câu trả lời]";
        }
    }
}

module.exports = new LLMService();