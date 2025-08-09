const HttpResponse = require("../data/responses/http.response");
const VisitorRateLimitService = require('../services/visitor-rate-limit.service');
const visitorRateLimitService = new VisitorRateLimitService();

/**
 * Middleware hạn chế request cho visitor khi sử dụng chatWithBot
 * - Visitor: 20 request mỗi 5 giờ
 * - User đã đăng nhập: không giới hạn
 */
const visitorChatRateLimit = async (req, res, next) => {
    try {
        // Nếu user đã đăng nhập, cho phép thoải mái
        if (req.user && req.user.id) {
            return next();
        }

        // Nếu là visitor, áp dụng rate limit
        const visitorId = req.visitorId || req.header("X-Visitor-Id") || req.query.visitorId || req.body.visitorId;
        
        if (!visitorId) {
            return res.status(400).json(HttpResponse.error("Visitor ID is required for rate limiting"));
        }

        // Kiểm tra rate limit
        const isLimited = await visitorRateLimitService.isRateLimited(visitorId, 'chat');

        if (isLimited) {
            // Lấy thông tin về remaining limit
            const info = await visitorRateLimitService.getRateLimitInfo(visitorId, 'chat');

            return res.status(429).json(HttpResponse.error(
                `Bạn đã đạt giới hạn 20 câu hỏi. Giới hạn sẽ được reset vào ${info.resetTime}. Vui lòng đăng ký tài khoản để chat không giới hạn.`,
                -1,
                { 
                    remaining: info.remaining,
                    resetIn: info.resetIn,
                    resetTime: info.resetTime,
                    limit: info.limit,
                    window: info.window
                }
            ));
        }

        // Thêm thông tin rate limit vào response headers
        const info = await visitorRateLimitService.getRateLimitInfo(visitorId, 'chat');
        res.set({
            'X-RateLimit-Limit': info.limit,
            'X-RateLimit-Remaining': info.remaining,
            'X-RateLimit-Reset': Math.floor(info.resetTimestamp / 1000)
        });

        next();
    } catch (error) {
        console.error("[VisitorRateLimit] Error:", error);
        // Nếu có lỗi với Redis, vẫn cho phép request để không làm gián đoạn service
        next();
    }
};

module.exports = { visitorChatRateLimit };