const mongoose = require("mongoose");

// Cấu hình hệ thống
const CommonSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true, },
    name: { type: String, default: '' }
}, {
    timestamps: true
});

module.exports = mongoose.model("Common", CommonSchema);