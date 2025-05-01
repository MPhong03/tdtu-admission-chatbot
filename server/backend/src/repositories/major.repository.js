const Neo4JRepository = require('./neo4j.repository');

// Ngành đào tạo
class MajorRepository extends Neo4JRepository {
    constructor() {
        super('Major');
    }
}
module.exports = new MajorRepository();