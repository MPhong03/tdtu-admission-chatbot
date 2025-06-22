const { v4: uuidv4 } = require('uuid');

// Xây dựng ID cho node trong Neo4j
function assignId(data) {
    if (!data.id) {
        data.id = uuidv4();
    }
    return data;
}

/**
 * Chuyển đổi chuỗi name thành id:
 * - Bỏ dấu tiếng Việt
 * - Chữ hoa toàn bộ
 * - Loại bỏ ký tự đặc biệt
 * - Dấu cách thay bằng dấu "-"
 * @param {string} name
 * @returns {string}
 */
function stringToId(name) {
    if (typeof name !== "string") return "";
    // Bỏ dấu tiếng Việt
    let str = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Chữ hoa, bỏ ký tự đặc biệt ngoài chữ/số/khoảng trắng
    str = str.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    // Thay nhiều khoảng trắng bằng 1 dấu "_"
    str = str.trim().replace(/\s+/g, "_");
    return str;
}

module.exports = { assignId, stringToId };
