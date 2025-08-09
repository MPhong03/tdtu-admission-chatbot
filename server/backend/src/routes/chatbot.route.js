const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/chatbot.controller');
const { verifyToken, optionalAuth, apiLock, rateLimiter } = require('../middlewares/auth.middleware');
const { visitorChatRateLimit } = require('../middlewares/visitor-rate-limit.middleware');

// ============= API CHATBOT ============= //

/**
 * Chat với chatbot, tự động lưu lịch sử
 * POST /chatbot/chat
 * Headers: Authorization: Bearer <token> (optional)
 * Headers: X-Visitor-Id: <visitor-id> (required for visitors)
 * Body: { "question": String, "chatId": String (optional) }
 *    - Visitor: giới hạn 20 câu mỗi 5 giờ
 *    - User đã đăng nhập: không giới hạn
 */
router.post("/chat", optionalAuth, visitorChatRateLimit, ChatbotController.chatWithBot);

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