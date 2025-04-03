const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Thông tin ngành theo hệ
const MajorProgrammeSchema = new mongoose.Schema({
    // Trường có điểm chung
    ...BaseFields,
    majorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true },
    programmeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Programme', required: true },
    code: { type: String, required: true },
    degree: { type: String },
    duration: { type: String },
    programme: { type: String },
    outcome: { type: String },
    admission: { type: String },
    nationalExamAdmission: { type: String },
    startTerm: { type: String },
    tuitionFee: { type: String },
}, {
    timestamps: true
});

module.exports = mongoose.model("MajorProgramme", MajorProgramme);