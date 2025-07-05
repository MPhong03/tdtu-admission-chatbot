class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    // ======= CREATE =======
    async create(data) {
        return this.model.create(data);
    }

    async createRange(dataArray) {
        return this.model.insertMany(dataArray);
    }

    async bulkInsert(dataArray, options = {}) {
        return this.model.collection.insertMany(dataArray, options); // nhanh hơn insertMany
    }

    // ======= READ =======
    async getById(id, populate = []) {
        let query = this.model.findById(id);
        if (populate.length > 0) {
            populate.forEach(p => query = query.populate(p));
        }
        return query.exec();
    }

    async getByIds(ids, populate = []) {
        let query = this.model.find({ _id: { $in: ids } });
        if (populate.length > 0) {
            populate.forEach(p => query = query.populate(p));
        }
        return query.exec();
    }

    async getAll(filter = {}, populate = []) {
        let query = this.model.find(filter);
        if (populate.length > 0) {
            populate.forEach(p => query = query.populate(p));
        }
        return query.exec();
    }

    asQueryable(filter = {}) {
        return this.model.find(filter); // trả về query object để build tiếp .sort(), .limit()...
    }

    // ======= UPDATE =======
    async update(id, updateData) {
        return this.model.findByIdAndUpdate(id, updateData, { new: true });
    }

    async updateRange(condition, updateData) {
        return this.model.updateMany(condition, updateData);
    }

    // ======= DELETE =======
    async delete(id) {
        return this.model.findByIdAndDelete(id);
    }

    async removeRange(condition) {
        return this.model.deleteMany(condition);
    }

    // ======= COUNT / EXIST =======
    async count(filter = {}) {
        return this.model.countDocuments(filter);
    }

    async exists(filter = {}) {
        return this.model.exists(filter);
    }

    async aggregate(pipeline = []) {
        return this.model.aggregate(pipeline).exec();
    }

    // ======= PAGINATION =======
    /**
     * Phân trang kết quả
     * @param {Object} filter - Điều kiện tìm kiếm
     * @param {number} page - Trang hiện tại (bắt đầu từ 1)
     * @param {number} size - Số lượng mỗi trang
     * @param {Array<string>} populate - Danh sách các field populate (nếu có)
     */
    async paginate(filter = {}, page = 1, size = 10, populate = [], sort = { createdAt: -1 }, excludeFields = []) {
        const skip = (page - 1) * size;
        let query = this.model.find(filter).sort(sort).skip(skip).limit(size);

        if (populate.length > 0) {
            populate.forEach(p => {
                if (typeof p === 'string') {
                    query.populate(p);
                } else if (typeof p === 'object' && p.path) {
                    query.populate(p);
                }
            });
        }

        if (excludeFields.length > 0) {
            const projection = excludeFields.map(f => `-${f}`).join(' ');
            query = query.select(projection);
        }

        const [items, total] = await Promise.all([
            query.exec(),
            this.model.countDocuments(filter)
        ]);

        return {
            items,
            pagination: {
                page,
                size,
                totalPages: Math.ceil(total / size),
                totalItems: total,
            }
        };
    }

}

module.exports = BaseRepository;