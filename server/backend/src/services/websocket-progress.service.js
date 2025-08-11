const logger = require('../utils/logger.util');

class WebSocketProgressService {
    constructor() {
        this.io = null;
        this.activeRequests = new Map(); // requestId -> { socketId, startTime }
    }

    setIO(io) {
        this.io = io;
        logger.info('[WebSocketProgressService] IO instance set');
    }

    // Tạo requestId mới
    createRequest(socketId) {
        const requestId = Math.random().toString(36).substr(2, 9);
        this.activeRequests.set(requestId, {
            socketId,
            startTime: Date.now(),
            steps: []
        });
        logger.info(`[WebSocketProgressService] Created request: ${requestId} for socket: ${socketId}`);
        return requestId;
    }

    // Đăng ký request với requestId có sẵn
    registerRequest(requestId, socketId) {
        this.activeRequests.set(requestId, {
            socketId,
            startTime: Date.now(),
            steps: []
        });
        logger.info(`[WebSocketProgressService] Registered request: ${requestId} for socket: ${socketId}`);
        return requestId;
    }

    // Gửi progress update
    emitProgress(requestId, step, description, details = {}) {
        const request = this.activeRequests.get(requestId);
        if (!request || !this.io) {
            logger.warn(`[WebSocketProgressService] Cannot emit progress for request: ${requestId}`);
            return;
        }

        const progressData = {
            requestId,
            step,
            description,
            timestamp: Date.now(),
            ...details
        };

        // Gửi progress đến tất cả socket (broadcast) để client có thể nhận
        this.io.emit('chat:progress', progressData);
        
        // Log progress
        logger.info(`[WebSocketProgressService] Progress: ${step} - ${description}`);
        
        // Lưu step vào request
        request.steps.push(progressData);
    }

    // Hoàn thành request
    completeRequest(requestId) {
        const request = this.activeRequests.get(requestId);
        if (request && this.io) {
            this.emitProgress(requestId, 'completed', 'Hoàn thành xử lý!', {
                totalSteps: request.steps.length,
                processingTime: Date.now() - request.startTime
            });
            
            // Xóa request sau khi hoàn thành
            setTimeout(() => {
                this.activeRequests.delete(requestId);
                logger.info(`[WebSocketProgressService] Cleaned up request: ${requestId}`);
            }, 5000); // Giữ 5 giây để client nhận được
        }
    }

    // Làm sạch request cũ
    cleanupOldRequests() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 phút
        
        for (const [requestId, request] of this.activeRequests.entries()) {
            if (now - request.startTime > maxAge) {
                this.activeRequests.delete(requestId);
                logger.info(`[WebSocketProgressService] Cleaned up old request: ${requestId}`);
            }
        }
    }

    // Khởi động cleanup timer
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupOldRequests();
        }, 60000); // Cleanup mỗi phút
    }

    // Lấy thống kê
    getStats() {
        return {
            activeRequests: this.activeRequests.size,
            ioConnected: !!this.io
        };
    }
}

module.exports = new WebSocketProgressService();