const express = require("express");
const AuthController = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middlewares/auth.middleware");

const router = express.Router();

// GET
router.get("/hello", AuthController.hello);
router.get("/auth-hello", verifyToken, AuthController.hello); // test user auth
router.get("/admin-hello", verifyToken, isAdmin, AuthController.hello); // test is admin
router.get("/profile", verifyToken, AuthController.profile);

// POST
// Body: { username, email, password }
router.post("/register", AuthController.register);

// Body: { email, password }
router.post("/login", AuthController.login);

module.exports = router;
