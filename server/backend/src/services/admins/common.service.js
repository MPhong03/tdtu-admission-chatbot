const CommonRepo = require('../../repositories/systemconfigs/common.repository');
const BotService = require('../v2/bots/bot.service');

class CommonService {
    async getAllConfigs() {
        return await CommonRepo.getAll();
    }

    async getByKey(key) {
        return await CommonRepo.getValueByKey(key);
    }

    async getValues(keys) {
        return await CommonRepo.getValues(keys);
    }

    async updateConfig(key, value) {
        const result = await CommonRepo.setValueByKey(key, value);

        if (['gemini_api_url', 'gemini_api_key'].includes(key)) {
            await BotService.initialize();
        }

        return result;
    }

    async updateMultiple(keyValuePairs) {
        const updates = Object.entries(keyValuePairs).map(([key, value]) => ({
            updateOne: {
                filter: { key },
                update: { $set: { value } },
                upsert: true
            }
        }));

        if (updates.length > 0) {
            await CommonRepo.bulkInsert(updates);
        }
    }
}

module.exports = new CommonService();
