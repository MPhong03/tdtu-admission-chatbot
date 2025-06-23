import React, { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import { Spin } from "antd";
import type { ChatHistoryItem } from "../../views/main/ChatView";

interface HistoryListProps {
    chatItems: ChatHistoryItem[];
    botTyping: boolean;
    currentTypingAnswer: string;
    loadingInitial: boolean;
    loadingMore: boolean;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const HistoryList = forwardRef<HTMLDivElement, HistoryListProps>(
    (
        {
            chatItems,
            botTyping,
            currentTypingAnswer,
            loadingInitial,
            loadingMore,
            onScroll,
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                onScroll={onScroll}
                className="mb-4 space-y-6 overflow-y-auto"
                style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
            >
                {loadingInitial ? (
                    <div className="flex justify-center mt-10">
                        <Spin size="large" />
                    </div>
                ) : chatItems.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">Không có lịch sử hội thoại.</div>
                ) : (
                    <>
                        {loadingMore && (
                            <div className="flex justify-center py-2">
                                <Spin size="small" />
                            </div>
                        )}
                        {chatItems.map((item) => (
                            <div key={item._id} className="space-y-1 my-4 flex flex-col">
                                <div className="flex justify-end mb-3">
                                    <div className="bg-main-blue text-white max-w-[70%] rounded-lg px-4 py-2 break-words whitespace-pre-line">
                                        <ReactMarkdown>{item.question}</ReactMarkdown>
                                    </div>
                                </div>

                                <div className="bg-gray-100 max-w-full rounded-lg px-4 py-2 whitespace-pre-line min-h-[40px]">
                                    <ReactMarkdown>
                                        {item._id.startsWith("temp-") && botTyping
                                            ? currentTypingAnswer || ""
                                            : item.answer}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}

                        {botTyping && chatItems.length === 0 && (
                            <div className="flex justify-start py-2">
                                <Spin />
                                <div className="ml-2 text-gray-600">Chatbot đang trả lời...</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }
);

HistoryList.displayName = "HistoryList";

export default HistoryList;
