const { getSession } = require("../../../configs/neo4j.config");

class Neo4jEdgeRepository {
    // Create or update (MERGE) a relationship between two nodes (by id and label)
    async upsert(fromLabel, fromId, relType, toLabel, toId, relProps = {}) {
        const session = getSession();
        try {
            const query = `MATCH (from:${fromLabel} {id: $fromId}), (to:${toLabel} {id: $toId})
                MERGE (from)-[r:${relType}]->(to)
                SET r += $relProps
                RETURN r
            `;
            const result = await session.run(query, { fromId, toId, relProps });
            return result.records[0]?.get('r').properties || null;
        } finally {
            await session.close();
        }
    }

    // Delete a relationship between two nodes
    async delete(fromLabel, fromId, relType, toLabel, toId) {
        const session = getSession();
        try {
            const query = `
                MATCH (from:${fromLabel} {id: $fromId})-[r:${relType}]->(to:${toLabel} {id: $toId})
                DELETE r
                RETURN COUNT(r) AS deletedCount
            `;
            const result = await session.run(query, { fromId, toId });
            return result.records[0]?.get('deletedCount').toNumber() > 0;
        } finally {
            await session.close();
        }
    }

    // Get all relationships of a node by direction (outgoing/incoming) and relation type
    async findAll(fromLabel, fromId, relType, direction = 'OUTGOING', limit = 100) {
        const session = getSession();
        try {
            const arrow = direction === 'INCOMING' ? '<-' : '->';
            const query = `
                MATCH (from:${fromLabel} {id: $fromId})-[r:${relType}]${arrow}(to)
                RETURN r, to
                LIMIT $limit
            `;
            const result = await session.run(query, { fromId, limit });
            return result.records.map(r => ({
                relProps: r.get('r').properties,
                toNode: r.get('to').properties
            }));
        } finally {
            await session.close();
        }
    }

    // Truy vấn các node đích được kết nối bởi source và type chỉ định
    async findTargets(fromLabel, fromId, edgeType) {
        const session = getSession();
        try {
            const query = `
                MATCH (a:${fromLabel} {id: $fromId})-[:${edgeType}]->(b)
                RETURN b
            `;
            const result = await session.run(query, { fromId });
            return result.records.map(r => r.get("b").properties);
        } finally {
            await session.close();
        }
    }
}

module.exports = new Neo4jEdgeRepository();