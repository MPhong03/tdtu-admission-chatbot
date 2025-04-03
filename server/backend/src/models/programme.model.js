const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Hệ đào tạo
const ProgrammeSchema = new mongoose.Schema({
    // Trường có điểm chung
    ...BaseFields
}, {
    timestamps: true
});

module.exports = mongoose.model("Programme", ProgrammeSchema);