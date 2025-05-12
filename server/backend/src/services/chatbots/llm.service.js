const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const axios = require('axios');
const { pipeline, AutoTokenizer } = require('@xenova/transformers');
const { cosineSimilarity } = require('../../utils/calculator.util');

require('dotenv').config();

// === Hằng số mô hình ===
const MODEL_ID = process.env.LLM_MODEL_ID || '';

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
        this.nerModel = null;
        this.nerInitPromise = null;
    }

    // === NER ===

    async initNER() {
        if (this.nerModel) return;

        if (!this.nerInitPromise) {
            this.nerInitPromise = (async () => {
                console.log("🟡 Warming up NER pipeline...");

                const timeout = setTimeout(() => {
                    console.warn("⏳ NER warmup taking too long...");
                }, 15000);

                this.nerModel = await pipeline('token-classification', MODEL_ID, {
                    use_onnx: true,
                    quantized: false,
                });

                clearTimeout(timeout);
                console.log("🟢 NER pipeline is ready.");
            })();
        }

        return this.nerInitPromise;
    }

    async inferNER(text) {
        await this.initNER();
        const results = await this.nerModel(text);
        return results.map(r => ({ token: r.word, label: r.entity }));
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
            const res = await axios.post(`${this.geminiApi}?key=${this.apiKey}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });
            return res.data.candidates?.[0]?.content?.parts?.[0]?.text || this.fallbackMessage;
        } catch (err) {
            console.error("Gemini Generate Error:", err.message);
            return this.fallbackMessage;
        }
    }
}

module.exports = new LLMService();