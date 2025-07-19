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
    adminAnswer: { type: String, default: '' }, // Trả lời của admin nếu có
    adminAnswerAt: { type: Date, default: null },
    isAdminReviewed: { type: Boolean, default: false }, // Đã được admin xem hay chưa
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Admin đã trả lời
}, {
    timestamps: true
});

module.exports = mongoose.model("History", HistorySchema);