const { neo4j, getSession } = require("../../../configs/neo4j.config");
const { now } = require("../../../utils/calculator.util");
const { stringToId } = require("../../../utils/neo4j.util");

class Neo4jNodeRepository {
    // Create or update (MERGE) node with given label and properties (must include 'id')
    async upsert(label, properties) {
        const session = getSession();
        try {
            let { id, name, ...rest } = properties;
            if (!id) {
                if (!name || typeof name !== 'string') throw new Error('Vui lòng cung cấp tên tài liệu!');
                id = stringToId(name);
            }
            const createdAt = now();
            const props = { id, name, ...rest };
            const query = `MERGE (n:${label} {id: $id}) ON CREATE SET n.createdAt = $createdAt SET n += $props, n.updatedAt = $updatedAt RETURN n`;
            const result = await session.run(query, { id, createdAt, updatedAt: createdAt, props });
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Batch create/update node theo id và properties
    async upsertMany(label, arr) {
        if (!arr || arr.length === 0) return;
        const session = getSession();

        const createdAt = now();
        const updatedAt = createdAt;

        // Xử lý mảng: nếu phần tử không có id thì sinh id từ name
        const rows = arr.map(item => {
            let { id, name, ...rest } = item;
            if (!id) {
                if (!name || typeof name !== 'string') throw new Error('Vui lòng cung cấp tên tài liệu!');
                id = stringToId(name);
            }
            return { id, name, ...rest, createdAt, updatedAt };
        });

        try {
            const query = `
                UNWIND $rows AS row
                MERGE (n:${label} {id: row.id})
                ON CREATE SET n.createdAt = row.createdAt
                SET n += row, n.updatedAt = row.updatedAt
                RETURN n
            `;
            const result = await session.run(query, { rows });
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
            const result = await session.run(query, { limit: neo4j.int(limit, 10) });
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    // pagination
    async paginate(label, { page = 1, pageSize = 10, query = {} } = {}) {
        const session = getSession();
        const limit = parseInt(pageSize, 10);
        const skip = parseInt((page - 1) * limit, 10);

        // === XỬ LÝ WHERE ===
        const whereParts = [];
        const params = {};
        let paramCount = 0;

        const buildCondition = (field, value) => {
            const paramKey = `param_${paramCount++}`;
            params[paramKey] = value;
            return `apoc.text.clean(toLower(n.${field})) CONTAINS apoc.text.clean(toLower($${paramKey}))`;
        };

        // AND điều kiện thường
        Object.entries(query).forEach(([key, value]) => {
            if (key === '$or') return; // skip OR ở đây
            if (value === null || value === undefined) return;
            whereParts.push(buildCondition(key, value));
        });

        // OR điều kiện
        if (Array.isArray(query.$or)) {
            const orParts = [];
            query.$or.forEach(cond => {
                if (!cond || typeof cond !== 'object') return;
                Object.entries(cond).forEach(([key, value]) => {
                    if (value === null || value === undefined) return;
                    orParts.push(buildCondition(key, value));
                });
            });
            if (orParts.length > 0) {
                whereParts.push(`(${orParts.join(' OR ')})`);
            }
        }

        const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : '';

        try {
            // === ĐẾM ===
            const countQuery = `
                MATCH (n:${label})
                ${whereClause}
                RETURN count(n) AS totalItems
            `;
            
            const countResult = await session.run(countQuery, params);
            const totalItems = countResult.records[0].get('totalItems').toNumber();

            // === DỮ LIỆU ===
            const dataQuery = `
                MATCH (n:${label})
                ${whereClause}
                RETURN n
                ORDER BY coalesce(n.createdAt, "") DESC
                SKIP $skip
                LIMIT $limit
            `;

            const result = await session.run(dataQuery, {
                ...params,
                skip: neo4j.int(skip),
                limit: neo4j.int(limit)
            });

            return {
                items: result.records.map(r => r.get('n').properties),
                pagination: {
                    page,
                    size: limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } finally {
            await session.close();
        }
    }

    // Update node by label and id
    async update(label, id, props, toRemove = []) {
        const session = getSession();
        try {
            const updatedAt = now();

            let query = `MATCH (n:${label} {id: $id}) SET n += $props, n.updatedAt = $updatedAt`;

            // Nếu có thuộc tính cần xóa -> thêm REMOVE vào query
            if (toRemove.length > 0) {
                const removeClauses = toRemove.map(k => `n.\`${k}\``).join(", ");
                query += ` REMOVE ${removeClauses}`;
            }

            query += ` RETURN n`;

            const result = await session.run(query, { id, props, updatedAt });
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