// ScenarioService.js
const Scenario = require("../../models/chatbots/scenario.model");
const BaseRepository = require("../../repositories/common/base.repository");
const { cosineSimilarity } = require("../../utils/calculator.util");

const ScenarioRepo = new BaseRepository(Scenario);
const LLMService = require("..//chatbots/llm.service");

class ScenarioService {
    /** Lấy toàn bộ kịch bản */
    async getAll() {
        return ScenarioRepo.getAll();
    }

    async getPagination(filter = {}, page = 1, size = 10) {
        return ScenarioRepo.paginate(filter, page, size);
    }

    /** Lấy 1 kịch bản theo ID */
    async getById(id) {
        return ScenarioRepo.getById(id);
    }

    /** Tạo mới kịch bản */
    async create(data) {
        const combinedText = data.questionExamples.join(" ");
        const embedding = await LLMService.getEmbeddingV2(combinedText);
        return ScenarioRepo.create({ ...data, embedding });
    }

    /** Cập nhật kịch bản */
    async update(id, data) {
        const combinedText = data.questionExamples.join(" ");
        const embedding = await LLMService.getEmbeddingV2(combinedText);
        return ScenarioRepo.update(id, { ...data, embedding });
    }

    /** Xoá kịch bản */
    async delete(id) {
        return ScenarioRepo.delete(id);
    }

    /**
     * Tìm kịch bản phù hợp nhất với câu hỏi
     * @param {string} question
     * @param {number} threshold - Ngưỡng cosine để accept
     * @returns {Promise<Scenario|null>}
     */
    async findMatchingScenario(question, threshold = 0.8) {
        const questionEmbedding = await LLMService.getEmbeddingV2(question);
        if (!questionEmbedding) return null;

        const activeScenarios = await this.model.find({ isActive: true }).lean();

        let bestMatch = null;
        let bestScore = threshold;

        for (const scenario of activeScenarios) {
            for (const sample of scenario.sampleQuestions) {
                const score = cosineSimilarity(questionEmbedding, sample.embedding);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = scenario;
                }
            }
        }

        return bestMatch;
    }
}

module.exports = new ScenarioService();
