const mongoose = require("mongoose");

// Các đoạn chat của người dùng
const ChatSchema = new mongoose.Schema({
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("Chat", ChatSchema);