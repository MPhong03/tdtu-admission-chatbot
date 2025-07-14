const express = require("express");
const AuthController = require("../controllers/auth.controller");
const { verifyToken, isAdmin, optionalAuth, rateLimiter } = require("../middlewares/auth.middleware");
// const HttpResponse = require("../data/responses/http.response");
// const CacheService = require('../services/v2/cachings/cache.service');
// const cache = new CacheService(process.env.REDIS_URL);

const router = express.Router();

// ====== TEST ROUTES (No body required) ======

// Test public endpoint
router.get("/hello", AuthController.hello);

// Test authentication
router.get("/auth-hello", verifyToken, AuthController.hello);

// Test admin authentication
router.get("/admin-hello", verifyToken, isAdmin, AuthController.hello);

// Lấy thông tin cá nhân
// Headers: Authorization: Bearer <token>
router.get("/profile", verifyToken, AuthController.profile);

// Test rate limit
router.get("/test-rate-limit", optionalAuth, rateLimiter, async (req, res) => {
    // const identifier = req.user?.id
    //     ? `user:${req.user.id}`
    //     : `ip:${req.ip}`;

    // const role = req.user ? 'user' : 'guest';
    // const config = {
    //     guest: { limit: 20, window: 300 },
    //     user:  { limit: 100, window: 3600 },
    // }[role];

    // try {
    //     const info = await cache.getRemainingLimit(identifier, config.limit, config.window);
    //     return res.json(HttpResponse.success({
    //         who: req.user?.email || req.ip,
    //         role,
    //         remaining: info.remaining,
    //         resetIn: info.resetIn,
    //         message: `Bạn còn ${info.remaining} yêu cầu trong ${info.resetIn} giây`
    //     }));
    // } catch (err) {
    //     console.warn("[TestRateLimit] Redis error:", err);
    //     return res.json(HttpResponse.success({
    //         who: req.user?.email || req.ip,
    //         role,
    //         remaining: "Không rõ (Redis lỗi)",
    //         message: "Không thể kiểm tra giới hạn (Redis lỗi)"
    //     }));
    // }
});

// ====== MAIN AUTH ROUTES ======

// Đăng ký tài khoản mới
// POST /auth/register
// Body: { "username": String, "email": String, "password": String }
router.post("/register", AuthController.register);

// Đăng nhập
// POST /auth/login
// Body: { "email": String, "password": String }
router.post("/login", AuthController.login);

// Đổi mật khẩu (Yêu cầu đăng nhập)
// POST /auth/change-password
// Headers: Authorization: Bearer <token>
// Body: { "oldPassword": String, "newPassword": String }
router.post("/change-password", verifyToken, AuthController.changePassword);

module.exports = router;
