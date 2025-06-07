const express = require("express");
const AuthController = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth.middleware");

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
