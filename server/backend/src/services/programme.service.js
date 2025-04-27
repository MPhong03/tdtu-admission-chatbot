const repo = require('../repositories/programme.repository');
class ProgrammeService {
    async create(data) {
        return await repo.create({ ...data, entityType: "Programme" });
    }
    async update(id, data) {
        return await repo.update(id, { ...data, entityType: "Programme" });
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

    // Lấy hệ đào tạo theo name
    async getByName(name) {
        return await repo.getByName(name);
    }
}
module.exports = new ProgrammeService();