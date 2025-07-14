const { htmlToText } = require("html-to-text");

/**
 * Tính cosine similarity giữa hai vector
 */
function cosineSimilarity(vec1, vec2) {
    const dot = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const normA = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
}

/**
 * HTML to Text
 */
function convertHtmlToText(html) {
    return htmlToText(html, {
        wordwrap: false, // Không tự xuống dòng
        selectors: [
            { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }, // Ẩn link nếu trùng text
            { selector: 'img', format: 'skip' }, // Bỏ qua ảnh
        ],
        preserveNewlines: true, // Giữ lại xuống dòng
        uppercaseHeadings: false, // Không in hoa heading
        tables: ['table'], // Hiển thị bảng dưới dạng text
        ignoreHref: false, // Giữ link
        ignoreImage: true, // Bỏ qua ảnh
        // stripTags: ['span', 'font']
    });
}

function now() {
    return new Date().toISOString();
}

/**
 * Calculate cosine v2
 */
function calculateSimilarity(v1, v2) {
    if (!Array.isArray(v1) || !Array.isArray(v2)) {
        console.error("Invalid input vectors:", { v1, v2 });
        throw new Error('Inputs must be arrays');
    }

    if (v1.length !== v2.length) {
        throw new Error('Vectors must have same length');
    }

    if (v1.length === 0) return 0;

    let dotProduct = 0, normA = 0, normB = 0;

    for (let i = 0; i < v1.length; i++) {
        dotProduct += v1[i] * v2[i];
        normA += v1[i] * v1[i];
        normB += v2[i] * v2[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

module.exports = { cosineSimilarity, convertHtmlToText, now, calculateSimilarity };