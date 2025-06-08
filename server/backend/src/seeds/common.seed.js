const logger = require('../utils/logger.util');
const Common = require('../models/systemconfigs/common.model');

const defaultConfigs = [
    {
        key: 'gemini_api_url',
        value: '',
        name: 'Gemini API URL'
    },
    {
        key: 'gemini_api_key',
        value: '',
        name: 'Gemini API Key'
    },
    {
        key: 'elastic_url',
        value: '',
        name: 'Elastic URL'
    },
    {
        key: 'elastic_username',
        value: '',
        name: 'Elastic Username'
    },
    {
        key: 'elastic_password',
        value: '',
        name: 'Elastic Password'
    },
    {
        key: 'neo4j_url',
        value: '',
        name: 'Neo4j URL'
    },
    {
        key: 'neo4j_db',
        value: '',
        name: 'Neo4j Database'
    },
    {
        key: 'neo4j_username',
        value: '',
        name: 'Neo4j Username'
    },
    {
        key: 'neo4j_password',
        value: '',
        name: 'Neo4j Password'
    },
    {
        key: 'gemini_api_key',
        value: '',
        name: 'Gemini API Key'
    },
    {
        key: 'llm_api',
        value: '',
        name: 'LLM API'
    }
];

async function seedCommonConfigs() {
    for (const config of defaultConfigs) {
        const exists = await Common.findOne({ key: config.key });
        if (!exists) {
            await Common.create(config);
            logger.info(`[SEED] Inserted config key=${config.key}`);
        }
    }
}

module.exports = seedCommonConfigs;