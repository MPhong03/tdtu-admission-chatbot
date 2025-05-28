const LLMService = require("../chatbots/llm.service");

class EntityRecognizer {
    /**
     * Phân tích thực thể trong câu hỏi bằng mô hình ONNX
     * @param {string} question
     * @returns {Array} danh sách thực thể: {token, label}
     */
    async recognizeEntities(question) {
        try {
            const rawEntities = await LLMService.inferNER(question);

            const entities = [];
            let current = null;

            for (const { token, label } of rawEntities) {
                const cleanLabel = label.replace(/^B-/, '').replace(/^I-/, '');

                if (label.startsWith('B-') || !current || current.label !== cleanLabel) {
                    if (current) entities.push(current);

                    current = { name: token, label: cleanLabel };
                } else if (label.startsWith('I-') && current && current.label === cleanLabel) {
                    current.name += ' ' + token;
                } else {
                    if (current) entities.push(current);
                    current = { name: token, label: cleanLabel };
                }
            }

            if (current) entities.push(current);

            return entities;
        } catch (err) {
            console.error("EntityRecognizer Error:", err);
            return [];
        }
    }

    /**
     * Phân tích thực thể và mối quan hệ trong câu hỏi bằng API NER mới
     * @param {string} question
     * @returns {Object} { entities: Array, relationships: Array }
     */
    async recognizeEntities_V2(question) {
        try {
            const response = await LLMService.inferNER_V2(question);
            const entities = response.entities.map(entity => ({
                name: entity.name,
                label: entity.label,
                score: entity.score,
                start: entity.start,
                end: entity.end
            }));
            const relationships = response.relationships.map(rel => ({
                relation: rel.relation,
                score: rel.score
            }));

            console.debug('[EntityRecognizer] Recognized entities:', entities);
            console.debug('[EntityRecognizer] Recognized relationships:', relationships);

            return { entities, relationships };
        } catch (err) {
            console.error('[EntityRecognizer] Error:', err.message);
            return { entities: [], relationships: [] };
        }
    }
}

module.exports = new EntityRecognizer();