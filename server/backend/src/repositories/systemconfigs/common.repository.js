const BaseRepository = require("../common/base.repository");
const Common = require("../../models/systemconfigs/common.model");

class CommonRepository extends BaseRepository {
    constructor() {
        super(Common);
    }

    /**
     * Lấy giá trị cấu hình theo key
     */
    async getValueByKey(key) {
        const setting = await this.model.findOne({ key });
        return setting?.value ?? null;
    }

    /**
     * Cập nhật hoặc tạo mới cấu hình theo key
     */
    async setValueByKey(key, value) {
        return this.model.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
    }

    /**
     * Lấy nhiều cấu hình theo danh sách key
     */
    async getValues(keys = []) {
        const settings = await this.model.find({ key: { $in: keys } });
        return settings.reduce((acc, cur) => {
            acc[cur.key] = cur.value;
            return acc;
        }, {});
    }
}

module.exports = new CommonRepository();