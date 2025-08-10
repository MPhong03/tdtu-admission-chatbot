const mongoose = require("mongoose");

// Lịch sử - các tin nhắn Q&A của người dùng
const HistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    visitorId: { type: String },
    question: { type: String, required: true },
    answer: { type: String, required: true },

    // === TRẠNG THÁI CHI TIẾT ===
    status: {
        type: String,
        enum: ['success', 'incorrect_answer', 'unanswered', 'error'],
        default: 'success'
    },
    
    // === PHÂN LOẠI LỖI CHI TIẾT ===
    errorType: {
        type: String,
        enum: [
            'none',                    // Không có lỗi
            'system_error',            // Lỗi hệ thống (database, network...)
            'api_rate_limit',          // Lỗi rate limit từ Gemini API (429)
            'api_timeout',             // Lỗi timeout từ Gemini API
            'api_quota_exceeded',      // Lỗi quota exceeded
            'api_authentication',      // Lỗi authentication với API
            'cypher_error',            // Lỗi truy vấn Cypher
            'context_not_found',       // Không tìm thấy context phù hợp
            'validation_error',        // Lỗi validation
            'unknown'                  // Lỗi không xác định
        ],
        default: 'none'
    },
    
    // === THÔNG TIN LỖI CHI TIẾT ===
    errorDetails: {
        message: { type: String, default: '' },
        code: { type: String, default: '' },
        stack: { type: String, default: '' },
        retryCount: { type: Number, default: 0 },
        lastRetryAt: { type: Date, default: null }
    },
    
    // Thông tin cơ bản về cypher và context
    cypher: { type: String, default: '' },
    contextNodes: { type: String, default: '' }, // JSON string
    
    // Thông tin admin
    adminAnswer: { type: String, default: '' },
    adminAnswerAt: { type: Date, default: null },
    isAdminReviewed: { type: Boolean, default: false },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // === THÔNG TIN PHÂN LOẠI CÂU HỎI ===
    questionType: { 
        type: String, 
        enum: ['inappropriate', 'off_topic', 'simple_admission', 'complex_admission'], 
        default: 'simple_admission' 
    },
    
    // Confidence score của việc phân loại
    classificationConfidence: { type: Number, default: 0 },
    classificationReasoning: { type: String, default: '' },
    
    // === THÔNG TIN ENRICHMENT CHO COMPLEX QUESTIONS ===
    enrichmentSteps: { type: Number, default: 0 },
    enrichmentDetails: { type: String, default: '' }, // JSON string: chi tiết từng bước enrichment
    
    // === THÔNG TIN ĐÁNH GIÁ CONTEXT ===
    contextScore: { type: Number, default: 0 }, // Điểm context cuối cùng (0-1)
    contextScoreHistory: { type: [Number], default: [] }, // Mảng điểm context từng bước
    contextScoreReasons: { type: [String], default: [] }, // Lý do đánh giá từng bước
    
    // === THÔNG TIN AGENT PROCESSING (CHO COMPLEX) ===
    agentSteps: { type: String, default: '' }, // JSON string: chi tiết các bước agent đã thực hiện
    processingMethod: { 
        type: String, 
        enum: ['rag_simple', 'agent_complex', 'rule_based', 'llm_social', 'fallback'],
        default: 'rag_simple'
    },
    
    // === ENRICHMENT CYPHER QUERIES ===
    enrichmentQueries: { type: [String], default: [] }, // Danh sách các cypher queries đã dùng cho enrichment
    enrichmentResults: { type: [Number], default: [] }, // Số lượng kết quả từ mỗi enrichment query
    
    // === THÔNG TIN PERFORMANCE ===
    processingTime: { type: Number, default: 0 }, // Thời gian xử lý (giây)
    
    // === THÔNG TIN VERIFICATION ===
    isVerified: { type: Boolean, default: false }, // Đã được verify bởi LLM chưa
    verificationScore: { type: Number, default: 0 }, // Điểm verify (0-1)
    verificationReason: { type: String, default: '' }, // Lý do verify
    verificationResult: {
        type: String,
        enum: ['correct', 'incorrect', 'pending', 'skipped'],
        default: 'pending'
    }
}, {
    timestamps: true
});

HistorySchema.index({ createdAt: -1 });
HistorySchema.index({ questionType: 1 });
HistorySchema.index({ status: 1 });
HistorySchema.index({ errorType: 1 });
HistorySchema.index({ verificationResult: 1 });
HistorySchema.index({ contextScore: 1 });

module.exports = mongoose.model("History", HistorySchema);