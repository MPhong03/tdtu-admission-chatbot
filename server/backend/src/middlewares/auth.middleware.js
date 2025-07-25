const jwt = require("jsonwebtoken");
const HttpResponse = require("../data/responses/http.response");
const CacheService = require('../services/v2/cachings/cache.service');
const cache = new CacheService(process.env.REDIS_URL);
const { v4: uuidv4 } = require("uuid");

const verifyToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.json({ Code: -1, Message: "Vui lòng đăng nhập", Data: null });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.json(HttpResponse.error("Token expired"));
        }
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.json(HttpResponse.error("Token expired", 401));
        }
        res.json(HttpResponse.error("Invalid Token"));
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user)
        return res.json(HttpResponse.error("User not authenticated"));

    if (req.user.role !== "admin")
        return res.json(HttpResponse.error("Admin Access Required"));

    next();
};

// Có thể dùng cho khách vãng lai

function extractToken(authHeader) {
    if (!authHeader) return null;
    return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
}

// Middleware: Bắt buộc đăng nhập
function requireAuth(req, res, next) {
    const token = extractToken(req.header("Authorization"));
    if (!token) {
        return res.status(401).json(HttpResponse.error("Access Denied"));
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json(HttpResponse.error("Invalid Token"));
    }
}

// Middleware: Tùy chọn xác thực (có token thì gán user, không thì bỏ qua)
function optionalAuth(req, res, next) {
    const token = extractToken(req.header("Authorization"));
    let user = null;
    if (token) {
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Token sai thì bỏ qua, không gán user
        }
    }

    req.user = user || null;
    req.visitorId = req.header("X-Visitor-Id") || req.query.visitorId || req.body.visitorId || uuidv4();
    req.isVisitor = user ? false : true;

    next();
}

/**
 * Dùng để khóa API, trả về thông báo API không còn được hỗ trợ nữa.
 */

function apiLock(req, res, next) {
    return res.status(410).json({
        Code: -2,
        Message: "API này đã ngừng hỗ trợ.",
        Data: null,
    });
}

const rateLimiter = async (req, res, next) => {
    const identifier = req.user?.id
        ? `user:${req.user.id}`
        : `ip:${req.ip}`;

    const role = req.user ? 'user' : 'guest';
    const config = {
        guest: { limit: 20, window: 300 }, // 20 request / 5 phút
        user:  { limit: 100, window: 3600 } // 100 request / 1 giờ
    }[role];

    try {
        const isLimited = await cache.isRateLimited(identifier, config.limit, config.window);

        if (isLimited) {
            const info = await cache.getRemainingLimit(identifier, config.limit, config.window);
            return res.status(429).json(HttpResponse.error(
                `Bạn gửi quá nhanh. Vui lòng thử lại sau ${info.resetIn}s.`,
                -1,
                { remaining: info.remaining }
            ));
        }
    } catch (err) {
        console.warn("[RateLimiter] Redis error. Skipping rate limit.", err?.message || err);
        // Không chặn request nếu Redis lỗi
    }

    next();
};

module.exports = { verifyToken, isAdmin, requireAuth, optionalAuth, apiLock, rateLimiter };
