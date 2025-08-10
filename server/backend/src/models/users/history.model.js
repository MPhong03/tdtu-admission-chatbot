const mongoose = require("mongoose");

// Lịch sử - các tin nhắn Q&A của người dùng
const HistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    visitorId: { type: String },
    question: { 
        type: String, 
        required: true,
        maxlength: 10000 // Giới hạn 10KB
    },
    answer: { 
        type: String, 
        required: true,
        maxlength: 30000 // Giới hạn 30KB
    },
    
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
    cypher: { 
        type: String, 
        default: '',
        maxlength: 10000 // Giới hạn 10KB
    },
    contextNodes: { 
        type: String, 
        default: '', // JSON string
        maxlength: 20000 // Giới hạn 20KB
    },
    
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
    classificationReasoning: { 
        type: String, 
        default: '',
        maxlength: 5000 // Giới hạn 5KB
    },
    
    // === THÔNG TIN ENRICHMENT CHO COMPLEX QUESTIONS ===
    enrichmentSteps: { type: Number, default: 0 },
    enrichmentDetails: { 
        type: String, 
        default: '', // JSON string: chi tiết từng bước enrichment
        maxlength: 20000 // Giới hạn 20KB
    },
    
    // === THÔNG TIN ĐÁNH GIÁ CONTEXT ===
    contextScore: { type: Number, default: 0 }, // Điểm context cuối cùng (0-1)
    contextScoreHistory: { type: [Number], default: [] }, // Mảng điểm context từng bước
    contextScoreReasons: { type: [String], default: [] }, // Lý do đánh giá từng bước
    
    // === THÔNG TIN AGENT PROCESSING (CHO COMPLEX) ===
    agentSteps: { 
        type: String, 
        default: '', // JSON string: chi tiết các bước agent đã thực hiện
        maxlength: 30000 // Giới hạn 30KB
    },
    processingMethod: { 
        type: String, 
        enum: ['rag_simple', 'agent_complex', 'rule_based', 'llm_social', 'fallback'],
        default: 'rag_simple'
    },
    
    // === ENRICHMENT CYPHER QUERIES ===
    enrichmentQueries: { 
        type: [String], 
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 50; // Giới hạn tối đa 50 queries
            },
            message: 'Enrichment queries cannot exceed 50 items'
        }
    },
    enrichmentResults: { 
        type: [Number], 
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 50; // Giới hạn tối đa 50 results
            },
            message: 'Enrichment results cannot exceed 50 items'
        }
    },
    
    // === THÔNG TIN PERFORMANCE ===
    processingTime: { type: Number, default: 0 }, // Thời gian xử lý (giây)
    
    // === THÔNG TIN VERIFICATION ===
    isVerified: { type: Boolean, default: false }, // Đã được verify bởi LLM chưa
    verificationScore: { type: Number, default: 0 }, // Điểm verify (0-1)
    verificationReason: { 
        type: String, 
        default: '', // Lý do verify
        maxlength: 5000 // Giới hạn 5KB
    },
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
HistorySchema.index({ chatId: 1, createdAt: -1 }); // Cho getChatHistory
HistorySchema.index({ userId: 1, createdAt: -1 }); // Cho user history
HistorySchema.index({ visitorId: 1, createdAt: -1 }); // Cho visitor history
HistorySchema.index({ processingMethod: 1 }); // Cho analytics
HistorySchema.index({ isVerified: 1 }); // Cho verification stats

// Middleware để log kích thước document
HistorySchema.pre('save', function(next) {
    try {
        const docSize = JSON.stringify(this.toObject()).length;
        const maxSize = 16 * 1024 * 1024; // 16MB MongoDB limit
        
        if (docSize > maxSize * 0.8) { // Warning at 80% of limit
            console.warn(`[History] Document size warning: ${(docSize / 1024 / 1024).toFixed(2)}MB (${(docSize / maxSize * 100).toFixed(1)}% of limit)`);
        }
        
        if (docSize > maxSize) {
            console.error(`[History] Document too large: ${(docSize / 1024 / 1024).toFixed(2)}MB exceeds MongoDB limit`);
            return next(new Error(`Document size ${(docSize / 1024 / 1024).toFixed(2)}MB exceeds MongoDB 16MB limit`));
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("History", HistorySchema);