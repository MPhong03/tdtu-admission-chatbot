const Common = require('../../models/systemconfigs/common.model');

class CommonService {
    /**
     * Lấy danh sách toàn bộ cấu hình
     */
    async getAllConfigs() {
        return await Common.find().sort({ createdAt: 1 }).lean();
    }

    /**
     * Lấy cấu hình theo key
     */
    async getByKey(key) {
        return await Common.findOne({ key }).lean();
    }

    /**
     * Lấy nhiều cấu hình theo danh sách key
     */
    async getValues(keys = []) {
        const configs = await Common.find({ key: { $in: keys } }).lean();
        const result = {};
        configs.forEach(config => {
            result[config.key] = config.value;
        });
        return result;
    }

    /**
     * Cập nhật cấu hình theo key
     */
    async updateConfig(key, value) {
        return await Common.findOneAndUpdate(
            { key },
            { $set: { value } },
            { upsert: true, new: true }
        );
    }

    /**
     * Cập nhật nhiều cấu hình cùng lúc
     */
    async updateMultiple(keyValuePairs) {
        const updates = Object.entries(keyValuePairs).map(([key, value]) => ({
            updateOne: {
                filter: { key },
                update: { $set: { value } },
                upsert: true
            }
        }));

        if (updates.length > 0) {
            await Common.bulkWrite(updates);
        }
    }
}

module.exports = new CommonService();
