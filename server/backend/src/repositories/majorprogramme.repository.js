const { getSession } = require('../configs/neo4j.config');
const Neo4JRepository = require('./neo4j.repository');

// Hệ ngành đào tạo
class MajorProgrammeRepository extends Neo4JRepository {
    constructor() {
        super('MajorProgramme');
    }

    async getByNameAndTab(name, tab) {
        const session = getSession();
        try {
            const result = await session.run(
                `MATCH (n:MajorProgramme {name: $name, tab: $tab}) RETURN n LIMIT 1`,
                { name, tab }
            );
            return result.records[0]?.get("n").properties || null;
        } finally {
            await session.close();
        }
    }
}
module.exports = new MajorProgrammeRepository();