const { v4: uuidv4 } = require('uuid');

// Xây dựng ID cho node trong Neo4j
function assignId(data) {
    if (!data.id) {
        data.id = uuidv4();
    }
    return data;
}

module.exports = { assignId };
