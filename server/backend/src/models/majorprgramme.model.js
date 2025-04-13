const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Thông tin ngành theo hệ
const MajorProgrammeSchema = new mongoose.Schema({
    // Trường có điểm chung
    ...BaseFields,
    majorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true },
    programmeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Programme', required: true },
    code: { type: String, required: true },
    content: {
        type: Map,
        of: String
    }
}, {
    timestamps: true,
    strict: false
});

module.exports = mongoose.model("MajorProgramme", MajorProgrammeSchema);