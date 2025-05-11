const mongoose = require("mongoose");

// Các thực thể liên quan
const RelatedEntitySchema = new mongoose.Schema({
    entity: { type: String, required: true },
    relation: { type: String, required: true } // Mối quan hệ với thực thể gốc
}, { _id: false });

const SampleQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    embedding: { type: [Number], required: true }
}, { _id: false });

// Kịch bản
const ScenarioSchema = new mongoose.Schema({
    name: { type: String, required: true },
    scenarioKey: { type: String, required: true, unique: true },

    sampleQuestions: [SampleQuestionSchema], // Dùng để match cosine với câu hỏi

    targetEntity: { type: String, required: true }, // Thực thể gốc
    // filtersRequired: [{ type: String }],

    relatedEntities: [RelatedEntitySchema], // Danh sách các thực thể liên quan và quan hệ

    responseTemplate: { type: String, default: "" }, // Prompt mẫu gửi cho LLM

    priority: { type: Number, default: 0 }, // Độ ưu tiên

    isActive: { type: Boolean, default: true }, // Dùng để bật/tắt kịch bản

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Scenario", ScenarioSchema);
