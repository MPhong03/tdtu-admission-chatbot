const mongoose = require("mongoose");

// Thông báo
const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    visitorId: { type: String },
    historyId: { type: mongoose.Schema.Types.ObjectId, ref: 'History', required: false }, // Nếu liên quan tới câu hỏi cụ thể
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: false }, // Nếu liên quan tới chat
    type: {
        type: String,
        enum: ['admin_reply', 'system', 'info'],
        required: true
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model("Notification", NotificationSchema);