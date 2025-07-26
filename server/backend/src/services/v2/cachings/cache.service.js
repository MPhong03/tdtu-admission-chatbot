const { createClient } = require('redis');
const crypto = require('crypto');
const logger = require("../../../utils/logger.util");

class CacheService {
    constructor(redisUrl, options = {}) {
        this.redisUrl = redisUrl;
        this.options = {
            ttlSeconds: options.ttlSeconds || 7 * 24 * 60 * 60, // 7 days
            maxMemoryItems: options.maxMemoryItems || 3000, // Increased for more caching
            enableFallback: options.enableFallback !== false,
            reconnectAttempts: options.reconnectAttempts || 5,
            reconnectDelay: options.reconnectDelay || 2000,
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 30000,
            dataVersionKey: options.dataVersionKey || 'data:version',
            
            // NEW: Gemini-specific cache optimization
            geminiCacheTtl: options.geminiCacheTtl || 24 * 60 * 60, // 24 hours for Gemini responses
            enableSmartCaching: options.enableSmartCaching !== false,
            cacheCompressionThreshold: options.cacheCompressionThreshold || 1024 // 1KB
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

        // ENHANCED: Multi-tier memory cache with different TTLs
        this.memoryCache = new Map(); // General cache
        this.geminiCache = new Map(); // Dedicated Gemini response cache
        this.promptCache = new Map(); // Template/prompt cache (longer TTL)
        
        this.cacheStats = {
            redisHits: 0,
            memoryHits: 0,
            geminiCacheHits: 0,
            promptCacheHits: 0,
            misses: 0,
            redisErrors: 0,
            fallbackUsed: 0,
            compressionSaved: 0
        };

        // Vector search index config
        this.indexName = 'idx:questions';
        this.prefix = 'question:';
        this.dim = 384;

        // Data versioning
        this.currentDataVersion = null;
        this.dataVersionCheckInterval = 5 * 60 * 1000; // 5 minutes

        // SMART CACHING: Similar question detection
        this.questionSimilarityCache = new Map();
        this.similarityThreshold = 0.85; // 85% similarity threshold

        this.initializeRedis();
        this.startPeriodicTasks();
    }

    // ===================================================
    // ENHANCED REDIS OPERATIONS (Keeping existing logic)
    // ===================================================
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

    // Circuit breaker pattern (keeping existing logic)
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

    // Data versioning for cache invalidation (keeping existing logic)
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
                
                // Clear all memory caches when data version changes
                this.memoryCache.clear();
                this.geminiCache.clear();
                this.questionSimilarityCache.clear();
                logger.info('[Cache] All memory caches cleared due to data version update');
            }
        } catch (error) {
            logger.error('[Cache] Failed to update data version:', error.message);
        }
    }

    // ===================================================
    // ENHANCED CACHE KEY GENERATION
    // ===================================================
    generateCacheKey(content, type = 'default', options = {}) {
        const version = this.currentDataVersion || '1';
        const { includeTimestamp = false, normalize = true } = options;
        
        // Normalize content for better cache hits
        let normalizedContent = normalize ? this.normalizeContent(content) : content;
        
        // Optional timestamp for time-sensitive queries
        const timeComponent = includeTimestamp ? `_${Math.floor(Date.now() / (1000 * 60 * 60))}` : ''; // Hour-based
        
        const combined = `${normalizedContent}_${type}_v${version}${timeComponent}`;
        const hash = crypto.createHash('md5').update(combined, 'utf8').digest('hex');
        return `cache:${type}:${hash.substring(0, 16)}`;
    }

    normalizeContent(content) {
        return content
            .toLowerCase()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s]/g, '') // Remove special chars
            .trim();
    }

    // ===================================================
    // SMART SIMILARITY-BASED CACHING
    // ===================================================
    generateSimilarityKey(question) {
        return crypto.createHash('md5')
            .update(this.normalizeContent(question))
            .digest('hex')
            .substring(0, 12);
    }

    async findSimilarCachedResponse(question, type) {
        if (!this.options.enableSmartCaching) return null;

        const similarityKey = this.generateSimilarityKey(question);
        
        // Check for exact match first
        const exactKey = this.generateCacheKey(question, type);
        let result = await this.get(exactKey);
        if (result) {
            this.questionSimilarityCache.set(similarityKey, exactKey);
            return result;
        }

        // Check similarity cache
        const cachedKey = this.questionSimilarityCache.get(similarityKey);
        if (cachedKey) {
            result = await this.get(cachedKey);
            if (result) {
                this.cacheStats.geminiCacheHits++;
                logger.info(`[Cache] Similarity hit for: ${question.substring(0, 50)}...`);
                return result;
            }
        }

        return null;
    }

    async setSimilarCachedResponse(question, type, response) {
        const exactKey = this.generateCacheKey(question, type);
        const similarityKey = this.generateSimilarityKey(question);
        
        // Store in both caches
        await this.set(exactKey, response);
        this.questionSimilarityCache.set(similarityKey, exactKey);
        
        // Limit similarity cache size
        if (this.questionSimilarityCache.size > 500) {
            const firstKey = this.questionSimilarityCache.keys().next().value;
            this.questionSimilarityCache.delete(firstKey);
        }
    }

    // ===================================================
    // SPECIALIZED GEMINI CACHE METHODS
    // ===================================================
    async getGeminiResponse(prompt, type = 'gemini') {
        // Try similarity-based cache first
        const similarResponse = await this.findSimilarCachedResponse(prompt, type);
        if (similarResponse) return similarResponse;

        // Fallback to regular cache
        const cacheKey = this.generateCacheKey(prompt, type);
        return await this.get(cacheKey);
    }

    async setGeminiResponse(prompt, type = 'gemini', response, customTtl = null) {
        const ttl = customTtl || this.options.geminiCacheTtl;
        
        // Store with similarity tracking
        await this.setSimilarCachedResponse(prompt, type, response);
        
        // Also store in dedicated Gemini memory cache with longer TTL
        this.setGeminiMemoryCache(prompt, response, ttl);
        
        logger.info(`[Cache] Gemini response cached: ${type}`);
    }

    setGeminiMemoryCache(prompt, response, ttl) {
        const key = this.generateCacheKey(prompt, 'gemini_memory');
        const expiryTime = Date.now() + (ttl * 1000);
        
        // Evict if needed
        if (this.geminiCache.size >= 1000) { // Dedicated limit for Gemini cache
            const firstKey = this.geminiCache.keys().next().value;
            this.geminiCache.delete(firstKey);
        }

        this.geminiCache.set(key, {
            response,
            expiryTime,
            timestamp: Date.now(),
            accessCount: 0
        });
    }

    getGeminiMemoryCache(prompt) {
        const key = this.generateCacheKey(prompt, 'gemini_memory');
        const cached = this.geminiCache.get(key);
        
        if (!cached) return null;

        // Check expiry
        if (Date.now() > cached.expiryTime) {
            this.geminiCache.delete(key);
            return null;
        }

        // Update access stats and LRU
        cached.accessCount++;
        this.geminiCache.delete(key);
        this.geminiCache.set(key, cached);
        
        this.cacheStats.geminiCacheHits++;
        return cached.response;
    }

    // ===================================================
    // COMPRESSION FOR LARGE RESPONSES
    // ===================================================
    compressIfNeeded(data) {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        
        if (jsonString.length > this.options.cacheCompressionThreshold) {
            try {
                const zlib = require('zlib');
                const compressed = zlib.gzipSync(jsonString);
                this.cacheStats.compressionSaved += jsonString.length - compressed.length;
                
                return {
                    compressed: true,
                    data: compressed.toString('base64')
                };
            } catch (error) {
                logger.warn('[Cache] Compression failed:', error.message);
            }
        }
        
        return { compressed: false, data: jsonString };
    }

    decompressIfNeeded(cachedData) {
        if (typeof cachedData === 'object' && cachedData.compressed) {
            try {
                const zlib = require('zlib');
                const buffer = Buffer.from(cachedData.data, 'base64');
                const decompressed = zlib.gunzipSync(buffer).toString();
                return JSON.parse(decompressed);
            } catch (error) {
                logger.warn('[Cache] Decompression failed:', error.message);
                return null;
            }
        }
        
        return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    }

    generateVectorKey(id) {
        const version = this.currentDataVersion || '1';
        return `${this.prefix}${id}_v${version}`;
    }

    // Resilient Redis operations with fallback (keeping existing logic)
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

    // ===================================================
    // ENHANCED GET/SET WITH MULTI-TIER CACHING
    // ===================================================
    async get(key) {
        // 1. Try dedicated Gemini memory cache first
        if (key.includes('gemini')) {
            const geminiResult = this.getGeminiMemoryCache(key);
            if (geminiResult !== null) {
                return geminiResult;
            }
        }

        // 2. Try Redis
        const redisResult = await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            const result = await this.client.get(key);
            if (result) {
                this.cacheStats.redisHits++;
                const decompressed = this.decompressIfNeeded(JSON.parse(result));
                // Update memory cache
                this.setMemoryCache(key, decompressed);
                return decompressed;
            }
            return null;
        });

        if (redisResult !== null) {
            return redisResult;
        }

        // 3. Fallback to general memory cache
        const memoryResult = this.getMemoryCache(key);
        if (memoryResult !== null) {
            this.cacheStats.memoryHits++;
            return memoryResult;
        }

        this.cacheStats.misses++;
        return null;
    }

    async set(key, value, ttl = null) {
        const actualTtl = ttl || this.options.ttlSeconds;
        const compressed = this.compressIfNeeded(value);

        // Always store in memory as backup
        this.setMemoryCache(key, value, actualTtl);

        // Try Redis with compression
        await this.executeRedisOperation(async () => {
            if (!this.client?.isOpen) throw new Error('Redis not connected');
            
            const dataToStore = JSON.stringify(compressed);
            
            if (actualTtl) {
                await this.client.setEx(key, actualTtl, dataToStore);
            } else {
                await this.client.set(key, dataToStore);
            }
        });

        return true;
    }

    // ===================================================
    // TEMPLATE/PROMPT CACHING (VERY LONG TTL)
    // ===================================================
    setPromptCache(templateName, content) {
        const key = `prompt:${templateName}`;
        
        // Evict if needed
        if (this.promptCache.size >= 50) {
            const firstKey = this.promptCache.keys().next().value;
            this.promptCache.delete(firstKey);
        }

        this.promptCache.set(key, {
            content,
            timestamp: Date.now()
        });
    }

    getPromptCache(templateName) {
        const key = `prompt:${templateName}`;
        const cached = this.promptCache.get(key);
        
        if (cached) {
            this.cacheStats.promptCacheHits++;
            return cached.content;
        }
        
        return null;
    }

    // Memory cache operations (enhanced)
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
            timestamp: Date.now(),
            compressed: false
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

    // Vector search with fallback (keeping existing)
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
                generalCacheSize: this.memoryCache.size,
                geminiCacheSize: this.geminiCache.size,
                promptCacheSize: this.promptCache.size,
                similarityCacheSize: this.questionSimilarityCache.size,
                maxSize: this.options.maxMemoryItems
            },
            stats: this.getStats(),
            dataVersion: this.currentDataVersion,
            optimization: {
                smartCaching: this.options.enableSmartCaching,
                compressionEnabled: this.options.cacheCompressionThreshold > 0,
                compressionSavings: this.cacheStats.compressionSaved
            }
        };
    }

    // ===================================================
    // ENHANCED STATISTICS
    // ===================================================
    getStats() {
        const total = this.cacheStats.redisHits + this.cacheStats.memoryHits + 
                     this.cacheStats.geminiCacheHits + this.cacheStats.promptCacheHits + 
                     this.cacheStats.misses;
        
        const hitRate = total > 0 ? 
            ((this.cacheStats.redisHits + this.cacheStats.memoryHits + 
              this.cacheStats.geminiCacheHits + this.cacheStats.promptCacheHits) / total * 100).toFixed(2) : 0;

        const geminiHitRate = (this.cacheStats.geminiCacheHits + this.cacheStats.redisHits + this.cacheStats.memoryHits) > 0 ?
            (this.cacheStats.geminiCacheHits / (this.cacheStats.geminiCacheHits + this.cacheStats.misses) * 100).toFixed(2) : 0;

        return {
            ...this.cacheStats,
            total,
            hitRate: `${hitRate}%`,
            geminiHitRate: `${geminiHitRate}%`,
            memoryCacheSize: this.memoryCache.size,
            geminiCacheSize: this.geminiCache.size,
            promptCacheSize: this.promptCache.size,
            similarityCacheSize: this.questionSimilarityCache.size,
            redisAvailable: this.isRedisAvailable,
            circuitBreakerState: this.circuitBreaker.state,
            compressionSavings: `${(this.cacheStats.compressionSaved / 1024).toFixed(2)} KB`
        };
    }

    // ===================================================
    // CACHE WARMING STRATEGIES
    // ===================================================
    async warmCache(commonQuestions = []) {
        logger.info('[Cache] Starting cache warming...');
        
        const warmingPromises = commonQuestions.map(async (question) => {
            try {
                // Pre-generate cache keys for common question patterns
                const types = ['classification', 'cypher', 'answer'];
                for (const type of types) {
                    const key = this.generateCacheKey(question, type);
                    // Just ensure key is generated and stored in similarity cache
                    const similarityKey = this.generateSimilarityKey(question);
                    this.questionSimilarityCache.set(similarityKey, key);
                }
            } catch (error) {
                logger.warn(`[Cache] Warming failed for: ${question}`, error);
            }
        });

        await Promise.allSettled(warmingPromises);
        logger.info('[Cache] Cache warming completed');
    }

    // ===================================================
    // CLEANUP AND MAINTENANCE
    // ===================================================
    cleanupMemoryCaches() {
        const now = Date.now();
        let cleaned = 0;

        // Clean general memory cache
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expiryTime && now > value.expiryTime) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        // Clean Gemini cache
        for (const [key, value] of this.geminiCache.entries()) {
            if (now > value.expiryTime) {
                this.geminiCache.delete(key);
                cleaned++;
            }
        }

        // Clean similarity cache (remove unused entries)
        if (this.questionSimilarityCache.size > 300) {
            const keysToRemove = Array.from(this.questionSimilarityCache.keys()).slice(0, 100);
            keysToRemove.forEach(key => this.questionSimilarityCache.delete(key));
            cleaned += keysToRemove.length;
        }

        if (cleaned > 0) {
            logger.info(`[Cache] Cleaned ${cleaned} expired entries`);
        }
    }

    // Enhanced periodic tasks
    startPeriodicTasks() {
        // Memory cache cleanup every 30 minutes
        setInterval(() => {
            this.cleanupMemoryCaches();
        }, 30 * 60 * 1000);

        // Data version check every 5 minutes
        setInterval(() => {
            this.loadDataVersion();
        }, this.dataVersionCheckInterval);

        // Enhanced stats logging every 10 minutes
        setInterval(() => {
            const stats = this.getStats();
            logger.info('[Cache] Enhanced Stats:', stats);
        }, 10 * 60 * 1000);

        // Cache optimization every hour
        setInterval(() => {
            this.optimizeCaches();
        }, 60 * 60 * 1000);
    }

    optimizeCaches() {
        // Remove least accessed items from Gemini cache if it's getting full
        if (this.geminiCache.size > 800) {
            const entries = Array.from(this.geminiCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount)
                .slice(0, 200); // Remove 200 least accessed

            entries.forEach(([key]) => this.geminiCache.delete(key));
            logger.info(`[Cache] Optimized Gemini cache, removed ${entries.length} items`);
        }
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
            
            // Clear all memory caches
            this.memoryCache.clear();
            this.geminiCache.clear();
            this.promptCache.clear();
            this.questionSimilarityCache.clear();
            
            logger.info('[Cache] All caches cleared');
        } catch (error) {
            logger.error('[Cache] Error during disconnect:', error.message);
        }
    }
}

module.exports = CacheService;