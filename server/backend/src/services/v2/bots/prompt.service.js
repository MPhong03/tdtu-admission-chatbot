const fs = require("fs");
const path = require("path");
const logger = require("../../../utils/logger.util");

class PromptService {
    constructor() {
        this.templates = {};
        this.loadTemplates();
    }

    loadTemplates() {
        const configPath = path.join(__dirname, "../../../data/configs/");

        try {
            this.templates = {
                nodeEdgeDescription: fs.readFileSync(path.join(configPath, "data_structure.txt"), "utf-8"),
                cypher: fs.readFileSync(path.join(configPath, "cypher_prompt.txt"), "utf-8"),
                answer: this.loadOrDefault(configPath, "answer_prompt.txt", this.getDefaultAnswerPrompt()),
                classification: this.loadOrDefault(configPath, "classification_prompt.txt", this.getDefaultClassificationPrompt()),
                analysis: this.loadOrDefault(configPath, "analysis_prompt.txt", this.getDefaultAnalysisPrompt()),
                enrichment: this.loadOrDefault(configPath, "enrichment_prompt.txt", this.getDefaultEnrichmentPrompt()),
                batchContextScore: this.getDefaultBatchContextScorePrompt(),
                complexAnswer: this.loadOrDefault(configPath, "complex_answer_prompt.txt", this.getDefaultComplexAnswerPrompt()),
                offTopic: this.loadOrDefault(configPath, "off_topic_prompt.txt", this.getDefaultOffTopicPrompt()),
                social: this.loadOrDefault(configPath, "social_prompt.txt", this.getDefaultSocialPrompt()),
                contextScore: this.loadOrDefault(configPath, "context_scoring_prompt.txt", this.getDefaultContextScorePrompt()),
                verification: this.loadOrDefault(configPath, "verification_prompt.txt", this.getDefaultVerificationPrompt())
            };

            logger.info("[Prompts] Successfully loaded all templates");
        } catch (error) {
            logger.error("[Prompts] Error loading templates, using defaults", error);
            this.loadDefaults();
        }
    }

    loadOrDefault(configPath, filename, defaultContent) {
        const fullPath = path.join(configPath, filename);
        return fs.existsSync(fullPath) 
            ? fs.readFileSync(fullPath, "utf-8")
            : defaultContent;
    }

    loadDefaults() {
        this.templates = {
            nodeEdgeDescription: "Default node edge description",
            cypher: "Default cypher prompt",
            answer: this.getDefaultAnswerPrompt(),
            classification: this.getDefaultClassificationPrompt(),
            analysis: this.getDefaultAnalysisPrompt(),
            enrichment: this.getDefaultEnrichmentPrompt(),
            batchContextScore: this.getDefaultBatchContextScorePrompt(),
            complexAnswer: this.getDefaultComplexAnswerPrompt(),
            offTopic: this.getDefaultOffTopicPrompt(),
            social: this.getDefaultSocialPrompt(),
            contextScore: this.getDefaultContextScorePrompt(),
            verification: this.getDefaultVerificationPrompt()
        };
    }

    getTemplate(name) {
        return this.templates[name] || "";
    }

    buildPrompt(templateName, replacements = {}) {
        let prompt = this.getTemplate(templateName);
        
        // Replace placeholders
        Object.entries(replacements).forEach(([key, value]) => {
            const placeholder = `<${key}>`;
            prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
        });

        // Add data structure for prompts that need it
        if (['cypher', 'classification', 'analysis', 'enrichment'].includes(templateName)) {
            prompt = this.templates.nodeEdgeDescription + '\n\n' + prompt;
        }

        return prompt;
    }

    // Default prompt methods (keeping original logic)
    getDefaultAnswerPrompt() {
        return `
        Bạn là trợ lý tuyển sinh. Dưới đây là ngữ cảnh dữ liệu liên quan, hãy trả lời ngắn gọn, rõ ràng, đúng thông tin nghiệp vụ dựa trên context này. Nếu context rỗng hãy báo không tìm thấy dữ liệu.

        Câu hỏi: <user_question>
        Ngữ cảnh: <context_json>
        `.trim();
    }

    getDefaultClassificationPrompt() {
        return `
        BẠN LÀ CHUYÊN GIA PHÂN LOẠI CÂU HỎI CHO HỆ THỐNG TUYỂN SINH TDTU.
        
        Phân tích câu hỏi: "<user_question>"
        
        Phân loại thành 4 loại:
        1. inappropriate - thô tục/vi phạm
        2. off_topic - không liên quan TDTU
        3. simple_admission - tuyển sinh đơn giản
        4. complex_admission - tuyển sinh phức tạp
        
        Trả về JSON với category, confidence, reasoning.
        `.trim();
    }

    getDefaultAnalysisPrompt() {
        return `
        Phân tích sâu câu hỏi tuyển sinh phức tạp: "<user_question>"
        
        Extract entities, intents, và strategy.
        Trả về JSON format với entities, intent, strategy.
        `.trim();
    }

    getDefaultEnrichmentPrompt() {
        return `
        Quyết định có cần query bổ sung cho: "<user_question>"
        
        Trả về JSON với shouldEnrich, reasoning, cypher.
        `.trim();
    }

