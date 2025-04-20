const repo = require('../repositories/major.repository');
class MajorService {
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
}
module.exports = new MajorService();