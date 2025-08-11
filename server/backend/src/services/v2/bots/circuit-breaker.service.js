const logger = require("../../../utils/logger.util");

class CircuitBreakerService {
    constructor() {
        this.circuits = new Map(); // service_name -> circuit state
        this.config = {
            failureThreshold: parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD) || 5,
            recoveryTimeout: parseInt(process.env.CIRCUIT_RECOVERY_TIMEOUT) || 60000, // 1 minute
            monitoringWindow: parseInt(process.env.CIRCUIT_MONITORING_WINDOW) || 300000, // 5 minutes
            halfOpenMaxCalls: parseInt(process.env.CIRCUIT_HALFOPEN_MAX_CALLS) || 3
        };
    }

    // Circuit states: CLOSED, OPEN, HALF_OPEN
    getCircuitState(serviceName) {
        if (!this.circuits.has(serviceName)) {
            this.circuits.set(serviceName, {
                state: 'CLOSED',
                failures: 0,
                lastFailureTime: null,
                successCount: 0,
                totalRequests: 0,
                windowStart: Date.now()
            });
        }
        return this.circuits.get(serviceName);
    }

    async executeWithCircuitBreaker(serviceName, operation, fallbackValue = null) {
        const circuit = this.getCircuitState(serviceName);
        
        // Reset window if needed
        if (Date.now() - circuit.windowStart > this.config.monitoringWindow) {
            this.resetWindow(circuit);
        }

        // Check circuit state
        if (circuit.state === 'OPEN') {
            if (Date.now() - circuit.lastFailureTime > this.config.recoveryTimeout) {
                circuit.state = 'HALF_OPEN';
                circuit.successCount = 0;
                logger.info(`[CircuitBreaker] ${serviceName} moved to HALF_OPEN`);
            } else {
                logger.warn(`[CircuitBreaker] ${serviceName} is OPEN, returning fallback`);
                return this.getFallbackResponse(serviceName, fallbackValue);
            }
        }

        if (circuit.state === 'HALF_OPEN' && circuit.successCount >= this.config.halfOpenMaxCalls) {
            logger.warn(`[CircuitBreaker] ${serviceName} HALF_OPEN limit reached, returning fallback`);
            return this.getFallbackResponse(serviceName, fallbackValue);
        }

        // Execute operation
        circuit.totalRequests++;
        
        try {
            const result = await operation();
            this.recordSuccess(serviceName);
            return result;
        } catch (error) {
            this.recordFailure(serviceName, error);
            
            if (circuit.state === 'OPEN') {
                return this.getFallbackResponse(serviceName, fallbackValue);
            }
            
            throw error; // Re-throw if circuit is still closed/half-open
        }
    }

    recordSuccess(serviceName) {
        const circuit = this.getCircuitState(serviceName);
        
        if (circuit.state === 'HALF_OPEN') {
            circuit.successCount++;
            if (circuit.successCount >= this.config.halfOpenMaxCalls) {
                circuit.state = 'CLOSED';
                circuit.failures = 0;
                logger.info(`[CircuitBreaker] ${serviceName} recovered to CLOSED`);
            }
        } else {
            circuit.failures = Math.max(0, circuit.failures - 1); // Gradual recovery
        }
    }

    recordFailure(serviceName, error) {
        const circuit = this.getCircuitState(serviceName);
        circuit.failures++;
        circuit.lastFailureTime = Date.now();

        logger.warn(`[CircuitBreaker] ${serviceName} failure ${circuit.failures}/${this.config.failureThreshold}: ${error.message}`);

        if (circuit.failures >= this.config.failureThreshold) {
            circuit.state = 'OPEN';
            logger.error(`[CircuitBreaker] ${serviceName} circuit OPENED due to failures`);
        }
    }

    resetWindow(circuit) {
        circuit.windowStart = Date.now();
        circuit.totalRequests = 0;
        // Keep failures but reset other metrics
    }

    getFallbackResponse(serviceName, fallbackValue) {
        const fallbacks = {
            'classification': {
                category: 'simple_admission',
                confidence: 0.5,
                reasoning: 'Circuit breaker fallback'
            },
            'cypher_generation': {
                cypher: 'MATCH (d:Document) RETURN d LIMIT 5',
                reasoning: 'Circuit breaker simple query'
            },
            'enrichment_planning': {
                shouldEnrich: false,
                reasoning: 'Circuit breaker - skip enrichment'
            },
            'context_scoring': {
                score: 0.5,
                reasoning: 'Circuit breaker default score'
            },
            'answer_generation': 'Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ít phút.',
            'verification': {
                score: 0.5,
                isCorrect: true,
                reasoning: 'Circuit breaker - skip verification'
            }
        };

        return fallbackValue || fallbacks[serviceName] || null;
    }

    // Get circuit stats for monitoring
    getStats() {
        const stats = {};
        this.circuits.forEach((circuit, serviceName) => {
            stats[serviceName] = {
                state: circuit.state,
                failures: circuit.failures,
                totalRequests: circuit.totalRequests,
                failureRate: circuit.totalRequests > 0 ? circuit.failures / circuit.totalRequests : 0,
                lastFailureTime: circuit.lastFailureTime
            };
        });
        return stats;
    }

    // Force reset circuit (for admin)
    resetCircuit(serviceName) {
        if (this.circuits.has(serviceName)) {
            const circuit = this.circuits.get(serviceName);
            circuit.state = 'CLOSED';
            circuit.failures = 0;
            circuit.successCount = 0;
            circuit.lastFailureTime = null;
            logger.info(`[CircuitBreaker] Manually reset circuit for ${serviceName}`);
            return true;
        }
        return false;
    }
}

module.exports = CircuitBreakerService;