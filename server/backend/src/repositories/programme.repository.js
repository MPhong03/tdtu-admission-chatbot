const { getSession } = require('../configs/neo4j.config');
const BaseRepository = require('./base.repository');

// Hệ đào tạo
class ProgrammeRepository extends BaseRepository {
    constructor() {
        super('Programme');
    }

    async getByName(name) {
        const session = getSession();
        try {
            const result = await session.run(
                "MATCH (p:Programme {name: $name}) RETURN p LIMIT 1",
                { name }
            );
            return result.records[0]?.get("p").properties || null;
        } finally {
            await session.close();
        }
    }
}
module.exports = new ProgrammeRepository();
