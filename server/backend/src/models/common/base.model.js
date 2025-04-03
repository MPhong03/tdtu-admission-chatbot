module.exports = BaseFields = {
    name: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: String },
    tag: [String],
};