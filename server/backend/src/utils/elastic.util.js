/**
 * Hàm hỗ trợ convert schema mongoose sang ElasticSearch mapping
 * Dùng được cho chatbot KAG với nội dung có cấu trúc rõ
 */

const mongoose = require('mongoose');

const getElasticType = (type) => {
    if (type === String) return { type: 'text', analyzer: 'vi_analyzer' };
    if (type === Number) return { type: 'double' };
    if (type === Boolean) return { type: 'boolean' };
    if (type === Date) return { type: 'date' };
    if (type === mongoose.Schema.Types.ObjectId) return { type: 'keyword' };
    return { type: 'object' }; // fallback
};

const convertSchemaToElasticMapping = (mongooseSchema) => {
    const mapping = {};
    const fields = mongooseSchema.obj;

    for (const [field, value] of Object.entries(fields)) {
        if (Array.isArray(value)) {
            mapping[field] = { type: 'keyword' };
        }
        else if (typeof value === 'object' && value.type) {
            mapping[field] = getElasticType(value.type);
        }
        else {
            mapping[field] = getElasticType(value);
        }
    }

    return mapping;
};

module.exports = { convertSchemaToElasticMapping };