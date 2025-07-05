import React, { useState } from "react";
import { CopyOutlined, CheckOutlined, CommentOutlined, EditOutlined, CheckCircleOutlined } from "@ant-design/icons";
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
}

const AnswerItem: React.FC<AnswerItemProps> = ({
    content,
    isFeedback = false,
    feedback,
    onFeedback,
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
        message.success("Đã gửi phản hồi!");
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
            <Rate
                value={rating}
                onChange={setRating}
                allowClear={false}
                tooltips={["1", "2", "3", "4", "5"]}
            />
            <Input.TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Nhập góp ý của bạn..."
                className="mt-2"
            />
            <Button
                type="primary"
                className="mt-2 w-full"
                onClick={handleSubmit}
            >
                {feedback ? "Cập nhật đánh giá" : "Gửi đánh giá"}
            </Button>
        </div>
    );

    return (
        <div className="flex flex-col items-start mb-4">
            <div className="markdown-body bg-gray-100 max-w-full rounded-lg px-4 py-2 whitespace-pre-line min-h-[40px]">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            <div className="flex justify-start mt-2 space-x-3">
                <Tooltip title={copied ? "Đã copy!" : "Copy trả lời"}>
                    <div
                        onClick={handleCopy}
                        className="cursor-pointer text-gray-500 hover:text-gray-700 text-[20px] p-1 rounded-full transition"
                    >
                        {copied ? (
                            <CheckOutlined className="text-green-500 transition" />
                        ) : (
                            <CopyOutlined className="transition" />
                        )}
                    </div>
                </Tooltip>

                <Popover
                    title={feedback ? "Xem / Sửa đánh giá" : "Đánh giá câu trả lời"}
                    trigger="click"
                    open={feedbackVisible}
                    onOpenChange={setFeedbackVisible}
                    content={feedbackContent}
                >
                    <Tooltip title={feedback ? "Xem hoặc chỉnh sửa đánh giá" : "Đánh giá câu trả lời"}>
                        {feedback ? (
                            <EditOutlined className="cursor-pointer text-green-600 hover:text-blue-600 text-[20px] p-1 rounded-full transition" />
                        ) : (
                            <CommentOutlined className="cursor-pointer text-gray-500 hover:text-blue-600 text-[20px] p-1 rounded-full transition" />
                        )}
                    </Tooltip>
                </Popover>
            </div>
        </div>
    );
};

export default AnswerItem;
