const { getSession } = require('../configs/neo4j.config');
const Neo4JRepository = require('./neo4j.repository');

// Hệ đào tạo
class ProgrammeRepository extends Neo4JRepository {
    constructor() {
        super('Programme');
    }
}
module.exports = new ProgrammeRepository();
