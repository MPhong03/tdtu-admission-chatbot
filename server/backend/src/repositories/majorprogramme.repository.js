const BaseRepository = require('./base.repository');

// Hệ ngành đào tạo
class MajorProgrammeRepository extends BaseRepository {
    constructor() {
        super('MajorProgramme');
    }
}
module.exports = new MajorProgrammeRepository();