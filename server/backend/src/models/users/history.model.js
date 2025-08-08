const mongoose = require("mongoose");

// Lịch sử - các tin nhắn Q&A của người dùng
const HistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    visitorId: { type: String },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    status: {
        type: String,
        enum: ['success', 'unanswered', 'error'],
        default: 'success'
    },
    cypher: { type: String, default: '' },
    contextNodes: { type: String, default: '' }, // JSON string
    // Bổ sung các trường enrichment và phân loại
    questionType: { type: String, enum: ['inappropriate', 'off_topic', 'simple_admission', 'complex_admission'], default: 'simple_admission' },
    enrichmentSteps: { type: Number, default: 0 },
    enrichmentDetails: { type: String, default: '' }, // JSON string: log từng bước enrichment
    contextScore: { type: Number, default: 0 }, // Điểm context cuối cùng
    contextScoreHistory: { type: [Number], default: [] }, // Mảng điểm context từng bước
    adminAnswer: { type: String, default: '' }, // Trả lời của admin nếu có
    adminAnswerAt: { type: Date, default: null },
    isAdminReviewed: { type: Boolean, default: false }, // Đã được admin xem hay chưa
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Admin đã trả lời
}, {
    timestamps: true
});

module.exports = mongoose.model("History", HistorySchema);