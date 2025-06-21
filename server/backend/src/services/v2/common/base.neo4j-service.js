const nodeRepo = require("../../../repositories/v2/common/neo4j-node.repository");

class BaseNeo4jService {
    constructor(label) {
        this.label = label;
    }

    async create(data) {
        return nodeRepo.upsert(this.label, data);
    }

    async getById(id) {
        return nodeRepo.findById(this.label, id);
    }

    async update(id, data) {
        return nodeRepo.update(this.label, id, data);
    }

    async delete(id) {
        return nodeRepo.delete(this.label, id);
    }

    async getAll(limit = 100) {
        return nodeRepo.findAll(this.label, limit);
    }

    async upsertMany(arr) {
        return nodeRepo.upsertMany(this.label, arr);
    }

    async paginate({ page = 1, pageSize = 10 } = {}) {
        return nodeRepo.paginate(this.label, { page, pageSize });
    }

    async query(query = {}) {
        return nodeRepo.asQueryAble(this.label, query);
    }
}

module.exports = BaseNeo4jService;