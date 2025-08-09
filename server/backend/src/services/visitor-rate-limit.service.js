const CacheService = require('./v2/cachings/cache.service');
const logger = require('../utils/logger.util');

class VisitorRateLimitService {
    constructor() {
        this.cache = new CacheService(process.env.REDIS_URL);
        this.config = {
            chatLimit: 20,
            chatWindow: 5 * 60 * 60, // 5 giờ = 18000 giây
            keyPrefix: 'visitor-chat'
        };
    }

    /**
     * Tạo key cho Redis để track rate limit
     * @param {string} visitorId - ID của visitor
     * @param {string} type - Loại rate limit (chat, api, etc.)
     * @returns {string} Redis key
     */
    generateKey(visitorId, type = 'chat') {
        return `${this.config.keyPrefix}:${type}:${visitorId}`;
    }

    /**
     * Kiểm tra xem visitor có bị rate limit không
     * @param {string} visitorId - ID của visitor
     * @param {string} type - Loại rate limit
     * @returns {Promise<boolean>} true nếu bị limit
     */
    async isRateLimited(visitorId, type = 'chat') {
        try {
            const key = this.generateKey(visitorId, type);
            const limit = type === 'chat' ? this.config.chatLimit : 10;
            const window = type === 'chat' ? this.config.chatWindow : 3600;

            return await this.cache.isRateLimited(key, limit, window);
        } catch (error) {
            logger.error('[VisitorRateLimit] Error checking rate limit:', error);
            return false; // Nếu có lỗi, không limit để tránh gián đoạn service
        }
    }

    /**
     * Lấy thông tin về rate limit hiện tại
     * @param {string} visitorId - ID của visitor
     * @param {string} type - Loại rate limit
     * @returns {Promise<Object>} Thông tin rate limit
     */
    async getRateLimitInfo(visitorId, type = 'chat') {
        try {
            const key = this.generateKey(visitorId, type);
            const limit = type === 'chat' ? this.config.chatLimit : 10;
            const window = type === 'chat' ? this.config.chatWindow : 3600;

            const info = await this.cache.getRemainingLimit(key, limit, window);
            
            // Tính thời gian reset
            const resetTime = new Date(Date.now() + (info.resetIn * 1000));
            const resetTimeString = resetTime.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            return {
                ...info,
                limit,
                window,
                resetTime: resetTimeString,
                resetTimestamp: resetTime.getTime(),
                isLimited: info.remaining <= 0
            };
        } catch (error) {
            logger.error('[VisitorRateLimit] Error getting rate limit info:', error);
            return {
                remaining: 0,
                resetIn: 0,
                limit: 0,
                window: 0,
                resetTime: 'Unknown',
                resetTimestamp: 0,
                isLimited: false
            };
        }
    }

    /**
     * Reset rate limit cho một visitor (dành cho admin)
     * @param {string} visitorId - ID của visitor
     * @param {string} type - Loại rate limit
     * @returns {Promise<boolean>} true nếu reset thành công
     */
    async resetRateLimit(visitorId, type = 'chat') {
        try {
            const key = this.generateKey(visitorId, type);
            await this.cache.client.del(key);
            logger.info(`[VisitorRateLimit] Reset rate limit for visitor ${visitorId}, type: ${type}`);
            return true;
        } catch (error) {
            logger.error('[VisitorRateLimit] Error resetting rate limit:', error);
            return false;
        }
    }

    /**
     * Lấy thống kê rate limit cho tất cả visitors
     * @returns {Promise<Object>} Thống kê tổng quan
     */
    async getRateLimitStats() {
        try {
            // Lấy tất cả keys có pattern visitor-chat:*
            const pattern = `${this.config.keyPrefix}:*`;
            const keys = await this.cache.client.keys(pattern);
            
            const stats = {
                totalVisitors: keys.length,
                limitedVisitors: 0,
                activeVisitors: 0,
                totalRequests: 0
            };

            for (const key of keys) {
                const count = await this.cache.client.get(key);
                const ttl = await this.cache.client.ttl(key);
                
                if (count) {
                    const requestCount = parseInt(count);
                    stats.totalRequests += requestCount;
                    
                    if (requestCount >= this.config.chatLimit) {
                        stats.limitedVisitors++;
                    }
                    
                    if (ttl > 0) {
                        stats.activeVisitors++;
                    }
                }
            }

            return stats;
        } catch (error) {
            logger.error('[VisitorRateLimit] Error getting stats:', error);
            return {
                totalVisitors: 0,
                limitedVisitors: 0,
                activeVisitors: 0,
                totalRequests: 0
            };
        }
    }

    /**
     * Cleanup các rate limit keys đã hết hạn
     * @returns {Promise<number>} Số lượng keys đã cleanup
     */
    async cleanupExpiredKeys() {
        try {
            const pattern = `${this.config.keyPrefix}:*`;
            const keys = await this.cache.client.keys(pattern);
            
            let cleanedCount = 0;
            for (const key of keys) {
                const ttl = await this.cache.client.ttl(key);
                if (ttl <= 0) {
                    await this.cache.client.del(key);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.info(`[VisitorRateLimit] Cleaned up ${cleanedCount} expired rate limit keys`);
            }

            return cleanedCount;
        } catch (error) {
            logger.error('[VisitorRateLimit] Error cleaning up expired keys:', error);
            return 0;
        }
    }

    /**
     * Tăng counter cho một visitor
     * @param {string} visitorId - ID của visitor
     * @param {string} type - Loại rate limit
     * @returns {Promise<number>} Số request hiện tại
     */
    async incrementCounter(visitorId, type = 'chat') {
        try {
            const key = this.generateKey(visitorId, type);
            const limit = type === 'chat' ? this.config.chatLimit : 10;
            const window = type === 'chat' ? this.config.chatWindow : 3600;

            const current = await this.cache.client.incr(key);
            
            // Set TTL nếu đây là request đầu tiên
            if (current === 1) {
                await this.cache.client.expire(key, window);
            }

            return current;
        } catch (error) {
            logger.error('[VisitorRateLimit] Error incrementing counter:', error);
            return 0;
        }
    }
}

module.exports = VisitorRateLimitService;