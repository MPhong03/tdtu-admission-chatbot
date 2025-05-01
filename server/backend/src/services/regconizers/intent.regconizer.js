const { scoreIntent } = require('../../helpers/improvements/intent.scoring');
const { cosineSimilarity } = require('../../utils/calculator.util');
const LLMService = require('../chatbots/llm.service');

class IntentRecognizer {
    constructor() {
        this.intentSamples = [
            {
                intent: 'ask_fee',
                fields: ['Học phí'],
                samples: [
                    'Học phí ngành này bao nhiêu?',
                    'Chi phí đào tạo thế nào?',
                    'Cần đóng bao nhiêu tiền?',
                    'Mức phí học tập là bao nhiêu?'
                ]
            },
            {
                intent: 'ask_degree',
                fields: ['Bằng cấp'],
                samples: [
                    'Bằng cấp sau khi học xong là gì?',
                    'Tốt nghiệp được cấp bằng gì?',
                    'Bằng cấp của chương trình này ra sao?'
                ]
            },
            {
                intent: 'ask_duration',
                fields: ['Thời gian đào tạo'],
                samples: [
                    'Thời gian học bao lâu?',
                    'Chương trình kéo dài mấy năm?',
                    'Thời gian đào tạo ngành này?'
                ]
            },
            {
                intent: 'ask_output',
                fields: ['Chuẩn đầu ra'],
                samples: [
                    'Chuẩn đầu ra là gì?',
                    'Yêu cầu tốt nghiệp như thế nào?',
                    'Cần đạt gì để tốt nghiệp?'
                ]
            },
            {
                intent: 'ask_start_time',
                fields: ['Khai giảng'],
                samples: [
                    'Khi nào khai giảng?',
                    'Thời gian nhập học?',
                    'Chương trình bắt đầu lúc nào?'
                ]
            },
            {
                intent: 'ask_entry_requirements',
                fields: ['Phương thức xét tuyển riêng', 'Xét tuyển theo điểm thi THPT'],
                samples: [
                    'Điều kiện xét tuyển ngành này thế nào?',
                    'Cách thức xét tuyển vào ngành này?',
                    'Yêu cầu đầu vào ra sao?'
                ]
            }
        ];

        this.intentKeywords = {
            "học phí": "ask_fee",
            "chi phí": "ask_fee",
            "bằng cấp": "ask_degree",
            "thời gian học": "ask_duration",
            "kéo dài mấy năm": "ask_duration",
            "chuẩn đầu ra": "ask_output",
            "yêu cầu tốt nghiệp": "ask_output",
            "khai giảng": "ask_start_time",
            "thời gian nhập học": "ask_start_time",
            "xét tuyển": "ask_entry_requirements",
            "điều kiện vào": "ask_entry_requirements",
            "cách thức xét tuyển": "ask_entry_requirements"
        };

        this.threshold = 0.6; // Đặt ngưỡng mềm hơn
        this.cacheEmbeddings = {}; // Để cache embeddings mẫu
    }

    async initEmbeddings() {
        for (const intent of this.intentSamples) {
            if (!this.cacheEmbeddings[intent.intent]) {
                const embeddings = [];

                for (const sample of intent.samples) {
                    try {
                        const embedding = await LLMService.getEmbedding(sample);
                        if (embedding && Array.isArray(embedding)) {
                            embeddings.push(embedding);
                        }
                    } catch (error) {
                        console.error(`Embedding error for sample "${sample}":`, error.message || error);
                        // Continue silently
                    }
                }

                // Chỉ cache nếu thực sự có ít nhất 1 embedding valid
                if (embeddings.length > 0) {
                    this.cacheEmbeddings[intent.intent] = embeddings;
                }
            }
        }
    }

    async recognizeIntent(question) {
        await this.initEmbeddings();
        const lowerQ = question.toLowerCase();
        const questionEmbedding = await LLMService.getEmbedding(question);
        if (!questionEmbedding) return { intents: ["general_info"], fields: [] };

        const matchedIntents = await scoreIntent(
            questionEmbedding,
            this.intentSamples,
            this.cacheEmbeddings,
            this.threshold
        );

        for (const [keyword, mappedIntent] of Object.entries(this.intentKeywords)) {
            if (lowerQ.includes(keyword)) {
                if (!matchedIntents.some(m => m.intent === mappedIntent)) {
                    const fields = this.intentSamples.find(i => i.intent === mappedIntent)?.fields || [];
                    matchedIntents.push({
                        intent: mappedIntent,
                        fields,
                        score: 0.65
                    });
                }
            }
        }

        if (matchedIntents.length === 0) {
            return { intents: ["general_info"], fields: [] };
        }

        matchedIntents.sort((a, b) => b.score - a.score);
        return {
            intents: [...new Set(matchedIntents.map(m => m.intent))],
            fields: [...new Set(matchedIntents.flatMap(m => m.fields))]
        };
    }
}

module.exports = new IntentRecognizer();
