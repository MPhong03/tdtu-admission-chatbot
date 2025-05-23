const { getSession } = require('../configs/neo4j.config');
const { v4: uuidv4 } = require('uuid');

class Neo4JRepository {
    constructor(label) {
        this.label = label;
    }

    // Tạo node
    async create(data) {
        const session = getSession();
        const id = uuidv4();
        try {
            const result = await session.run(
                `CREATE (n:${this.label} $props) SET n.id = $id RETURN n`,
                { props: data, id }
            );
            return result.records[0].get('n').properties;
        } finally {
            await session.close();
        }
    }

    // Cập nhật node theo id
    async update(id, data) {
        const session = getSession();
        try {
            const result = await session.run(
                `
                    MATCH (n:${this.label} {id: $id})
                    SET n += $props
                    RETURN n
                    `,
                { id, props: data }
            );
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Lấy danh sách node
    async getAll() {
        const session = getSession();
        try {
            const result = await session.run(`MATCH (n:${this.label}) RETURN n`);
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    // Lấy node theo id
    async getById(id) {
        const session = getSession();
        try {
            const result = await session.run(
                `MATCH (n:${this.label} {id: $id}) RETURN n`,
                { id }
            );
            return result.records[0]?.get('n').properties || null;
        } finally {
            await session.close();
        }
    }

    // Xóa node
    async delete(id) {
        const session = getSession();
        try {
            await session.run(`MATCH (n:${this.label} {id: $id}) DETACH DELETE n`, { id });
        } finally {
            await session.close();
        }
    }

    // Lấy node theo name
    async getByName(name) {
        const session = getSession();
        try {
            const result = await session.run(
                `MATCH (p:${this.label} {name: $name}) RETURN p LIMIT 1`,
                { name }
            );
            return result.records[0]?.get("p").properties || null;
        } finally {
            await session.close();
        }
    }
}

module.exports = Neo4JRepository;