const mongoose = require("mongoose");

// Thư mục có thể chứa nhiều đoạn chat khác nhau
const FolderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("Folder", FolderSchema);