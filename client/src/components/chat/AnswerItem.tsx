import React, { useState } from "react";
import { CopyOutlined, CheckOutlined, CommentOutlined, EditOutlined, RobotOutlined } from "@ant-design/icons";
import { Button, Input, message, Popover, Rate, Tooltip } from "antd";
import ReactMarkdown from "react-markdown";

interface FeedbackData {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
}

interface AnswerItemProps {
    content: string;
    isFeedback?: boolean;
    feedback?: FeedbackData | null;
    onFeedback?: (value: { rating: number; comment: string; feedbackId?: string }) => void;
    isTyping?: boolean; // Trạng thái đang typing
}

// Component cho typing indicator
const TypingIndicator = () => {
    return (
        <div className="flex items-center gap-3 mb-6">
            {/* Typing bubble */}
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                <div className="flex items-center gap-3">
                    {/* Animated dots */}
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
                    {/* <span className="text-sm text-gray-600 font-medium">Đang soạn câu trả lời...</span> */}
                </div>
            </div>
        </div>
    );
};

const AnswerItem: React.FC<AnswerItemProps> = ({
    content,
    isFeedback = false,
    feedback,
    onFeedback,
    isTyping = false,
}) => {
    const [copied, setCopied] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [rating, setRating] = useState<number>(feedback?.rating || 0);
    const [comment, setComment] = useState<string>(feedback?.comment || "");

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
        <div className="flex items-start gap-3 mb-6">
            <div className="flex-1">
                {/* Answer bubble */}
                <div className={`bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-4xl transition-all duration-200 ${
                    isTyping ? 'border-2 border-blue-200 bg-blue-50' : ''
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
                    <div className={`markdown-body prose prose-sm max-w-none ${
                        isTyping ? 'text-gray-700' : 'text-gray-900'
                    }`}>
                        {content ? (
                            <ReactMarkdown>{content}</ReactMarkdown>
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnswerItem;
