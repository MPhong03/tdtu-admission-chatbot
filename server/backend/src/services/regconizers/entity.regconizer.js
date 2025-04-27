const { cosineSimilarity } = require("../../utils/calculator.util");
const LLMService = require("../llm.service");
const GroupService = require('../group.service');
const MajorService = require('../major.service');
const ProgrammeService = require('../programme.service');
const MajorProgrammeService = require('../majorprogramme.service');

// Phrase Helper
const PhraseExtractor = require("../../helpers/phrase/phrase.extractor");
const PhraseMatcher = require("../../helpers/phrase/pharse.matcher");

class EntityRecognizer {
    /**
     * Phân tích thực thể trong câu hỏi
     * @param {string} question
     * @returns {entities: Array}
     */
    async recognizeEntities(question) {
        // 1. Load toàn bộ entity candidates từ DB
        const [groups, majors, programmes, majorProgrammes] = await Promise.all([
            GroupService.getAll(),
            MajorService.getAll(),
            ProgrammeService.getAll(),
            MajorProgrammeService.getAll()
        ]);

        const candidates = [...groups, ...majors, ...programmes, ...majorProgrammes]
            .filter(item => item.embedding)
            .map(item => ({
                id: item.id,
                label: item.entityType,
                name: item.name,
                tab: item.tab || '', // thêm tab để dễ liên kết sau
                majorId: item.majorId || '', // nếu cần liên kết
                embedding: item.embedding
            }));

        // 2. Build list entity names để PhraseExtractor dùng
        const entityNames = candidates.map(c => c.name);

        // 3. Extract phrases từ câu hỏi
        const phrases = await PhraseExtractor.extractPhrases(question, entityNames);

        if (phrases.length === 0) {
            phrases.push(question); // fallback nếu không tách được
        }

        // 4. Recognize sơ bộ để detect Major / Programme trước
        const tempRecognizedEntities = await PhraseMatcher.matchPhrasesToEntities(phrases, candidates);

        // 5. Tách detected Major, Programme
        const detectedMajors = tempRecognizedEntities
            .filter(e => e.label === 'Major')
            .map(e => e.name);
        
        const detectedProgrammes = tempRecognizedEntities
            .filter(e => e.label === 'Programme')
            .map(e => e.name);

        // 6. Match final với boost priority
        const finalRecognizedEntities = await PhraseMatcher.matchPhrasesToEntities(
            phrases,
            candidates,
            detectedMajors,
            detectedProgrammes
        );

        return finalRecognizedEntities;
    }
}

module.exports = new EntityRecognizer();