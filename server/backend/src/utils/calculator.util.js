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

module.exports = { cosineSimilarity, convertHtmlToText, now };