const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Bài viết
const ArticleSchema = new mongoose.Schema({
    tags: [String],
    title: String,
    content: String,
}, {
    timestamps: true
});

module.exports = mongoose.model("Article", ArticleSchema);