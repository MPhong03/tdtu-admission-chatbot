const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Nhóm ngành
const GroupSchema = new mongoose.Schema({
    ...BaseFields,
}, {
    timestamps: true
});

module.exports = mongoose.model("Group", GroupSchema);