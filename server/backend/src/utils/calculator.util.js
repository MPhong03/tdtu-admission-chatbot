/**
 * Tính cosine similarity giữa hai vector
 */
function cosineSimilarity(vec1, vec2) {
    const dot = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const normA = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
}

module.exports = { cosineSimilarity };