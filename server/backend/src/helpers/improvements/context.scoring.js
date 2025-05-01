const LLMService = require("../../services/chatbots/llm.service");
const { cosineSimilarity } = require("../../utils/calculator.util");

async function scoreContextRelevance(question, contextNodes, topK = 5) {
    const questionEmbedding = await LLMService.getEmbeddingV2(question);
    if (!questionEmbedding) return contextNodes;

    const scored = [];

    for (const node of contextNodes) {
        const contentText = [
            node.name,
            node.description,
            ...Object.values(node.fields || {})
        ].join("\n");

        const contentEmbedding = await LLMService.getEmbeddingV2(contentText);
        if (!contentEmbedding) continue;

        const score = cosineSimilarity(questionEmbedding, contentEmbedding);
        scored.push({ ...node, score });
    }

    // Sort theo độ tương đồng giảm dần và lấy topK
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

module.exports = { scoreContextRelevance };