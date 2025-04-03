const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Tài liệu
const DocumentSchema = new mongoose.Schema({
    tags: [String],
    title: String,
    content: String,
    fileUrl: String,
    year: Number,
}, {
    timestamps: true
});

module.exports = mongoose.model("Document", DocumentSchema);