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
}, {
    timestamps: true
});

module.exports = mongoose.model("History", HistorySchema);