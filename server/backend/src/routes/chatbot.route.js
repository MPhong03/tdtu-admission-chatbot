const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/chatbot.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ============= API CHATBOT ============= //
router.post("/chat", verifyToken, ChatbotController.chatWithBot);
router.post("/test-chat", ChatbotController.testChat);
router.post("/retrieve-context", ChatbotController.retrieveContext);

// ============= API HISTORY ============= //
router.get("/history/:chatId", verifyToken, ChatbotController.getHistory);

// ============ API LLM ============= //
router.post("/llm/embedding", ChatbotController.getEmbedding);

module.exports = router;