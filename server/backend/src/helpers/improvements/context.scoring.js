const LLMService = require("../../services/chatbots/llm.service");

async function scoreContextRelevance(question, nodes, topN = 10, minScore = 0.5) {
    const targets = nodes.map(
        (node) => `${node.name} ${node.tab || ""}`.trim()
    );

    const scores = await LLMService.compareSimilarityV2(question, targets);

    return nodes
        .map((node, idx) => ({ ...node, _score: scores[idx] }))
        .sort((a, b) => b._score - a._score)
        .filter((n) => n._score >= minScore)
        .slice(0, topN);
}

module.exports = { scoreContextRelevance };