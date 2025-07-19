const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/users/feedback.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

/**
 * @route POST /feedbacks
 * @desc Gửi phản hồi cho câu trả lời của chatbot
 * @access Yêu cầu đăng nhập (verifyToken)
 * @body {
 *   historyId: String (ID của History),
 *   question: String,
 *   answer: String,
 *   rating: Number (1-5),
 *   comment: String (optional),
 *   cypher: String (optional),
 *   contextNodes: String (optional)
 * }
 */
router.post('/', verifyToken, FeedbackController.createFeedback);

/**
 * @route GET /feedbacks/:id
 * @desc Lấy chi tiết một phản hồi theo ID
 * @access Yêu cầu đăng nhập (verifyToken)
 */
router.get('/:id', verifyToken, FeedbackController.getFeedbackById);

/**
 * @route GET /feedbacks
 * @desc Phân trang danh sách phản hồi của người dùng hiện tại
 * @query page: Number (default: 1), size: Number (default: 10)
 * @access Yêu cầu đăng nhập (verifyToken)
 */
router.get('/', verifyToken, FeedbackController.paginateFeedbacks);

/**
 * @route PUT /feedbacks/:id
 * @desc Cập nhật phản hồi (chỉ owner mới được phép cập nhật)
 * @access Yêu cầu đăng nhập (verifyToken)
 */
router.put('/:id', verifyToken, FeedbackController.updateFeedback);

/**
 * @route PATCH /feedbacks/:id/status
 * @desc Cập nhật trạng thái xử lý phản hồi (chỉ cho admin)
 * @body { status: String (pending|reviewed|resolved) }
 * @access Yêu cầu quyền admin (verifyToken + isAdmin)
 */
router.patch('/:id/status', verifyToken, isAdmin, FeedbackController.updateFeedbackStatus);

/**
 * @route DELETE /feedbacks/:id
 * @desc Xóa một phản hồi (chỉ owner mới được phép xóa)
 * @access Yêu cầu đăng nhập (verifyToken)
 */
router.delete('/:id', verifyToken, FeedbackController.deleteFeedback);

/**
 * @route GET /admin/all-feedbacks
 * @desc Lấy danh sách phản hồi (chỉ cho admin)
 * @access Yêu cầu quyền admin (verifyToken + isAdmin)
 */
router.get('/admin/all-feedbacks', verifyToken, isAdmin, FeedbackController.getFeedbacks);

/**
 * @route POST /feedbacks/:id/admin-replies
 * @desc Thêm phản hồi của admin vào một phản hồi
 * @access Yêu cầu quyền admin (verifyToken + isAdmin)
 * @body { message: String }
 */
router.post('/:id/admin-replies', verifyToken, isAdmin, FeedbackController.modifyAdminReply);

/**
 * @route PUT /feedbacks/:id/admin-replies/:replyId
 * @desc Cập nhật phản hồi của admin trong một phản hồi
 * @access Yêu cầu quyền admin (verifyToken + isAdmin)
 * @body { message: String }
 */
router.put('/:id/admin-replies/:replyId', verifyToken, isAdmin, FeedbackController.modifyAdminReply);

/**
 * @route DELETE /feedbacks/:id/admin-replies/:replyId
 * @desc Xóa phản hồi của admin trong một phản hồi
 * @access Yêu cầu quyền admin (verifyToken + isAdmin)
 */
router.delete('/:id/admin-replies/:replyId', verifyToken, isAdmin, FeedbackController.modifyAdminReply);

module.exports = router;
