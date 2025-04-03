const mongoose = require("mongoose");
const BaseFields = require('./common/base.model');

// Nhóm ngành
const GroupSchema = new mongoose.Schema({
    ...BaseFields,
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
}, {
    timestamps: true
});

module.exports = mongoose.model("Group", GroupSchema);