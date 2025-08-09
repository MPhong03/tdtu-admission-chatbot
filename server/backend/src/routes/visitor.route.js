const express = require('express');
const router = express.Router();
const VisitorRateLimitService = require('../services/visitor-rate-limit.service');

const visitorRateLimitService = new VisitorRateLimitService();

// ============= VISITOR API ============= //

/**
 * Kiểm tra rate limit hiện tại của visitor
 * GET /visitor/rate-limit/check
 * Headers: X-Visitor-Id: <visitor-id>
 * Query: type (optional, default: "chat")
 */
router.get("/rate-limit/check", async (req, res) => {
    try {
        const visitorId = req.header("X-Visitor-Id") || req.query.visitorId;
        const { type = 'chat' } = req.query;
        
        if (!visitorId) {
            return res.status(400).json({
                Code: -1,
                Message: "Visitor ID là bắt buộc. Vui lòng gửi header X-Visitor-Id hoặc query parameter visitorId",
                Data: null
            });
        }

        const info = await visitorRateLimitService.getRateLimitInfo(visitorId, type);
        
        res.json({
            Code: 1,
            Message: "Kiểm tra rate limit thành công",
            Data: {
                visitorId,
                type,
                ...info
            }
        });
    } catch (error) {
        console.error("[Visitor] Error checking rate limit:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi kiểm tra rate limit",
            Data: null
        });
    }
});

/**
 * Lấy thông tin về rate limit policy
 * GET /visitor/rate-limit/policy
 */
router.get("/rate-limit/policy", async (req, res) => {
    try {
        const policy = {
            chat: {
                limit: 20,
                window: "5 giờ",
                windowSeconds: 5 * 60 * 60,
                description: "Giới hạn 20 câu hỏi mỗi 5 giờ cho visitor",
                resetPolicy: "Tự động reset sau 5 giờ kể từ câu hỏi đầu tiên",
                upgradeInfo: "Đăng ký tài khoản để chat không giới hạn"
            },
            general: {
                description: "Rate limit được áp dụng để đảm bảo chất lượng dịch vụ cho tất cả người dùng",
                visitorBenefits: [
                    "Sử dụng miễn phí với giới hạn hợp lý",
                    "Không cần đăng ký để trải nghiệm",
                    "Giới hạn tự động reset theo thời gian"
                ],
                userBenefits: [
                    "Chat không giới hạn",
                    "Lưu trữ lịch sử chat",
                    "Tính năng nâng cao",
                    "Hỗ trợ ưu tiên"
                ]
            }
        };

        res.json({
            Code: 1,
            Message: "Lấy thông tin policy thành công",
            Data: policy
        });
    } catch (error) {
        console.error("[Visitor] Error getting policy:", error);
        res.status(500).json({
            Code: -1,
            Message: "Lỗi khi lấy thông tin policy",
            Data: null
        });
    }
});

module.exports = router;