const mongoose = require("mongoose");

// Feedback của từng đoạn tin nhắn
const FeedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    historyId: { type: mongoose.Schema.Types.ObjectId, ref: 'History', required: true },
    answer: { type: Text, required: true },
    content: { type: Text, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("Feedback", FeedbackSchema);