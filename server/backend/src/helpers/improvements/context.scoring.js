const LLMService = require("../../services/chatbots/llm.service");
const { cosineSimilarity } = require("../../utils/calculator.util");

/**
 * Chấm điểm mức độ liên quan giữa context node và câu hỏi
 * @param {string} question
 * @param {Array} contextNodes
 * @param {number} limit
 * @returns {Array}
 */
async function scoreContextRelevance(question, contextNodes = [], limit = 5, recognizedEntities = []) {
    if (!contextNodes.length) return [];

    const questionEmbedding = await LLMService.getEmbeddingV2(question);
    if (!questionEmbedding) return contextNodes.slice(0, limit);

    const recognizedIds = new Set(recognizedEntities.map(e => `${e.label}-${e.id}`));
    const recognizedMajors = recognizedEntities.filter(e => e.label === 'Major').map(e => e.name.toLowerCase());
    const recognizedTabs = recognizedEntities.filter(e => e.label === 'MajorProgramme').map(e => e.tab?.toLowerCase()).filter(Boolean);

    const combinedTexts = contextNodes.map(node => [
        node.name,
        node.description || '',
        ...Object.entries(node.content || {}).map(([k, v]) => `${k}: ${v}`)
    ].join(' '));

    const embeddings = await Promise.all(combinedTexts.map(text => LLMService.getEmbeddingV2(text)));

    const scored = contextNodes.map((node, i) => {
        let score = 0;

        const nodeKey = `${node.label}-${node.id}`;
        const cosineScore = cosineSimilarity(questionEmbedding, embeddings[i] || []);

        // Rule 1: Nếu là entity đã recognize → cực kỳ liên quan
        if (recognizedIds.has(nodeKey)) score += 1.0;

        // Rule 2: Nếu là MajorProgramme và tên trùng Major → boost
        if (node.label === 'MajorProgramme' && recognizedMajors.includes(node.name.toLowerCase())) {
            score += 0.5;
        }

        // Rule 3: Nếu là Programme và tên trùng tab của MajorProgramme
        if (node.label === 'Programme' && recognizedTabs.includes(node.name.toLowerCase())) {
            score += 0.3;
        }

        // Rule 4: Cosine similarity vẫn giữ để fine-tune
        score += 0.4 * cosineScore; // chỉ lấy một phần ảnh hưởng

        return {
            ...node,
            _score: score
        };
    });

    return scored
        .filter(n => !isNaN(n._score))
        .sort((a, b) => b._score - a._score)
        .slice(0, limit);
}

module.exports = { scoreContextRelevance };