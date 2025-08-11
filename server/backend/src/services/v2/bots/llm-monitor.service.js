const logger = require("../../../utils/logger.util");

class LLMMonitorService {
    constructor() {
        this.stats = {
            totalCalls: 0,
            callsThisMinute: 0,
            callsThisHour: 0,
            lastMinuteReset: Date.now(),
            lastHourReset: Date.now(),
            averageResponseTime: 0,
            totalResponseTime: 0,
            cacheHitRate: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        this.thresholds = {
            callsPerMinute: parseInt(process.env.LLM_CALLS_PER_MINUTE_THRESHOLD) || 100,
            callsPerHour: parseInt(process.env.LLM_CALLS_PER_HOUR_THRESHOLD) || 2000,
            averageResponseTime: parseInt(process.env.LLM_AVG_RESPONSE_THRESHOLD) || 5000, // 5s
            cacheHitRateThreshold: parseFloat(process.env.CACHE_HIT_RATE_THRESHOLD) || 0.7
        };

        this.optimizationMode = false;
        this.optimizationStartTime = null;

        // Reset counters periodically
        this.setupPeriodicReset();
    }

    setupPeriodicReset() {
        // Reset minute counter every minute
        setInterval(() => {
            this.stats.callsThisMinute = 0;
            this.stats.lastMinuteReset = Date.now();
        }, 60000);

        // Reset hour counter every hour
        setInterval(() => {
            this.stats.callsThisHour = 0;
            this.stats.lastHourReset = Date.now();
        }, 3600000);
    }

    recordLLMCall(serviceName, responseTime, fromCache = false) {
        this.stats.totalCalls++;
        this.stats.callsThisMinute++;
        this.stats.callsThisHour++;

        // Update response time average
        this.stats.totalResponseTime += responseTime;
        this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalCalls;

        // Update cache stats
        if (fromCache) {
            this.stats.cacheHits++;
        } else {
            this.stats.cacheMisses++;
        }
        
        const totalCacheAttempts = this.stats.cacheHits + this.stats.cacheMisses;
        this.stats.cacheHitRate = totalCacheAttempts > 0 ? this.stats.cacheHits / totalCacheAttempts : 0;

        // Check thresholds
        this.checkThresholds();

        logger.debug(`[LLMMonitor] ${serviceName}: ${responseTime}ms, cache: ${fromCache}, total: ${this.stats.totalCalls}`);
    }

    checkThresholds() {
        let shouldOptimize = false;
        const reasons = [];

        // Check calls per minute
        if (this.stats.callsThisMinute > this.thresholds.callsPerMinute) {
            shouldOptimize = true;
            reasons.push(`High calls/minute: ${this.stats.callsThisMinute}/${this.thresholds.callsPerMinute}`);
        }

        // Check calls per hour
        if (this.stats.callsThisHour > this.thresholds.callsPerHour) {
            shouldOptimize = true;
            reasons.push(`High calls/hour: ${this.stats.callsThisHour}/${this.thresholds.callsPerHour}`);
        }

        // Check average response time
        if (this.stats.averageResponseTime > this.thresholds.averageResponseTime) {
            shouldOptimize = true;
            reasons.push(`Slow response: ${this.stats.averageResponseTime.toFixed(0)}ms/${this.thresholds.averageResponseTime}ms`);
        }

        // Check cache hit rate
        if (this.stats.cacheHitRate < this.thresholds.cacheHitRateThreshold && this.stats.totalCalls > 10) {
            shouldOptimize = true;
            reasons.push(`Low cache hit rate: ${(this.stats.cacheHitRate * 100).toFixed(1)}%/${(this.thresholds.cacheHitRateThreshold * 100)}%`);
        }

        if (shouldOptimize && !this.optimizationMode) {
            this.enableOptimizationMode(reasons);
        } else if (!shouldOptimize && this.optimizationMode) {
            this.disableOptimizationMode();
        }
    }

    enableOptimizationMode(reasons) {
        this.optimizationMode = true;
        this.optimizationStartTime = Date.now();
        logger.warn(`[LLMMonitor] OPTIMIZATION MODE ENABLED: ${reasons.join(', ')}`);
    }

    disableOptimizationMode() {
        const duration = Date.now() - this.optimizationStartTime;
        this.optimizationMode = false;
        this.optimizationStartTime = null;
        logger.info(`[LLMMonitor] Optimization mode disabled after ${(duration / 1000).toFixed(1)}s`);
    }

    // Get optimization recommendations
    getOptimizationRecommendations() {
        const recommendations = [];

        if (this.stats.callsThisMinute > this.thresholds.callsPerMinute * 0.8) {
            recommendations.push({
                type: 'reduce_enrichment',
                priority: 'high',
                description: 'Reduce enrichment steps to 1-2 max'
            });
        }

        if (this.stats.cacheHitRate < 0.5) {
            recommendations.push({
                type: 'aggressive_caching',
                priority: 'high', 
                description: 'Enable aggressive caching with longer TTL'
            });
        }

        if (this.stats.averageResponseTime > this.thresholds.averageResponseTime * 0.8) {
            recommendations.push({
                type: 'skip_validation',
                priority: 'medium',
                description: 'Skip validation for simple queries'
            });
        }

        return recommendations;
    }

    // Check if should apply optimization
    shouldApplyOptimization(optimizationType) {
        if (!this.optimizationMode) return false;

        const recommendations = this.getOptimizationRecommendations();
        return recommendations.some(r => r.type === optimizationType && r.priority === 'high');
    }

    getStats() {
        return {
            ...this.stats,
            optimizationMode: this.optimizationMode,
            optimizationDuration: this.optimizationStartTime ? Date.now() - this.optimizationStartTime : 0,
            recommendations: this.getOptimizationRecommendations()
        };
    }

    // Reset stats (for admin)
    resetStats() {
        this.stats = {
            totalCalls: 0,
            callsThisMinute: 0,
            callsThisHour: 0,
            lastMinuteReset: Date.now(),
            lastHourReset: Date.now(),
            averageResponseTime: 0,
            totalResponseTime: 0,
            cacheHitRate: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.disableOptimizationMode();
        logger.info("[LLMMonitor] Stats reset");
    }
}

module.exports = LLMMonitorService;