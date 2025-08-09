import axiosClient from "@/api/axiosClient";
import { getVisitorId } from "@/utils/auth";

export interface RateLimitInfo {
    remaining: number;
    resetIn: number;
    resetTime: string;
    limit: number;
    window: number;
    isLimited: boolean;
}

export interface RateLimitPolicy {
    chat: {
        limit: number;
        window: string;
        windowSeconds: number;
        description: string;
        resetPolicy: string;
        upgradeInfo: string;
    };
    general: {
        description: string;
        visitorBenefits: string[];
        userBenefits: string[];
    };
}

class RateLimitService {
    private visitorId: string | null = null;

    constructor() {
        this.visitorId = getVisitorId();
    }

    /**
     * Kiểm tra xem user có bị rate limit không
     */
    async checkRateLimit(type: string = 'chat'): Promise<RateLimitInfo | null> {
        try {
            // Nếu có token (user đã đăng nhập), không cần kiểm tra rate limit
            const token = localStorage.getItem('token');
            if (token) {
                return null; // User đã đăng nhập, không giới hạn
            }

            // Nếu không có visitor ID, không thể kiểm tra
            if (!this.visitorId) {
                return null;
            }

            const response = await axiosClient.get(`/visitor/rate-limit/check`, {
                params: { type },
                headers: {
                    'X-Visitor-Id': this.visitorId
                }
            });

            if (response.data.Code === 1) {
                return response.data.Data;
            }

            return null;
        } catch (error) {
            console.error('[RateLimitService] Error checking rate limit:', error);
            return null;
        }
    }

    /**
     * Lấy thông tin về rate limit policy
     */
    async getPolicy(): Promise<RateLimitPolicy | null> {
        try {
            const response = await axiosClient.get('/visitor/rate-limit/policy');

            if (response.data.Code === 1) {
                return response.data.Data;
            }

            return null;
        } catch (error) {
            console.error('[RateLimitService] Error getting policy:', error);
            return null;
        }
    }

    /**
     * Kiểm tra xem có thể gửi tin nhắn không
     */
    async canSendMessage(): Promise<{ canSend: boolean; info?: RateLimitInfo }> {
        const info = await this.checkRateLimit('chat');

        if (!info) {
            return { canSend: true }; // User đã đăng nhập hoặc không thể kiểm tra
        }

        return {
            canSend: !info.isLimited,
            info
        };
    }

    /**
     * Lấy thông báo khi hết lượt
     */
    getLimitExceededMessage(info: RateLimitInfo): string {
        return `Bạn đã đạt giới hạn ${info.limit} câu hỏi. Giới hạn sẽ được reset vào ${info.resetTime}. Vui lòng đăng ký tài khoản để chat không giới hạn.`;
    }

    /**
     * Lấy thông báo khuyến khích đăng nhập
     */
    getUpgradeMessage(): string {
        return "Đăng ký tài khoản để được chat không giới hạn và sử dụng các tính năng nâng cao!";
    }

    /**
     * Cập nhật visitor ID
     */
    updateVisitorId(visitorId: string) {
        this.visitorId = visitorId;
    }

    /**
     * Kiểm tra xem có phải visitor không
     */
    isVisitor(): boolean {
        return !localStorage.getItem('token') && !!this.visitorId;
    }

    /**
     * Lấy số lượt còn lại
     */
    async getRemainingCount(): Promise<number | null> {
        try {
            const info = await this.checkRateLimit('chat');
            return info ? info.remaining : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Lấy thời gian reset
     */
    async getResetTime(): Promise<string | null> {
        try {
            const info = await this.checkRateLimit('chat');
            return info ? info.resetTime : null;
        } catch (error) {
            return null;
        }
    }
}

export default new RateLimitService();