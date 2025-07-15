const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/chatbot.controller');
const { verifyToken, optionalAuth, apiLock, rateLimiter } = require('../middlewares/auth.middleware');

// ============= API CHATBOT ============= //

/**
 * Chat với chatbot, tự động lưu lịch sử
 * POST /chatbot/chat
 * Headers: Authorization: Bearer <token>
 * Body: { "question": String, "chatId": String (optional) }
 *    - Nếu không truyền chatId, hệ thống sẽ tự tạo mới
 */
router.post("/chat", optionalAuth, ChatbotController.chatWithBot);

/**
 * Test chat với Gemini
 * POST /chatbot/test-chat
 * Body: { "question": String }
 */
// router.post("/test-chat", apiLock, ChatbotController.testChat);

/**
 * Lấy context liên quan tới câu hỏi
 * POST /chatbot/retrieve-context
 * Body: { "question": String }
 */
// router.post("/retrieve-context", apiLock, ChatbotController.retrieveContext);

/**
 * Nhận diện thực thể trong câu hỏi
 * POST /chatbot/retrieve-entities
 * Body: { "question": String }
 */
// router.post("/retrieve-entities", apiLock, ChatbotController.retrieveEntities);

// ============= API HISTORY ============= //

/**
 * Lấy lịch sử chat theo chatId (phân trang)
 * GET /chatbot/history/:chatId?page=<number>&size=<number>
 * Headers: Authorization: Bearer <token>
 * Không cần body
 */
router.get("/history/:chatId", optionalAuth, ChatbotController.getHistory);

// ============ API LLM ============= //

/**
 * Lấy embedding cho một đoạn text
 * POST /chatbot/llm/embedding
 * Body: { "text": String }
 */
router.post("/llm/embedding", apiLock, verifyToken, ChatbotController.getEmbedding);

/**
 * So sánh similarity giữa một chuỗi và danh sách các chuỗi
 * POST /chatbot/llm/embeddings
 * Body: { "source": String, "targets": Array<String> }
 */
router.post("/llm/embeddings", apiLock, verifyToken, ChatbotController.getEmbeddings);

module.exports = router;