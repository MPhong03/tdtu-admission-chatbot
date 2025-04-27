const repo = require('../repositories/group.repository');
class GroupService {
    async create(data) {
        return await repo.create({ ...data, entityType: "Group" });
    }
    async update(id, data) {
        return await repo.update(id, { ...data, entityType: "Group" });
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
    async getByName(name) {
        return await repo.getByName(name);
    }
}
module.exports = new GroupService();