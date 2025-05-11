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

}

module.exports = new EntityRecognizer();