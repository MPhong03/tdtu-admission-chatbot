const logger = require("../../../utils/logger.util");

class MonitoringService {
    constructor(geminiService, cacheService) {
        this.gemini = geminiService;
        this.cache = cacheService;
        this.startBackgroundTasks();
    }

    async healthCheck() {
        const [geminiHealth, cacheHealth, databaseHealth] = await Promise.allSettled([
            this.gemini.healthCheck(),
            this.cache.healthCheck(),
            this.checkDatabaseHealth()
        ]);

        const overallHealth = this.determineOverallHealth([
            geminiHealth.value || geminiHealth.reason,
            cacheHealth.value || cacheHealth.reason,
            databaseHealth.value || databaseHealth.reason
        ]);

        return {
            status: overallHealth,
            timestamp: new Date().toISOString(),
            services: {
                gemini: geminiHealth.value || { status: 'unhealthy', error: geminiHealth.reason?.message },
                cache: cacheHealth.value || { status: 'unhealthy', error: cacheHealth.reason?.message },
                database: databaseHealth.value || { status: 'unhealthy', error: databaseHealth.reason?.message }
            }
        };
    }

    async checkDatabaseHealth() {
        try {
            const neo4jRepository = require("../../../repositories/v2/common/neo4j.repository");
            await neo4jRepository.execute('RETURN 1 as health', {});
            return { status: 'healthy', available: true };
        } catch (error) {
            return {
                status: 'unhealthy',
                available: false,
                error: error.message
            };
        }
    }

    determineOverallHealth(healthChecks) {
        const unhealthyServices = healthChecks.filter(h => h.status !== 'healthy');
        if (unhealthyServices.length === 0) return 'healthy';
        if (unhealthyServices.length <= 1) return 'degraded';
        return 'unhealthy';
    }

    getPerformanceStats() {
        return {
            gemini: this.gemini.getStats(),
            cache: this.cache.getStats()
        };
    }

    startBackgroundTasks() {
        // Performance logging every 10 minutes
        setInterval(() => {
            const stats = this.getPerformanceStats();
            logger.info('[Performance] Combined Stats:', stats);
        }, 10 * 60 * 1000);

        // Health check every 5 minutes
        setInterval(async () => {
            try {
                const health = await this.healthCheck();
                if (health.status !== 'healthy') {
                    logger.warn('[Health] System degraded:', health);
                }
            } catch (error) {
                logger.error('[Health] Check failed:', error);
            }
        }, 5 * 60 * 1000);
    }
}

module.exports = MonitoringService;