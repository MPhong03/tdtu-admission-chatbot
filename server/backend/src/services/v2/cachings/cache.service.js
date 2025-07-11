const { createClient } = require('redis');
const logger = require("../../../utils/logger.util");

class CacheService {
    constructor(redisUrl, ttlSeconds = 7 * 24 * 60 * 60) {  // 7 days in seconds
        this.redisUrl = redisUrl;
        this.client = createClient({ url: this.redisUrl });
        this.indexName = 'idx:questions';
        this.prefix = 'question:';
        this.dim = 384;
        this.ttl = ttlSeconds;
    }

    async connect() {
        try {
            await this.client.connect();
            logger.info('[CacheService] Connected to Redis.');
        } catch (err) {
            logger.error('[CacheService] Error connecting to Redis.', err);
            throw err;
        }
    }

    async ensureConnected() {
        if (!this.client.isOpen) {
            logger.warn("[CacheService] Client closed. Reconnecting...");
            await this.client.connect();
        }
    }

    async healthCheck() {
        try {
            await this.client.ping();
            logger.info('[CacheService] Redis health check OK.');
            return true;
        } catch (err) {
            logger.error('[CacheService] Redis health check failed.', err);
            return false;
        }
    }

    async createIndexIfNotExists() {
        try {
            await this.client.ft.info(this.indexName);
            logger.info(`[CacheService] Index ${this.indexName} already exists.`);
        } catch (err) {
            if (err?.message?.toLowerCase().includes('unknown index name')) {
                logger.warn(`[CacheService] Index not found. Creating new index: ${this.indexName}...`);
                await this.client.ft.create(
                    this.indexName,
                    {
                        question: { type: 'TEXT' },
                        embedding: {
                            type: 'VECTOR',
                            ALGORITHM: 'FLAT',
                            TYPE: 'FLOAT32',
                            DIM: this.dim,
                            DISTANCE_METRIC: 'COSINE'
                        },
                        query: { type: 'TEXT' },
                        created_date: { type: 'NUMERIC' }
                    },
                    {
                        ON: 'HASH',
                        PREFIX: this.prefix
                    }
                );
                logger.info(`[CacheService] Index ${this.indexName} created successfully.`);
            } else {
                logger.error(`[CacheService] Unexpected error when checking index ${this.indexName}:`, err);
                throw err;
            }
        }
    }

    serializeEmbedding(embeddingArray) {
        const buffer = Buffer.alloc(4 * embeddingArray.length);
        embeddingArray.forEach((v, i) => buffer.writeFloatLE(v, i * 4));
        return buffer;
    }

    async addCache(id, question, embeddingArray, query) {
        try {
            await this.ensureConnected();

            const key = `${this.prefix}${id}`;
            const buffer = this.serializeEmbedding(embeddingArray);

            await this.client.hSet(key, {
                question,
                embedding: buffer,
                query,
                created_date: Date.now().toString()
            });

            await this.client.expire(key, this.ttl);

            logger.info(`[CacheService] Cached question:${id}.`);
        } catch (err) {
            logger.error('[CacheService] Error adding to cache.', err);
        }
    }

    async searchSimilar(queryEmbedding, topK = 3) {
        try {
            await this.ensureConnected();

            const buffer = this.serializeEmbedding(queryEmbedding);
            const q = `*=>[KNN ${topK} @embedding $vector AS score]`;

            const results = await this.client.ft.search(this.indexName, q, {
                PARAMS: { vector: buffer },
                SORTBY: 'score',
                DIALECT: 2
            });

            return results.documents.map(doc => ({
                id: doc.id,
                question: doc.value.question,
                query: doc.value.query,
                score: doc.value.score
            }));
        } catch (err) {
            logger.error('[CacheService] Error during vector search. Returning fallback (undefined).', err);
            return undefined;
        }
    }

    async disconnect() {
        await this.client.quit();
        logger.info('[CacheService] Redis client disconnected.');
    }
}

module.exports = CacheService;