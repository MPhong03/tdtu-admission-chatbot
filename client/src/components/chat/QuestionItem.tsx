import React, { useState } from "react";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { message, Tooltip } from "antd";
import ReactMarkdown from "react-markdown";

interface QuestionItemProps {
    content: string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        message.success("Đã copy câu hỏi!");
        setCopied(true);

        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="flex flex-col items-end mb-3">
            <div className="bg-main-blue text-white max-w-[70%] rounded-lg px-4 py-2 break-words whitespace-pre-line">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            <div className="flex justify-end mt-1 space-x-2">
                <Tooltip title={copied ? "Đã copy!" : "Copy câu hỏi"}>
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
            </div>
        </div>
    );
};

export default QuestionItem;
