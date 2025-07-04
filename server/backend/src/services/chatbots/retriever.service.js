const EntityRecognizer = require('../regconizers/entity.regconizer');
const IntentRecognizer = require('../regconizers/intent.regconizer');
const RetrieverQueryBuilder = require('../builders/retrieverquery.builder');
const LLMService = require('./llm.service');
const { scoreContextRelevance } = require('../../helpers/improvements/context.scoring');
const PromptBuilder = require('../../helpers/improvements/prompt.builder');
const elasticService = require('./elastic.service');

class RetrieverService {
    /**
     * Nhận diện thực thể và lấy context relevance.
     * @param {string} question
     * @returns {Object} {entities, contextNodes}
     */
    async processQuestion(question) {
        // Step 1: Nhận diện thực thể
        console.time("Entity recognition");
        const rawEntities = await EntityRecognizer.recognizeEntities(question);
        console.timeEnd("Entity recognition");

        // Ẩn trường embedding (deep clone nếu cần)
        const entities = rawEntities.map(({ embedding, ...rest }) => rest);

        // Step 2: Truy vấn dữ liệu liên quan
        console.time("Retrieve related nodes");
        const rawContext = await RetrieverQueryBuilder.retrieve(entities);
        console.timeEnd("Retrieve related nodes");

        // // Step 3: Score context relevance
        // console.time("Score context relevance");
        // const contextNodes = await scoreContextRelevance(question, rawContext, 10); // top 5
        // console.timeEnd("Score context relevance");

        return { entities, contextNodes: rawContext };
    }

    /**
     * Nhận diện thực thể, mối quan hệ và lấy context relevance (phiên bản V2)
     * @param {string} question
     * @returns {Object} { entities, relationships, contextNodes }
     */
    async processQuestion_V2(question) {
        console.time('Entity recognition');
        const { entities, intent } = await EntityRecognizer.recognizeEntities_V2(question);
        console.timeEnd('Entity recognition');

        // Kiểm tra relationships: chỉ cần tồn tại và không rỗng
        // if (!Array.isArray(relationships) || relationships.length === 0) {
        //     console.warn('[RetrieverService] No valid relationships found. Skipping retrieval.');
        //     return { entities, relationships, contextNodes: [] };
        // }

        // Truy vấn kết hợp Neo4j và Elasticsearch tăng khả năng hiểu
        console.time('Retrieve context');

        let kgContext = await RetrieverQueryBuilder.retrieve_V3({ entities, intent });

        let textContext = [];
        try {
            const elasticResults = await elasticService.searchDocuments(question, 'semantic', 5, 'documents');
            textContext = elasticResults.map(doc => ({
                name: doc.title || '',
                content: doc.content,
            }));
        } catch (err) {
            console.error('[RetrieverService] Elastic search failed:', err);
        }

        const contextNodes = [...kgContext, ...textContext].slice(0, 20); // tối đa 20 node

        console.timeEnd('Retrieve context');

        return { entities, intent, contextNodes };
    }

    /**
     * Tổng pipeline lấy context dữ liệu từ câu hỏi
     * @param {string} question
     * @returns {Object} {
     *   question: string,
     *   entities: Array,
     *   relationships: Array,
     *   contextNodes: Array
     * }
     */
    async retrieveContext(question) {
        try {
            const { entities, intent, contextNodes } = await this.processQuestion_V2(question);

            // Có thể bổ sung kiểm tra fallback nếu không có contextNodes

            return {
                question,
                entities,
                intent,
                contextNodes
            };
        } catch (err) {
            console.error('[RetrieverService] Error in retrieveContext:', err);
            throw err;
        }
    }

    /**
     * Trả lời câu hỏi bằng chatbot dựa trên context đã lấy
     * @param {string} question
     * @returns {Object} { prompt, answer, contextNodes }
     */
    async chatWithBot(question) {
        console.time("Total chatWithBot");

        const { entities, intent, contextNodes } = await this.processQuestion_V2(question);

        if (!contextNodes.length) {
            const fallbackPrompt = `Bạn là chatbot tuyển sinh. Hiện không có thông tin từ hệ thống.
                                    Câu hỏi: ${question}
                                    Hãy trả lời khéo léo và giữ thái độ thân thiện, tránh việc trả lời bịa đặt.`;

            console.time("Gemini generate answer (fallback)");
            const { answer, isError } = await LLMService.generateAnswer(fallbackPrompt);
            console.timeEnd("Gemini generate answer (fallback)");

            console.timeEnd("Total chatWithBot");
            return { prompt: fallbackPrompt, answer, isError };
        }

        const prompt = require('../../helpers/improvements/prompt.builder').build(question, contextNodes);

        console.time("Gemini generate answer (with context)");
        const { answer, isError } = await LLMService.generateAnswer(prompt);
        console.timeEnd("Gemini generate answer (with context)");

        console.timeEnd("Total chatWithBot");

        return { prompt, answer, contextNodes, isError };
    }
}

module.exports = new RetrieverService();
