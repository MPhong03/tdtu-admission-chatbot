const { cosineSimilarity } = require('../../utils/calculator.util');
const LLMService = require('../../services/chatbots/llm.service');

class PhraseMatcher {
    /**
     * @param {Array} phrases - List of extracted phrases
     * @param {Array} candidates - All entity nodes with embedding
     * @param {Array} detectedMajors
     * @param {Array} detectedProgrammes
     */
    async matchPhrasesToEntities(phrases, candidates, detectedMajors = [], detectedProgrammes = []) {
        const allResults = [];

        for (const phrase of phrases) {
            const phraseEmbedding = await LLMService.getEmbeddingV2(phrase);
            if (!phraseEmbedding) continue;

            const scored = candidates.map(c => {
                let score = cosineSimilarity(phraseEmbedding, c.embedding);

                // Exact match boost
                if (phrase.trim().toLowerCase() === c.name.toLowerCase()) {
                    score += 0.3;
                } else if (phrase.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(phrase.toLowerCase())) {
                    score += 0.05;
                }

                return { ...c, similarity: score };
            });

            const strongMatches = scored.filter(c => c.similarity >= 0.5);
            allResults.push(...strongMatches);
        }

        // Giữ best per ID
        const unique = {};
        for (const r of allResults) {
            if (!unique[r.id] || unique[r.id].similarity < r.similarity) {
                unique[r.id] = r;
            }
        }

        let allMatches = Object.values(unique);

        // Boost mạnh nếu MajorProgramme đúng cả Major + Programme
        if (detectedMajors.length && detectedProgrammes.length) {
            allMatches = allMatches.map(item => {
                if (item.label === 'MajorProgramme') {
                    const matchMajor = detectedMajors.includes(item.name);
                    const matchProgramme = detectedProgrammes.includes(item.tab);
                    if (matchMajor && matchProgramme) {
                        return { ...item, similarity: item.similarity + 0.5 };
                    }
                }
                return item;
            });
        }

        // Group by label
        const grouped = allMatches.reduce((acc, item) => {
            if (!acc[item.label]) acc[item.label] = [];
            acc[item.label].push(item);
            return acc;
        }, {});

        const finalResults = [];
        const topPerLabel = {
            MajorProgramme: 2,
            Major: 1,
            Programme: 1,
            Group: 1
        };

        for (const [label, items] of Object.entries(grouped)) {
            const topItems = items
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topPerLabel[label] || 1); // default fallback = 1
            finalResults.push(...topItems);
        }

        return finalResults.sort((a, b) => b.similarity - a.similarity);
    }
}

module.exports = new PhraseMatcher();
