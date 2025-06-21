const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require('../../middlewares/auth.middleware');
const BotController = require("../../controllers/v2/bot.controller");

// ============= API ============= //

/**
 * Phân tích câu hỏi
 * POST /bot/analyze
 */
router.post('/analyze', verifyToken, isAdmin, BotController.generateCypher);

/**
 * Truy vấn ngữ canhr
 * POST /bot/context
 */
router.post('/context', verifyToken, isAdmin, BotController.generateCypherAndQuery);

module.exports = router;