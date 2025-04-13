module.exports = BaseFields = {
    name: { type: String, required: true },
    description: { type: String, required: true },
    images: [String],
    tag: [String],
};