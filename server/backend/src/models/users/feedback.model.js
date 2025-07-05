const mongoose = require("mongoose");

// Feedback của từng đoạn tin nhắn
const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    historyId: { type: mongoose.Schema.Types.ObjectId, ref: 'History', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    cypher: { type: String, default: '' },
    contextNodes: { type: String, default: '' }, // JSON string
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    comment: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending',
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Feedback", FeedbackSchema);