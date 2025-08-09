import React, { useEffect, useState } from "react";
import {
    CopyOutlined,
    CheckOutlined,
    CommentOutlined,
    EditOutlined,
    RobotOutlined,
    UserOutlined,
    MessageOutlined,
    HeartOutlined,
    SmileOutlined,
    TeamOutlined,
    DotChartOutlined,
    EyeFilled
} from "@ant-design/icons";
import { Button, Input, message, Popover, Rate, Tooltip, Divider, Tag, Avatar, Timeline } from "antd";
import ReactMarkdown from "react-markdown";
import { DotIcon } from "lucide-react";
import { DotDuration } from "antd/es/carousel/style";
import remarkGfm from 'remark-gfm';
import './markdown.css';

// Thêm CSS animation cho fade in effect
const fadeInStyle = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
`;

interface AdminReply {
    id: string;
    adminId: string;
    message: string;
    createdAt: string;
    _id: string;
}

interface FeedbackData {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
    adminReplies?: AdminReply[];
}

interface AnswerItemProps {
    content: string;
    isFeedback?: boolean;
    feedback?: FeedbackData | null;
    onFeedback?: (value: { rating: number; comment: string; feedbackId?: string }) => void;
    isTyping?: boolean;
    adminAnswer?: string;
    adminAnswerAt?: string;
    isAdminReviewed?: boolean;
}

// Component cho typing indicator
const TypingIndicator = () => {
    return (
        <div className="flex items-start gap-3 mb-6">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
                        ></div>
                        <div
                            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component cho Admin Reply
const AdminReply: React.FC<{ adminAnswer: string; adminAnswerAt: string }> = ({
    adminAnswer,
    adminAnswerAt
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopyAdmin = () => {
        navigator.clipboard.writeText(adminAnswer);
        message.success("Đã copy phản hồi của nhân viên!");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="mt-4">
            <Divider className="my-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <TeamOutlined />
                    <span>Phản hồi từ nhân viên</span>
                </div>
            </Divider>

            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-4xl">
                        <div className="markdown-body prose prose-sm max-w-none text-gray-800">
                            <ReactMarkdown components={{
                                table: ({ node, ...props }) => (
                                    <table className="markdown-table" {...props} />
                                ),
                            }} remarkPlugins={[remarkGfm]}>{adminAnswer}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 ml-2">
                        <Tooltip title={copied ? "Đã copy!" : "Sao chép phản hồi nhân viên"}>
                            <div
                                onClick={handleCopyAdmin}
                                className="cursor-pointer text-gray-400 hover:text-purple-600 text-sm p-1.5 rounded-full transition-all duration-200 hover:bg-purple-50"
                            >
                                {copied ? (
                                    <CheckOutlined className="text-green-500" />
                                ) : (
                                    <CopyOutlined />
                                )}
                            </div>
                        </Tooltip>

                        <span className="text-xs text-gray-400 ml-1">
                            {new Date(adminAnswerAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component mới cho Admin Feedback Replies
const AdminFeedbackReplies: React.FC<{ adminReplies: AdminReply[] }> = ({ adminReplies }) => {
    const [expandedReplies, setExpandedReplies] = useState(false);
    const [showReplies, setShowReplies] = useState(false); // State để ẩn/hiện phản hồi

    if (!adminReplies || adminReplies.length === 0) {
        return null;
    }

    const formatRelativeTime = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return "Vừa xong";
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
        return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
    };

    // Hiển thị reply đầu tiên, các reply khác collapse
    const firstReply = adminReplies[0];
    const remainingReplies = adminReplies.slice(1);

    return (
        <div className="mt-4">
            {/* Toggle Button - Compact Design */}
            <div className="flex items-center justify-between mb-3">
                <Button
                    type="text"
                    size="small"
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-lg transition-all duration-200"
                >
                    <MessageOutlined className={`transition-transform duration-200 ${showReplies ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-medium">
                        {showReplies ? 'Ẩn phản hồi về đánh giá' : 'Xem phản hồi về đánh giá'}
                    </span>
                    <Tag color="blue" className="text-xs ml-1">
                        {adminReplies.length}
                    </Tag>
                </Button>
            </div>

            {/* Replies Content - Có thể ẩn/hiện */}
            {showReplies && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 animate-fadeIn">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {/* <Avatar size="small" className="bg-blue-500">
                                <TeamOutlined />
                            </Avatar> */}
                            <span className="text-sm font-medium text-blue-700">
                                Phản hồi từ nhân viên
                            </span>
                        </div>

                        {remainingReplies.length > 0 && (
                            <Button
                                type="text"
                                size="small"
                                onClick={() => setExpandedReplies(!expandedReplies)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                {expandedReplies ? "Thu gọn" : `Xem thêm ${remainingReplies.length}`}
                            </Button>
                        )}
                    </div>

                    {/* Timeline của replies */}
                    <Timeline
                        mode="left"
                        className="mt-3"
                        items={[
                            // Reply đầu tiên - luôn hiển thị
                            {
                                // dot: <EyeFilled />,
                                children: (
                                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-gray-800 mb-2 leading-relaxed">
                                                    {firstReply.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <TeamOutlined />
                                                    <span>TDTU</span>
                                                    <span>•</span>
                                                    <span>{formatRelativeTime(firstReply.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            },

                            // Các reply còn lại - hiển thị khi expand
                            ...(expandedReplies ? remainingReplies.map((reply, index) => ({
                                // dot: <EyeFilled className="bg-blue-50 p-0" />,
                                children: (
                                    <div key={reply.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-gray-800 mb-2 leading-relaxed">
                                                    {reply.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <TeamOutlined />
                                                    <span>TDTU</span>
                                                    <span>•</span>
                                                    <span>{formatRelativeTime(reply.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            })) : [])
                        ]}
                    />

                    {/* Quick stats */}
                    {adminReplies.length > 1 && (
                        <div className="pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between text-xs text-blue-600">
                                <span>
                                    Cuộc trò chuyện bắt đầu {formatRelativeTime(adminReplies[adminReplies.length - 1].createdAt)}
                                </span>
                                <span>
                                    Phản hồi mới nhất {formatRelativeTime(adminReplies[0].createdAt)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Component chính được nâng cấp
const AnswerItem: React.FC<AnswerItemProps> = ({
    content,
    isFeedback = false,
    feedback,
    onFeedback,
    isTyping = false,
    adminAnswer,
    adminAnswerAt,
    isAdminReviewed = false,
}) => {
    const [copied, setCopied] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [rating, setRating] = useState<number>(feedback?.rating || 0);
    const [comment, setComment] = useState<string>(feedback?.comment || "");

    // Inject CSS cho animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = fadeInStyle;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const handleSubmit = () => {
        if (rating === 0) {
            message.warning("Hãy chọn điểm trước!");
            return;
        }
        onFeedback?.({ rating, comment, feedbackId: feedback?._id });
        message.success(feedback ? "Đã cập nhật đánh giá!" : "Cảm ơn bạn đã đánh giá!");
        setFeedbackVisible(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        message.success("Đã copy nội dung trả lời!");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const feedbackContent = (
        <div className="w-64">
            <div className="mb-3">
                <Rate
                    value={rating}
                    onChange={setRating}
                    allowClear={false}
                    tooltips={["Rất tệ", "Tệ", "Bình thường", "Tốt", "Rất tốt"]}
                    className="text-lg"
                />
            </div>
            <Input.TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Nhập góp ý chi tiết (tùy chọn)..."
                className="mt-2 mb-4"
                maxLength={500}
                showCount
            />
            <div className="flex gap-2 mt-3">
                <Button
                    type="primary"
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={rating === 0}
                >
                    {feedback ? "Cập nhật" : "Gửi đánh giá"}
                </Button>
                <Button onClick={() => setFeedbackVisible(false)}>
                    Hủy
                </Button>
            </div>
        </div>
    );

    // Nếu đang typing và chưa có content, hiển thị typing indicator
    if (isTyping && !content) {
        return <TypingIndicator />;
    }

    return (
        <div className="mb-6">
            {/* Main Answer */}
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    {/* Answer bubble */}
                    <div className={`bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-4xl transition-all duration-200 ${isTyping ? 'border-2 border-blue-200 bg-blue-50' : ''
                        }`}>
                        {/* Typing indicator khi đang gõ */}
                        {isTyping && (
                            <div className="flex items-center gap-2 mb-2 text-blue-600">
                                <div className="flex gap-1">
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                                    ></div>
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
                                    ></div>
                                    <div
                                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                                        style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
                                    ></div>
                                </div>
                                <span className="text-xs font-medium">Đang trả lời...</span>
                            </div>
                        )}

                        {/* Content */}
                        <div className={`markdown-body prose prose-sm max-w-none ${isTyping ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                            {content ? (
                                <ReactMarkdown components={{
                                    table: ({ node, ...props }) => (
                                        <table className="markdown-table" {...props} />
                                    ),
                                }} remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            ) : isTyping ? (
                                <span className="text-gray-500 italic">Đang soạn câu trả lời...</span>
                            ) : (
                                <span className="text-gray-400 italic">Chưa có nội dung</span>
                            )}
                        </div>

                        {/* Typing cursor effect */}
                        {isTyping && content && (
                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                        )}
                    </div>

                    {/* Action buttons - chỉ hiển thị khi không typing và có content */}
                    {!isTyping && content && (
                        <div className="flex items-center gap-2 mt-2 ml-2">
                            {/* Copy button */}
                            <Tooltip title={copied ? "Đã copy!" : "Sao chép câu trả lời"}>
                                <div
                                    onClick={handleCopy}
                                    className="cursor-pointer text-gray-500 hover:text-blue-600 text-sm p-1.5 rounded-full transition-all duration-200 hover:bg-gray-100"
                                >
                                    {copied ? (
                                        <CheckOutlined className="text-green-500" />
                                    ) : (
                                        <CopyOutlined />
                                    )}
                                </div>
                            </Tooltip>

                            {/* Feedback button */}
                            <Popover
                                title={
                                    <div className="flex items-center gap-2">
                                        <CommentOutlined className="text-blue-600" />
                                        <span>{feedback ? "Chỉnh sửa đánh giá" : "Đánh giá câu trả lời"}</span>
                                    </div>
                                }
                                trigger="click"
                                open={feedbackVisible}
                                onOpenChange={setFeedbackVisible}
                                content={feedbackContent}
                                placement="topLeft"
                            >
                                <Tooltip title={feedback ? "Xem hoặc chỉnh sửa đánh giá" : "Đánh giá câu trả lời"}>
                                    <div className="cursor-pointer text-sm p-1.5 rounded-full transition-all duration-200 hover:bg-gray-100">
                                        {feedback ? (
                                            <div className="flex items-center gap-1 text-green-600 hover:text-blue-600">
                                                <EditOutlined />
                                                <span className="text-xs">Đã đánh giá</span>
                                            </div>
                                        ) : (
                                            <CommentOutlined className="text-gray-500 hover:text-blue-600" />
                                        )}
                                    </div>
                                </Tooltip>
                            </Popover>

                            {/* Rating display cho feedback đã có */}
                            {feedback && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Rate disabled value={feedback.rating} />
                                    <span>({feedback.rating}/5)</span>
                                </div>
                            )}

                            {/* Admin feedback replies indicator - Simplified */}
                            {feedback?.adminReplies && feedback.adminReplies.length > 0 && (
                                <Tooltip title="Có phản hồi từ nhân viên về đánh giá của bạn">
                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                                        <MessageOutlined />
                                        <span>Nhân viên đã phản hồi</span>
                                    </div>
                                </Tooltip>
                            )}

                            {/* Traditional admin reviewed indicator */}
                            {isAdminReviewed && adminAnswer && (
                                <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                    <span>Nhân viên đã phản hồi</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Admin Feedback Replies Section - TÍNH NĂNG MỚI */}
                    {!isTyping && feedback?.adminReplies && feedback.adminReplies.length > 0 && (
                        <AdminFeedbackReplies adminReplies={feedback.adminReplies} />
                    )}

                    {/* Admin Reply Section - phần cũ cho adminAnswer */}
                    {!isTyping && adminAnswer && adminAnswerAt && (
                        <AdminReply
                            adminAnswer={adminAnswer}
                            adminAnswerAt={adminAnswerAt}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnswerItem;