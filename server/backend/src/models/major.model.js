const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Ngành đào tạo
const MajorSchema = new mongoose.Schema({
    // Trường có điểm chung
    ...BaseFields,
    advantage: { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model("Major", MajorSchema);