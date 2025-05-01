const LLMService = require('../../services/chatbots/llm.service');
const nlp = require('compromise');

class PhraseExtractor {
    generateCandidatePhrases(words) {
        const candidates = [];
        for (let size = 5; size >= 2; size--) {
            for (let i = 0; i <= words.length - size; i++) {
                const phrase = words.slice(i, i + size).join(' ').trim();
                candidates.push(phrase);
            }
        }
        return candidates;
    }

    /**
     * Hybrid Extract: vừa sliding window, vừa check entity match
     */
    async extractPhrases(question, entityNames) {
        const lower = question.toLowerCase().replace(/[.,!?]/g, ' ');
        const words = lower.split(/\s+/);
        const candidates = this.generateCandidatePhrases(words);

        const matchedPhrases = [];

        for (const phrase of candidates) {
            for (const entityName of entityNames) {
                const entityLower = entityName.toLowerCase();
                if (entityLower.includes(phrase) || phrase.includes(entityLower)) {
                    matchedPhrases.push(phrase);
                }
            }
        }

        const unique = [...new Set(matchedPhrases)].sort((a, b) => b.split(' ').length - a.split(' ').length);
        return unique;
    }
}

module.exports = new PhraseExtractor();