const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const axios = require('axios');
const { pipeline, AutoTokenizer } = require('@xenova/transformers');
const { cosineSimilarity } = require('../../utils/calculator.util');
const logger = require('../../utils/logger.util');
const CommonRepo = require('../../repositories/systemconfigs/common.repository');

require('dotenv').config();

class LLMService {
    constructor() {
        // Embed + Gemini
        this.llmapi = process.env.LLM_API || "http://localhost:8000";
        this.geminiApi = process.env.GEMINI_API_URL || "http://localhost:8000";
        this.apiKey = process.env.GEMINI_API_KEY;

        this.embeddingModel = null;
        this.fallbackMessage = `**Xin lỗi bạn nhé, hiện tại hệ thống đang quá tải nên chưa thể phản hồi chính xác.**
        
👉 Bạn có thể liên hệ trực tiếp với bộ phận tư vấn tuyển sinh qua:

- **Fanpage TDTU**: [https://www.facebook.com/tonducthanguniversity](https://www.facebook.com/tonducthanguniversity)
- **Hotline**: 1900 2024 (nhấn phím 2)
- **Email**: [tuyensinh@tdtu.edu.vn](mailto:tuyensinh@tdtu.edu.vn)

_Cảm ơn bạn đã thông cảm!_`;

        // NER
        this.embeddingModel = null;
        // this.nerModel = null; // Comment: Không cần nerModel cục bộ
        // this.nerInitPromise = null; // Comment: Không cần nerInitPromise
        this.nerApi = process.env.NER_API || 'http://localhost:8000'; // Địa chỉ API FastAPI
    }

    // === LOAD CONFIG ===
    async loadGeminiConfig() {
        // Nếu đã có cấu hình trong env thì ưu tiên dùng
        if (!process.env.GEMINI_API_URL || !process.env.GEMINI_API_KEY) {
            const config = await CommonRepo.getValues(['gemini_api_url', 'gemini_api_key']);

            if (!this.geminiApi && config.gemini_api_url) {
                this.geminiApi = config.gemini_api_url;
                logger.info(`Loaded geminiApi: ${this.geminiApi}`);
            }

            if (!this.apiKey && config.gemini_api_key) {
                this.apiKey = config.gemini_api_key;
                logger.info(`Loaded Gemini API key`);
            }
        }
    }

    // === NER ===

    async initNER() {
        // Không cần khởi tạo pipeline cục bộ, chỉ kiểm tra NER_API
        if (!this.nerApi) {
            throw new Error('NER_API environment variable is not set');
        }
        logger.info(`## NER API is configured at ${this.nerApi}`);
    }

    async inferNER(text) {
        // await this.initNER();
        // const results = await this.nerModel(text);
        // return results.map(r => ({ token: r.word, label: r.entity }));

        try {
            const response = await axios.post(`${this.nerApi}/ner`, { text }, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data.entities.map(entity => ({
                token: entity.word,
                label: entity.entity_group
            }));
        } catch (err) {
            console.error('NER API Error:', err.message);
            throw new Error(`Failed to call NER API: ${err.message}`);
        }
    }

    /**
     * Gọi API NER để nhận diện thực thể và mối quan hệ
     * @param {string} text - Văn bản đầu vào
     * @returns {Object} - { entities: Array, relationships: Array }
     * @throws {Error} - Nếu gọi API thất bại hoặc dữ liệu không hợp lệ
     */
    async inferNER_V2(text) {
        try {
            // Kiểm tra input
            if (!text || typeof text !== 'string' || text.trim() === '') {
                console.warn('[LLMService] Invalid input text:', text);
                throw new Error('Input text must be a non-empty string');
            }

            console.debug('[LLMService] Calling NER API with text:', text);

            // Gọi API NER
            const response = await axios.post(
                `${this.nerApi}/ner`,
                { text },
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Kiểm tra response
            if (!response.data || !response.data.entities || !response.data.relationships) {
                console.error('[LLMService] Invalid NER API response:', response.data);
                throw new Error('NER API returned invalid or incomplete data');
            }

            // Ánh xạ entities
            const entities = response.data.entities.map(entity => ({
                name: entity.text,
                label: entity.label,
                score: entity.score,
                start: entity.start,
                end: entity.end
            }));

            // Ánh xạ relationships
            const relationships = response.data.relationships.map(rel => ({
                relation: rel.relation,
                score: rel.score
            }));

            console.debug('[LLMService] NER API response processed:', { entities, relationships });

            return { entities, relationships };
        } catch (err) {
            console.error('[LLMService] NER API Error:', err.message);
            throw new Error(`Failed to call NER API: ${err.message}`);
        }
    }

    // === EMBEDDING ===

    async initEmbeddingModel() {
        if (!this.embeddingModel) {
            this.embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
    }

    async getEmbedding(text) {
        try {
            const res = await axios.post(`${this.llmapi}/embedding`, { text });
            return res.data.embedding;
        } catch (err) {
            console.error("Embedding Error:", err);
            return null;
        }
    }

    async getEmbeddingV2(text) {
        try {
            await this.initEmbeddingModel();
            const output = await this.embeddingModel(text, {
                pooling: 'mean',
                normalize: true
            });
            return Array.isArray(output.data) ? output.data : Object.values(output.data);
        } catch (err) {
            console.error("Embedding Error (NodeJS):", err);
            return null;
        }
    }

    async compareSimilarity(source, targets = []) {
        try {
            const res = await axios.post(`${this.llmapi}/similarity`, { source, targets });
            return res.data.scores;
        } catch (err) {
            console.error("Similarity Error:", err);
            return [];
        }
    }

    async compareSimilarityV2(source, targets = []) {
        try {
            await this.initEmbeddingModel();
            const [sourceEmbedding, ...targetEmbeddings] = await Promise.all([
                this.embeddingModel(source, { pooling: 'mean', normalize: true }),
                ...targets.map(t =>
                    this.embeddingModel(t, { pooling: 'mean', normalize: true })
                )
            ]);

            const sourceVec = sourceEmbedding.data;
            return targetEmbeddings.map(te => cosineSimilarity(sourceVec, te.data));
        } catch (err) {
            console.error("Similarity Error:", err);
            return [];
        }
    }

    // === GEMINI ===

    async generateAnswer(prompt) {
        try {
            await this.loadGeminiConfig();
            
            const res = await axios.post(`${this.geminiApi}?key=${this.apiKey}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;

            return {
                answer: text || this.fallbackMessage,
                isError: !text
            };
        } catch (err) {
            console.error("Gemini Generate Error:", err.message);
            return {
                answer: this.fallbackMessage,
                isError: true
            };
        }
    }
}

module.exports = new LLMService();