import React, { useState } from "react";
import { CopyOutlined, CheckOutlined, UserOutlined } from "@ant-design/icons";
import { message, Tooltip } from "antd";
import ReactMarkdown from "react-markdown";

interface QuestionItemProps {
    content: string;
    timestamp?: string; // Optional timestamp
    isLoading?: boolean; // Loading state khi câu hỏi đang được gửi
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
    content, 
    timestamp,
    isLoading = false 
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        message.success("Đã copy câu hỏi!");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="flex items-start gap-3 mb-6 justify-end">
            <div className="flex-1 flex flex-col items-end">
                {/* Question bubble */}
                <div className={`bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-md break-words transition-all duration-200 ${
                    isLoading ? 'opacity-70 animate-pulse' : 'shadow-sm'
                }`}>
                    <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                    
                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex items-center gap-2 mt-2 text-blue-200">
                            <div className="flex gap-1">
                                <div 
                                    className="w-1 h-1 bg-blue-200 rounded-full animate-bounce" 
                                    style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                                ></div>
                                <div 
                                    className="w-1 h-1 bg-blue-200 rounded-full animate-bounce" 
                                    style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
                                ></div>
                                <div 
                                    className="w-1 h-1 bg-blue-200 rounded-full animate-bounce" 
                                    style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
                                ></div>
                            </div>
                            <span className="text-xs">Đang gửi...</span>
                        </div>
                    )}
                </div>
                
                {/* Action buttons và timestamp */}
                {!isLoading && (
                    <div className="flex items-center gap-2 mt-2 mr-2">
                        {/* Timestamp */}
                        {timestamp && (
                            <span className="text-xs text-gray-400">
                                {new Date(timestamp).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        )}
                        
                        {/* Copy button */}
                        <Tooltip title={copied ? "Đã copy!" : "Sao chép câu hỏi"}>
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
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default QuestionItem;