const mongoose = require("mongoose");

const VerificationTaskSchema = new mongoose.Schema({
    historyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'History',
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    contextNodes: {
        type: String,
        default: '[]'
    },
    category: {
        type: String,
        enum: ['simple_admission', 'complex_admission', 'inappropriate', 'off_topic'],
        default: 'simple_admission'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    retryCount: {
        type: Number,
        default: 0
    },
    maxRetries: {
        type: Number,
        default: 3
    },
    lastError: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    processingAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
VerificationTaskSchema.index({ status: 1, scheduledAt: 1 });
VerificationTaskSchema.index({ historyId: 1 });
VerificationTaskSchema.index({ createdAt: -1 });
VerificationTaskSchema.index({ retryCount: 1 });

module.exports = mongoose.model("VerificationTask", VerificationTaskSchema);