    getDefaultBatchContextScorePrompt() {
        return `
        Đánh giá chất lượng context cho nhiều bước xử lý cùng lúc.
        
        Câu hỏi: "<user_question>"
        Các nhóm context: <context_groups>
        
        Đánh giá từng nhóm context theo thang điểm 0-1:
        - 0.0-0.3: Context kém, không đủ thông tin
        - 0.4-0.6: Context trung bình, có thể cần bổ sung
        - 0.7-0.9: Context tốt, đủ thông tin
        - 1.0: Context hoàn hảo
        
        Trả về JSON:
        {
            "scores": [
                {
                    "stepName": "main_query",
                    "score": 0.75,
                    "reasoning": "Context đầy đủ thông tin cơ bản"
                },
                {
                    "stepName": "enrichment_1", 
                    "score": 0.85,
                    "reasoning": "Thông tin bổ sung hữu ích"
                }
            ]
        }
        `.trim();
    }

    getDefaultComplexAnswerPrompt() {
        return `
        Bạn là trợ lý tuyển sinh chuyên nghiệp. Trả lời câu hỏi phức tạp dựa trên context và agent analysis.
        
        Câu hỏi: <user_question>
        Context: <context_json>
        Agent info: <agent_info>
        `.trim();
    }

    getDefaultOffTopicPrompt() {
        return `
        Trả lời thân thiện câu hỏi không liên quan TDTU: "<user_question>"
        
        Hướng dẫn lịch sự về tuyển sinh TDTU.
        `.trim();
    }

    getDefaultSocialPrompt() {
        return `
        Trả lời xã giao thân thiện: "<user_question>"
        
        Giới thiệu vai trò trợ lý tuyển sinh TDTU.
        `.trim();
    }

    getDefaultContextScorePrompt() {
        return `
        Đánh giá mức độ đầy đủ và phù hợp của ngữ cảnh (context) dưới đây để trả lời câu hỏi tuyển sinh:
        Câu hỏi: <user_question>
        Ngữ cảnh: <context_json>
        Hãy trả về một số điểm confidence từ 0 đến 1 (1 là rất tự tin, 0 là không đủ thông tin), kèm reasoning ngắn gọn.
        Đáp án dạng JSON: { "score": <float>, "reasoning": <string> }
        `.trim();
    }

    // ===== NEW: DEFAULT VERIFICATION PROMPT METHOD =====
    getDefaultVerificationPrompt() {
        return `
BẠN LÀ CHUYÊN GIA ĐÁNH GIÁ CHẤT LƯỢNG CÂU TRẢ LỜI CHO HỆ THỐNG TUYỂN SINH TDTU.

Nhiệm vụ: Đánh giá xem câu trả lời của chatbot có CHÍNH XÁC, ĐÚNG NGHIỆP VỤ và PHÙ HỢP với câu hỏi tuyển sinh hay không.

=== THÔNG TIN ĐÁNH GIÁ ===
Câu hỏi người dùng: "<user_question>"
Câu trả lời của chatbot: "<bot_answer>"
Context data từ Neo4j: <context_json>

=== TIÊU CHÍ ĐÁNH GIÁ (100 điểm) ===

1. TÍNH CHÍNH XÁC (40 điểm):
- Thông tin học phí, ngành học, chương trình đào tạo CHÍNH XÁC theo context
- Mã ngành (major_code), năm học, điều kiện xét tuyển ĐÚNG
- KHÔNG bịa đặt thông tin không có trong context
- Số liệu, tên ngành, hệ đào tạo CHÍNH XÁC

2. TÍNH LIÊN QUAN (30 điểm):
- Trả lời ĐÚNG TRỌNG TÂM câu hỏi
- Giải quyết được INTENT CHÍNH của người dùng
- KHÔNG lạc đề, nói chung chung hoặc tránh né
- Nội dung LIÊN QUAN TRỰC TIẾP đến câu hỏi

3. ĐỘ ĐẦY ĐỦ (20 điểm):
- Cung cấp ĐỦ THÔNG TIN để người dùng hiểu rõ
- KHÔNG bỏ sót thông tin QUAN TRỌNG có trong context
- Có hướng dẫn TIẾP THEO nếu cần thiết

4. CHẤT LƯỢNG TRÌNH BÀY (10 điểm):
- Dễ hiểu, có logic, cấu trúc rõ ràng
- Thân thiện, chuyên nghiệp
- Có thông tin LIÊN HỆ TDTU khi cần thiết

=== THANG ĐIỂM CHUẨN ===
- 0.0-0.4: SAI - Có lỗi nghiêm trọng
- 0.5-0.6: KHUYẾT THIẾU - Đúng cơ bản nhưng thiếu thông tin quan trọng
- 0.7-0.8: TỐT - Đúng, đầy đủ cơ bản
- 0.9-1.0: XUẤT SẮC - Hoàn hảo về mọi mặt

Trả về JSON:
{
    "score": 0.85,
    "isCorrect": true,
    "reasoning": "Câu trả lời chính xác và đầy đủ thông tin cần thiết.",
    "issues": [],
    "suggestions": "Có thể bổ sung thêm thông tin liên quan"
}
        `.trim();
    }
}

module.exports = PromptService;