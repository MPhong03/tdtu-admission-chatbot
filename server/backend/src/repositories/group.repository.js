const Neo4JRepository = require('./neo4j.repository');

// Nhóm ngành
class GroupRepository extends Neo4JRepository {
    constructor() {
        super('Group');
    }
}
module.exports = new GroupRepository();