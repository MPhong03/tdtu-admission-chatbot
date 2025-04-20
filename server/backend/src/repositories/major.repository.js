const BaseRepository = require('./base.repository');

// Ngành đào tạo
class MajorRepository extends BaseRepository {
    constructor() {
        super('Major');
    }
}
module.exports = new MajorRepository();