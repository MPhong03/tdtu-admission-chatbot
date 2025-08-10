const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
const VisitorRateLimitService = require('../services/visitor-rate-limit.service');
const botService = require('../services/v2/bots/bot.service');

const visitorRateLimitService = new VisitorRateLimitService();

// ============= ADMIN API FOR VISITOR RATE LIMIT ============= //

/**
 * Lấy thống kê tổng quan về visitor rate limit
 * GET /admin/visitor-rate-limit/stats
 * Headers: Authorization: Bearer <admin-token>
 */
router.get("/visitor-rate-limit/stats", verifyToken, isAdmin, async (req, res) => {
    try {
        const stats = await visitorRateLimitService.getRateLimitStats();
        res.json({
            Code: 1,
            Message: "Lấy thống kê thành công",
            Data: stats
        });
    } catch (error) {
        console.error("[Admin] Error getting rate limit stats:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi lấy thống kê",
            Data: null
        });
    }
});

/**
 * Reset rate limit cho một visitor cụ thể
 * POST /admin/visitor-rate-limit/reset
 * Headers: Authorization: Bearer <admin-token>
 * Body: { "visitorId": String, "type": String (optional, default: "chat") }
 */
router.post("/visitor-rate-limit/reset", verifyToken, isAdmin, async (req, res) => {
    try {
        const { visitorId, type = 'chat' } = req.body;
        
        if (!visitorId) {
            return res.status(400).json({
                Code: -1,
                Message: "Visitor ID là bắt buộc",
                Data: null
            });
        }

        const success = await visitorRateLimitService.resetRateLimit(visitorId, type);
        
        if (success) {
            res.json({
                Code: 1,
                Message: `Đã reset rate limit cho visitor ${visitorId}`,
                Data: { visitorId, type }
            });
        } else {
            res.status(500).json({
                Code: -1,
                Message: "Không thể reset rate limit",
                Data: null
            });
        }
    } catch (error) {
        console.error("[Admin] Error resetting rate limit:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi reset rate limit",
            Data: null
        });
    }
});

/**
 * Cleanup các rate limit keys đã hết hạn
 * POST /admin/visitor-rate-limit/cleanup
 * Headers: Authorization: Bearer <admin-token>
 */
router.post("/visitor-rate-limit/cleanup", verifyToken, isAdmin, async (req, res) => {
    try {
        const cleanedCount = await visitorRateLimitService.cleanupExpiredKeys();
        res.json({
            Code: 1,
            Message: `Đã cleanup ${cleanedCount} expired keys`,
            Data: { cleanedCount }
        });
    } catch (error) {
        console.error("[Admin] Error cleaning up expired keys:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi cleanup expired keys",
            Data: null
        });
    }
});

/**
 * Lấy thông tin rate limit của một visitor cụ thể
 * GET /admin/visitor-rate-limit/:visitorId
 * Headers: Authorization: Bearer <admin-token>
 * Query: type (optional, default: "chat")
 */
router.get("/visitor-rate-limit/:visitorId", verifyToken, isAdmin, async (req, res) => {
    try {
        const { visitorId } = req.params;
        const { type = 'chat' } = req.query;
        
        const info = await visitorRateLimitService.getRateLimitInfo(visitorId, type);
        res.json({
            Code: 1,
            Message: "Lấy thông tin rate limit thành công",
            Data: { visitorId, type, ...info }
        });
    } catch (error) {
        console.error("[Admin] Error getting visitor rate limit info:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi lấy thông tin rate limit",
            Data: null
        });
    }
});

router.get('/debug/queue', async (req, res) => {
    const queueLength = await botService.getCacheService().getVerificationQueueLength();
    const status = botService.getCacheService().getQueueProcessorStatus();
    
    res.json({
        queueLength,
        processorStatus: status,
        timestamp: new Date()
    });
});

module.exports = router;