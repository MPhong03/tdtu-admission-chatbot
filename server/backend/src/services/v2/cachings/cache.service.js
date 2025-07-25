const { createClient } = require('redis');
const crypto = require('crypto');
const logger = require("../../../utils/logger.util");

class CacheService {
    constructor(redisUrl, options = {}) {
        this.redisUrl = redisUrl;
        this.options = {
            ttlSeconds: options.ttlSeconds || 7 * 24 * 60 * 60, // 7 days
            maxMemoryItems: options.maxMemoryItems || 2000,
            enableFallback: options.enableFallback !== false, // Default true
            reconnectAttempts: options.reconnectAttempts || 5,
            reconnectDelay: options.reconnectDelay || 2000,
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 30000,
            dataVersionKey: options.dataVersionKey || 'data:version'
        };

        // Redis client setup
        this.client = null;
        this.isRedisAvailable = false;
        this.lastRedisError = null;
        this.reconnectAttempt = 0;

        // Circuit breaker for Redis operations
        this.circuitBreaker = {
            failures: 0,
            lastFailTime: 0,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
        };

        // Fallback in-memory cache
        this.memoryCache = new Map();
        this.cacheStats = {
            redisHits: 0,
            memoryHits: 0,
            misses: 0,
            redisErrors: 0,
            fallbackUsed: 0
        };

        // Vector search index config
        this.indexName = 'idx:questions';
        this.prefix = 'question:';
        this.dim = 384;

        // Data versioning
        this.currentDataVersion = null;
        this.dataVersionCheckInterval = 5 * 60 * 1000; // 5 minutes

        this.initializeRedis();
        this.startPeriodicTasks();
    }

