const BaseRepository = require('./base.repository');

// Nhóm ngành
class GroupRepository extends BaseRepository {
    constructor() {
        super('Group');
    }
}
module.exports = new GroupRepository();