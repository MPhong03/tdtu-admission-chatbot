const { cosineSimilarity } = require('../../utils/calculator.util');
const LLMService = require('../../services/chatbots/llm.service');

class PhraseMatcher {
    /**
     * @param {Array} phrases - List of extracted phrases
     * @param {Array} candidates - All entity nodes with embedding
     * @param {Array} detectedMajors - IDs of Majors already detected (optional)
     */
    async matchPhrasesToEntities(phrases, candidates, detectedMajors = [], detectedProgrammes = []) {
        const results = [];

        for (const phrase of phrases) {
            const phraseEmbedding = await LLMService.getEmbeddingV2(phrase);
            if (!phraseEmbedding) continue;

            const scored = candidates.map(c => {
                let baseScore = cosineSimilarity(phraseEmbedding, c.embedding);

                // Boost theo loại entity
                if (c.label === 'MajorProgramme') baseScore += 0.15;
                else if (c.label === 'Major') baseScore += 0.10;
                else if (c.label === 'Programme') baseScore += 0.05;
                else if (c.label === 'Group') baseScore += 0;

                // Exact match boost cực mạnh
                if (phrase.trim().toLowerCase() === c.name.toLowerCase()) {
                    baseScore += 0.3;
                }
                // Partial match boost nhẹ
                else if (phrase.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(phrase)) {
                    baseScore += 0.02;
                }

                return { ...c, similarity: baseScore };
            });

            const strongMatches = scored.filter(c => c.similarity >= 0.75);
            results.push(...strongMatches);
        }

        // Aggregate matches
        const unique = {};
        for (const r of results) {
            if (!unique[r.id] || unique[r.id].similarity < r.similarity) {
                unique[r.id] = r;
            }
        }

        let allMatches = Object.values(unique);

        // boost mạnh nếu MajorProgramme đúng Major.name + Programme.name
        if (detectedMajors.length > 0 && detectedProgrammes.length > 0) {
            allMatches = allMatches.map(item => {
                if (item.label === 'MajorProgramme') {
                    const matchMajor = detectedMajors.includes(item.name);  // Major.name == MajorProgramme.name
                    const matchProgramme = detectedProgrammes.includes(item.tab); // Programme.name == MajorProgramme.tab
                    if (matchMajor && matchProgramme) {
                        return { ...item, similarity: item.similarity + 0.5 }; // Boost cực mạnh
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

        // Select top N per label
        const finalResults = [];

        const topPerLabel = {
            MajorProgramme: 2,
            Major: 1,
            Programme: 1,
            Group: 1
        };

        for (const [label, items] of Object.entries(grouped)) {
            const topItems = items.sort((a, b) => b.similarity - a.similarity);
            finalResults.push(...topItems);
        }

        return finalResults.sort((a, b) => b.similarity - a.similarity);
    }
}

module.exports = new PhraseMatcher();
