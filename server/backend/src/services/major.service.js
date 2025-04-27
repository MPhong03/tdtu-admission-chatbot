const repo = require('../repositories/major.repository');
class MajorService {
    async create(data) {
        return await repo.create({ ...data, entityType: "Major" });
    }
    async update(id, data) {
        return await repo.update(id, { ...data, entityType: "Major" });
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
    async getByName(name) {
        return await repo.getByName(name);
    }
}
module.exports = new MajorService();