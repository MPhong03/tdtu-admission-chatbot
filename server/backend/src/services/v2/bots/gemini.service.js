const axios = require("axios");
const crypto = require("crypto");
const logger = require("../../../utils/logger.util");
const CommonRepo = require('../../../repositories/systemconfigs/common.repository');

class GeminiService {
    constructor() {
        this.apiUrl = process.env.GEMINI_API_URL;
        this.apiKey = process.env.GEMINI_API_KEY;

        // Request management
        this.requestQueue = [];
        this.activeRequests = 0;
        this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 6;
        this.requestDelay = parseInt(process.env.REQUEST_DELAY) || 500;
        this.lastRequestTime = 0;

        // Circuit breaker
        this.circuitBreaker = {
            enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
            failures: 0,
            threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 3,
            timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 30000,
            lastFailTime: 0,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
        };

        // Performance tracking
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            responseTimeSum: 0,
            lastResetTime: Date.now()
        };
    }

    async loadConfig() {
        try {
            const config = await CommonRepo.getValues(['gemini_api_url', 'gemini_api_key']);
            const dbApiUrl = config.gemini_api_url?.trim();
            const dbApiKey = config.gemini_api_key?.trim();

            if (dbApiUrl && dbApiKey) {
                // Validate config
                const res = await axios.post(
                    `${dbApiUrl}?key=${dbApiKey}`,
                    { contents: [{ parts: [{ text: "Ping" }] }] },
                    { timeout: 5000 }
                );

                if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    this.apiUrl = dbApiUrl;
                    this.apiKey = dbApiKey;
                    logger.info("[Gemini] Using database config");
                    return;
                }
            }
        } catch (err) {
            logger.warn("[Gemini] Database config validation failed");
        }

        logger.info("[Gemini] Using environment config");
    }

    shouldSkipGemini() {
        if (!this.circuitBreaker.enabled) return false;

        const now = Date.now();
        switch (this.circuitBreaker.state) {
            case 'OPEN':
                if (now - this.circuitBreaker.lastFailTime > this.circuitBreaker.timeout) {
                    this.circuitBreaker.state = 'HALF_OPEN';
                    logger.info('[Circuit Breaker] OPEN -> HALF_OPEN');
                    return false;
                }
                return true;
            case 'HALF_OPEN':
                return false;
            case 'CLOSED':
            default:
                return false;
        }
    }

    handleFailure(error, requestId) {
        this.stats.failedRequests++;
        
        // Phân loại lỗi chi tiết
        let errorType = 'unknown';
        let errorDetails = {
            message: error.message,
            code: error.code || '',
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            retryCount: 0
        };

        // Phân loại lỗi dựa trên status code hoặc error message
        if (error?.response?.status === 429) {
            errorType = 'api_rate_limit';
        } else if (error?.response?.status === 401 || error?.response?.status === 403) {
            errorType = 'api_authentication';
        } else if (error?.response?.status === 402) {
            errorType = 'api_quota_exceeded';
        } else if (error.message.includes('timeout') || error?.response?.status === 408) {
            errorType = 'api_timeout';
        } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            errorType = 'system_error';
        } else {
            errorType = 'system_error';
        }

        logger.error(`[Gemini] Request ${requestId} failed`, {
            errorType,
            errorDetails,
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests
        });

        // Update circuit breaker
        this.circuitBreaker.recordFailure();

        return {
            errorType,
            errorDetails,
            originalError: error
        };
    }

    resetCircuitBreaker() {
        if (!this.circuitBreaker.enabled) return;
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.lastFailTime = 0;
    }

    async queueRequest(prompt, priority = 'normal') {
        return new Promise((resolve, reject) => {
            const request = {
                prompt,
                priority,
                resolve,
                reject,
                timestamp: Date.now(),
                retryCount: 0,
                id: Math.random().toString(36).substr(2, 9)
            };

            if (priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }

            this.processQueue();

            // Timeout
            setTimeout(() => {
                const index = this.requestQueue.findIndex(r => r.id === request.id);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Request timeout'));
                }
            }, 60000);
        });
    }

    async processQueue() {
        if (this.activeRequests >= this.maxConcurrentRequests ||
            this.requestQueue.length === 0 ||
            this.shouldSkipGemini()) {
            return;
        }

        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            setTimeout(() => this.processQueue(), this.requestDelay - timeSinceLastRequest);
            return;
        }

        const request = this.requestQueue.shift();
        if (!request) return;

        this.activeRequests++;
        this.lastRequestTime = now;
        this.stats.totalRequests++;

        try {
            const startTime = Date.now();
            const result = await this.callDirect(request.prompt);
            const responseTime = Date.now() - startTime;

            // Update stats
            this.stats.successfulRequests++;
            this.stats.responseTimeSum += responseTime;
            this.stats.avgResponseTime = Math.round(
                this.stats.responseTimeSum / this.stats.successfulRequests
            );

            if (this.circuitBreaker.state === 'HALF_OPEN') {
                this.resetCircuitBreaker();
            }

            request.resolve(result);

        } catch (error) {
            this.stats.failedRequests++;
            this.handleFailure(error, request.id);

            logger.error(`[Gemini] Failed request ID=${request.id}, Retry=${request.retryCount}`, {
                promptPreview: request.prompt?.substring(0, 100) + '...',
                error: {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    responseData: error.response?.data
                }
            });

            if (this.shouldRetry(request, error)) {
                const retryDelay = this.calculateRetryDelay(request.retryCount);
                setTimeout(() => {
                    request.retryCount++;
                    this.requestQueue.unshift(request);
                }, retryDelay);
            } else {
                request.reject(error);
            }

        } finally {
            this.activeRequests--;
            setTimeout(() => this.processQueue(), this.requestDelay);
        }
    }

    shouldRetry(request, error) {
        if (request.retryCount >= 2) return false;

        const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
        const retryableStatusCodes = [429, 500, 502, 503, 504];

        return retryableErrors.includes(error.code) ||
            retryableStatusCodes.includes(error.response?.status) ||
            error.message.includes('timeout');
    }

    calculateRetryDelay(retryCount) {
        const baseDelay = 1000;
        const maxDelay = 10000;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        return exponentialDelay + Math.random() * 1000;
    }

    async callDirect(prompt) {
        const timeInfo = this.getCurrentTimeInfo();
        const enhancedPrompt = `${timeInfo}\n\n${prompt}`;

        try {
            // Prompt
            // logger.info(`[Gemini] Prompt: ${enhancedPrompt}`);

            const response = await axios.post(
                `${this.apiUrl}?key=${this.apiKey}`,
                { contents: [{ parts: [{ text: enhancedPrompt }] }] },
                {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            let result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            logger.info(`[Gemini] Raw API response:`, {
                hasCandidates: !!response.data?.candidates,
                candidatesLength: response.data?.candidates?.length || 0,
                hasContent: !!response.data?.candidates?.[0]?.content,
                hasParts: !!response.data?.candidates?.[0]?.content?.parts,
                partsLength: response.data?.candidates?.[0]?.content?.parts?.length || 0,
                resultType: typeof result,
                resultLength: result?.length || 0,
                resultPreview: result ? result.substring(0, 200) + '...' : 'null'
            });

            if (typeof result === "string") {
                // Tìm JSON trong code block
                const jsonMatch = result.match(/```json\s*([\s\S]*?)```/i);
                if (jsonMatch && jsonMatch[1]) {
                    result = jsonMatch[1].trim();
                }

                // Thử parse JSON
                try {
                    const parsed = JSON.parse(result);
                    return parsed;
                } catch (e) {
                    logger.warn(`[Gemini] JSON parse failed`, JSON.stringify({
                        rawResultPreview: result?.substring(0, 200) + '...',
                        error: e.message,
                        fullResult: result
                    }));
                    // logger.warn(`[Gemini] Raw result: ${e.message}`);
                    // logger.warn(`[Gemini] Raw result: ${result}`);
                    return result;
                }
            }

            return result ?? null;
        } catch (err) {
            logger.error(`[Gemini] API call failed`, {
                error: err.message,
                stack: err.stack
            });
            return null;
        }
    }

    getCurrentTimeInfo() {
        const now = new Date();
        const vietnamTime = now.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `Thời gian hiện tại: ${vietnamTime} - Năm ${now.getFullYear()}`;
    }

    getStats() {
        const errorRate = this.stats.totalRequests > 0
            ? ((this.stats.failedRequests / this.stats.totalRequests) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            errorRate: `${errorRate}%`,
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests,
            circuitBreakerState: this.circuitBreaker.state
        };
    }

    async healthCheck() {
        try {
            await this.callDirect("Ping");
            return { status: 'healthy', available: true };
        } catch (error) {
            return { status: 'unhealthy', available: false, error: error.message };
        }
    }
}

module.exports = GeminiService;