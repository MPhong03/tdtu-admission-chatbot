const { getSession } = require("../../../configs/neo4j.config");

/**
 * Repository gốc cho phép thực thi câu lệnh Cypher động, truy vấn dữ liệu, trả về record hoặc single node.
 */
class Neo4jRepository {
    /**
     * Thực thi câu lệnh Cypher, trả về mảng kết quả (properties hoặc node tuỳ raw).
     * @param {string} cypher - Câu lệnh Cypher
     * @param {object} params - Tham số truyền vào
     * @param {object} options - { raw: boolean } - Nếu true trả về node/raw, nếu false trả về properties
     * @returns {Promise<Array>}
     */
    async execute(cypher, params = {}, options = {}) {
        const session = getSession();
        try {
            const result = await session.run(cypher, params);
            if (options.raw) {
                return result.records.map(r => r.toObject());
            }
            // Trả về properties của node đầu tiên trong mỗi record
            return result.records.map(r => {
                const firstKey = Object.keys(r.toObject())[0];
                const value = r.get(firstKey);
                // Nếu là Neo4j Node (có .properties), lấy properties, nếu không thì giữ nguyên
                return value?.properties ?? value ?? null;
            });
        } finally {
            await session.close();
        }
    }

    /**
     * Thực thi và trả về một record duy nhất
     * @param {string} cypher 
     * @param {object} params 
     * @param {object} options 
     * @returns {Promise<object|null>}
     */
    async executeOne(cypher, params = {}, options = {}) {
        const result = await this.execute(cypher, params, { raw: false, ...options });
        return result[0] || null;
    }
}

module.exports = new Neo4jRepository();