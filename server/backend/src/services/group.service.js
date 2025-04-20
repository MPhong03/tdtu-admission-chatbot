const repo = require('../repositories/group.repository');
class GroupService {
    async create(data) {
        return await repo.create(data);
    }
    async getAll() {
        return await repo.getAll();
    }
    async getById(id) {
        return await repo.getById(id);
    }
    async delete(id) {
        return await repo.delete(id);
    }
    async getMajors(groupId) {
        return [];
    }
}
module.exports = new GroupService();