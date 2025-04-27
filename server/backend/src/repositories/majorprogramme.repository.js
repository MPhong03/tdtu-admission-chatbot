const { getSession } = require('../configs/neo4j.config');
const BaseRepository = require('./base.repository');

// Hệ ngành đào tạo
class MajorProgrammeRepository extends BaseRepository {
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