const { neo4j, getSession } = require("../../../configs/neo4j.config");

class Neo4jNodeRepository {
    // Create or update (MERGE) node with given label and properties (must include 'id')
    async upsert(label, properties) {
        const session = getSession();
        try {
            const query = `MERGE (n:${label} {id: $id}) SET n += $props RETURN n`;
            const result = await session.run(query, { id: properties.id, props: properties });
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Batch create/update node theo id và properties
    async upsertMany(label, arr) {
        if (!arr || arr.length === 0) return;
        const session = getSession();

        try {
            const query = `
                UNWIND $rows AS row
                MERGE (n:${label} {id: row.id})
                SET n += row
            `;
            const result = await session.run(query, { rows: arr });
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    // Find node by label and id
    async findById(label, id) {
        const session = getSession();
        try {
            const query = `MATCH (n:${label} {id: $id}) RETURN n`;
            const result = await session.run(query, { id });
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Find all nodes by label (optionally limit)
    async findAll(label, limit = 100) {
        const session = getSession();
        try {
            const query = `MATCH (n:${label}) RETURN n LIMIT $limit`;
            const result = await session.run(query, { limit });
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    // pagination
    async paginate(label, { page = 1, pageSize = 10 } = {}) {
        const session = getSession();
        const limit = parseInt(pageSize, 10);
        const skip = parseInt((page - 1) * limit, 10);
        try {
            const query = `
            MATCH (n:${label})
            RETURN n
            SKIP $skip
            LIMIT $limit
        `;
            const result = await session.run(query, { skip: neo4j.int(skip) , limit: neo4j.int(limit) });
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    // Update node by label and id
    async update(label, id, props) {
        const session = getSession();
        try {
            const query = `MATCH (n:${label} {id: $id}) SET n += $props RETURN n`;
            const result = await session.run(query, { id, props });
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Delete node by label and id
    async delete(label, id) {
        const session = getSession();
        try {
            const query = `MATCH (n:${label} {id: $id}) DETACH DELETE n RETURN COUNT(n) AS deletedCount`;
            const result = await session.run(query, { id });
            return result.records[0]?.get('deletedCount').toNumber() > 0;
        } finally {
            await session.close();
        }
    }

    // query
    async asQueryAble(label, query = {}) {
        const session = getSession();

        const whereParts = [];
        const params = {};
        Object.entries(query).forEach(([key, value]) => {
            const paramKey = `param_${key}`;
            whereParts.push(`n.${key} = $${paramKey}`);
            params[paramKey] = value;
        });
        const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

        const cypher = `
            MATCH (n:${label})
            ${whereClause}
            RETURN n
        `;
        try {
            const result = await session.run(cypher, params);
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }
}

module.exports = new Neo4jNodeRepository();