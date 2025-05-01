const LLMService = require("../../services/chatbots/llm.service");
const { cosineSimilarity } = require("../../utils/calculator.util");

async function scoreIntent(questionEmbedding, intentSamples, sampleEmbeddingsMap, threshold = 0.7) {
    const matches = [];

    for (const intent of intentSamples) {
        const embeddings = sampleEmbeddingsMap[intent.intent] || [];
        const scores = embeddings.map(e => cosineSimilarity(questionEmbedding, e));
        const maxScore = Math.max(...scores);

        if (maxScore >= threshold) {
            matches.push({
                intent: intent.intent,
                fields: intent.fields,
                score: maxScore
            });
        }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
}

module.exports = { scoreIntent };