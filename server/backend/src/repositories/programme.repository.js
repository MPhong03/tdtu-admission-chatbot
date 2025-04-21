const { getSession } = require('../configs/neo4j.config');
const BaseRepository = require('./base.repository');

// Hệ đào tạo
class ProgrammeRepository extends BaseRepository {
    constructor() {
        super('Programme');
    }
}
module.exports = new ProgrammeRepository();
