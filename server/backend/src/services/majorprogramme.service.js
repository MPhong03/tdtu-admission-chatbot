const repo = require('../repositories/majorprogramme.repository');
class MajorProgrammeService {
    async create(data) {
        return await repo.create({ ...data, entityType: "MajorProgramme" });
    }
    async update(id, data) {
        return await repo.update(id, { ...data, entityType: "MajorProgramme" });
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
    async getByNameAndTab(name, tab) {
        return await repo.getByNameAndTab(name, tab);
    }
}
module.exports = new MajorProgrammeService();
