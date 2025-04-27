const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/chatbot.controller');

// ============= API CHATBOT ============= //
router.post("/chat", ChatbotController.chatWithBot);
router.post("/test-chat", ChatbotController.testChat);
router.post("/retrieve-context", ChatbotController.retrieveContext);

module.exports = router;