    async initializeRedis() {
        try {
            this.client = createClient({ 
                url: this.redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > this.options.reconnectAttempts) {
                            logger.error('[Cache] Max reconnection attempts reached, using fallback');
                            this.isRedisAvailable = false;
                            return false;
                        }
                        return Math.min(retries * this.options.reconnectDelay, 30000);
                    }
                }
            });

            // Event handlers
            this.client.on('connect', () => {
                logger.info('[Cache] Redis connected');
                this.isRedisAvailable = true;
                this.reconnectAttempt = 0;
                this.resetCircuitBreaker();
            });

            this.client.on('error', (err) => {
                logger.error('[Cache] Redis error:', err.message);
                this.lastRedisError = err;
                this.handleRedisFailure();
            });

            this.client.on('end', () => {
                logger.warn('[Cache] Redis disconnected');
                this.isRedisAvailable = false;
            });

            await this.client.connect();
            await this.createIndexIfNotExists();
            await this.loadDataVersion();
            
        } catch (error) {
            logger.error('[Cache] Failed to initialize Redis, using memory fallback:', error.message);
            this.isRedisAvailable = false;
            this.lastRedisError = error;
        }
    }

    // Circuit breaker pattern
    shouldSkipRedis() {
        const now = Date.now();
        
        switch (this.circuitBreaker.state) {
            case 'OPEN':
                if (now - this.circuitBreaker.lastFailTime > this.options.circuitBreakerTimeout) {
                    this.circuitBreaker.state = 'HALF_OPEN';
                    logger.info('[Cache] Circuit breaker: OPEN -> HALF_OPEN');
                    return false;
                }
                return true;
                
            case 'HALF_OPEN':
                return false; // Try one request
                
            case 'CLOSED':
            default:
                return false;
        }
    }

    handleRedisFailure() {
        this.cacheStats.redisErrors++;
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailTime = Date.now();

        if (this.circuitBreaker.failures >= this.options.circuitBreakerThreshold) {
            this.circuitBreaker.state = 'OPEN';
            logger.warn(`[Cache] Circuit breaker OPEN after ${this.circuitBreaker.failures} failures`);
        }

        this.isRedisAvailable = false;
    }

    resetCircuitBreaker() {
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.lastFailTime = 0;
    }

    // Data versioning for cache invalidation
    async loadDataVersion() {
        try {
            if (this.isRedisAvailable && this.client?.isOpen) {
                const version = await this.client.get(this.options.dataVersionKey);
                this.currentDataVersion = version || '1';
                logger.info(`[Cache] Data version loaded: ${this.currentDataVersion}`);
            }
        } catch (error) {
            logger.warn('[Cache] Failed to load data version:', error.message);
            this.currentDataVersion = Date.now().toString();
        }
    }

    async updateDataVersion() {
        const newVersion = Date.now().toString();
        try {
            if (this.isRedisAvailable && this.client?.isOpen) {
                await this.client.set(this.options.dataVersionKey, newVersion);
                this.currentDataVersion = newVersion;
                logger.info(`[Cache] Data version updated: ${newVersion}`);
                
                // Clear memory cache when data version changes
                this.memoryCache.clear();
                logger.info('[Cache] Memory cache cleared due to data version update');
            }
        } catch (error) {
            logger.error('[Cache] Failed to update data version:', error.message);
        }
    }

    // Enhanced cache key generation with versioning
    generateCacheKey(content, type = 'default') {
        const version = this.currentDataVersion || '1';
        const combined = `${content}_${type}_v${version}`;
        const hash = crypto.createHash('md5').update(combined, 'utf8').digest('hex');
        return `cache:${type}:${hash.substring(0, 16)}`;
    }

    generateVectorKey(id) {
        const version = this.currentDataVersion || '1';
        return `${this.prefix}${id}_v${version}`;
    }

    // Resilient Redis operations with fallback
    async executeRedisOperation(operation, fallbackValue = null) {
        if (!this.isRedisAvailable || this.shouldSkipRedis()) {
            this.cacheStats.fallbackUsed++;
            return fallbackValue;
        }

        try {
            const result = await operation();
            
            // Success - reset circuit breaker if in HALF_OPEN
            if (this.circuitBreaker.state === 'HALF_OPEN') {
                this.resetCircuitBreaker();
                logger.info('[Cache] Circuit breaker: HALF_OPEN -> CLOSED');
            }
            
            return result;
        } catch (error) {
            logger.warn('[Cache] Redis operation failed, using fallback:', error.message);
            this.handleRedisFailure();
            return fallbackValue;
        }
    }

    // Enhanced get with memory fallback
    async get(key) {
        // Try Redis first
        const redisResult = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            const result = await this.client.get(key);
            if (result) {
                this.cacheStats.redisHits++;
                // Update memory cache
                this.setMemoryCache(key, result);
            }
            return result;
        });

        if (redisResult !== null) {
            return redisResult;
        }

        // Fallback to memory cache
        const memoryResult = this.getMemoryCache(key);
        if (memoryResult !== null) {
            this.cacheStats.memoryHits++;
            return memoryResult;
        }

        this.cacheStats.misses++;
        return null;
    }

    // Enhanced set with dual storage
    async set(key, value, ttl = null) {
        const actualTtl = ttl || this.options.ttlSeconds;

        // Always store in memory as backup
        this.setMemoryCache(key, value, actualTtl);

        // Try Redis
        await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            if (actualTtl) {
                await this.client.setEx(key, actualTtl, value);
            } else {
                await this.client.set(key, value);
            }
        });

        return true;
    }

    // Memory cache operations
    setMemoryCache(key, value, ttl = null) {
        if (!this.options.enableFallback) return;

        // Evict old entries if cache is full
        if (this.memoryCache.size >= this.options.maxMemoryItems) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        const expiryTime = ttl ? Date.now() + (ttl * 1000) : null;
        this.memoryCache.set(key, {
            value,
            expiryTime,
            timestamp: Date.now()
        });
    }

    getMemoryCache(key) {
        if (!this.options.enableFallback) return null;

        const cached = this.memoryCache.get(key);
        if (!cached) return null;

        // Check expiry
        if (cached.expiryTime && Date.now() > cached.expiryTime) {
            this.memoryCache.delete(key);
            return null;
        }

        // LRU - move to end
        this.memoryCache.delete(key);
        this.memoryCache.set(key, cached);

        return cached.value;
    }

    // Vector search with fallback
    async searchSimilar(queryEmbedding, topK = 3) {
        const result = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
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
        }, []);

        return result || [];
    }

    // Enhanced add cache with versioning
    async addCache(id, question, embeddingArray, query) {
        const key = this.generateVectorKey(id);

        await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
            const buffer = this.serializeEmbedding(embeddingArray);
            
            await this.client.hSet(key, {
                question,
                embedding: buffer,
                query,
                created_date: Date.now().toString(),
                version: this.currentDataVersion || '1'
            });

            await this.client.expire(key, this.options.ttlSeconds);
        });

        logger.info(`[Cache] Cached question: ${id}`);
    }

    // Rate limiting with fallback
    async isRateLimited(identifier, limit = 5, window = 60) {
        const result = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
            const key = `rate-limit:${identifier}`;
            const current = await this.client.incr(key);

            if (current === 1) {
                await this.client.expire(key, window);
            }

            return current > limit;
        }, false); // Fallback: don't rate limit if Redis is down

        return result;
    }

    async getRemainingLimit(identifier, limit = 5, window = 60) {
        const result = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
            const key = `rate-limit:${identifier}`;
            const current = await this.client.get(key);
            const ttl = await this.client.ttl(key);

            return {
                remaining: Math.max(limit - (parseInt(current) || 0), 0),
                resetIn: ttl >= 0 ? ttl : window
            };
        }, { remaining: limit, resetIn: window });

        return result;
    }

    // Index management
    async createIndexIfNotExists() {
        await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
            try {
                await this.client.ft.info(this.indexName);
                logger.info(`[Cache] Index ${this.indexName} already exists`);
            } catch (err) {
                if (err?.message?.toLowerCase().includes('unknown index name')) {
                    logger.info(`[Cache] Creating index: ${this.indexName}`);
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
                            created_date: { type: 'NUMERIC' },
                            version: { type: 'TEXT' }
                        },
                        {
                            ON: 'HASH',
                            PREFIX: this.prefix
                        }
                    );
                    logger.info(`[Cache] Index ${this.indexName} created successfully`);
                } else {
                    throw err;
                }
            }
        });
    }

    // Utility methods
    serializeEmbedding(embeddingArray) {
        const buffer = Buffer.alloc(4 * embeddingArray.length);
        embeddingArray.forEach((v, i) => buffer.writeFloatLE(v, i * 4));
        return buffer;
    }

    // Health check
    async healthCheck() {
        const redisHealth = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            await this.client.ping();
            return true;
        }, false);

        return {
            redis: {
                available: redisHealth,
                circuitBreakerState: this.circuitBreaker.state,
                failures: this.circuitBreaker.failures,
                lastError: this.lastRedisError?.message
            },
            memory: {
                enabled: this.options.enableFallback,
                size: this.memoryCache.size,
                maxSize: this.options.maxMemoryItems
            },
            stats: this.cacheStats,
            dataVersion: this.currentDataVersion
        };
    }

    // Statistics
    getStats() {
        const total = this.cacheStats.redisHits + this.cacheStats.memoryHits + this.cacheStats.misses;
        const hitRate = total > 0 ? ((this.cacheStats.redisHits + this.cacheStats.memoryHits) / total * 100).toFixed(2) : 0;

        return {
            ...this.cacheStats,
            total,
            hitRate: `${hitRate}%`,
            memorySize: this.memoryCache.size,
            redisAvailable: this.isRedisAvailable,
            circuitBreakerState: this.circuitBreaker.state
        };
    }

    // Periodic tasks
    startPeriodicTasks() {
        // Memory cache cleanup
        setInterval(() => {
            this.cleanupMemoryCache();
        }, 30 * 60 * 1000); // 30 minutes

        // Data version check
        setInterval(() => {
            this.loadDataVersion();
        }, this.dataVersionCheckInterval);

        // Stats logging
        setInterval(() => {
            logger.info('[Cache] Stats:', this.getStats());
        }, 10 * 60 * 1000); // 10 minutes
    }

    cleanupMemoryCache() {
        if (!this.options.enableFallback) return;

        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiryTime && now > value.expiryTime) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`[Cache] Cleaned ${cleaned} expired memory entries`);
        }
    }

    // Graceful shutdown
    async disconnect() {
        try {
            if (this.client?.isOpen) {
                await this.client.quit();
                logger.info('[Cache] Redis client disconnected');
            }
        } catch (error) {
            logger.error('[Cache] Error during disconnect:', error.message);
        }
    }
}

module.exports = CacheService;