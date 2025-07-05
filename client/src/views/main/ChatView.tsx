import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Spin, Tooltip } from "antd";
import { DownOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import ChatInputBox from "@/components/chat/ChatInputBox";
import axiosClient from "@/api/axiosClient";
import { io, Socket } from "socket.io-client";
import { saveVisitorId, getVisitorId } from "@/utils/auth";
import "./chat.css";
import QuestionItem from "@/components/chat/QuestionItem";
import AnswerItem from "@/components/chat/AnswerItem";
import toast from "react-hot-toast";

const TYPEWRITER_INTERVAL = 20;

export interface FeedbackData {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryItem {
  _id: string;
  question: string;
  answer: string;
  createdAt: string;
  feedback?: FeedbackData | null;
  isFeedback?: boolean;
}

interface ChatViewProps {
  initialChatId?: string; // nếu có thể truyền chatId từ bên ngoài
  onNewChatCreated?: (chatId: string) => void; // callback khi chat mới tạo
}

const ChatView: React.FC<ChatViewProps> = ({
  initialChatId,
  onNewChatCreated,
}) => {
  const chatIdFromParams = useParams<{ chatId: string }>().chatId;
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    initialChatId || chatIdFromParams
  );
  const [chatItems, setChatItems] = useState<ChatHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [currentTypingAnswer, setCurrentTypingAnswer] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const scrollToBottomRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const tempMessageIdRef = useRef<string | null>(null);
  const tempToRealIdMapRef = useRef<Record<string, string>>({});
  const visitorId = getVisitorId();

  const pageSize = 5;

  const socketBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

  // Reset khi initialChatId hoặc chatIdFromParams thay đổi
  useEffect(() => {
    const newChatId = initialChatId || chatIdFromParams;
    if (newChatId !== currentChatId) {
      setCurrentChatId(newChatId);
      setChatItems([]);
      setPage(1);
      setHasMore(true);
    }
  }, [initialChatId, chatIdFromParams]);

  // Scroll xuống đáy khi currentTypingAnswer thay đổi
  useEffect(() => {
    if (scrollToBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentTypingAnswer]);

  // Typewriter effect gõ từng chữ
  const typeWriteAnswer = useCallback((fullText: string) => {
    setBotTyping(true);
    setCurrentTypingAnswer("");
    const tempOrRealId = tempMessageIdRef.current;
    console.log("[Typewriter] Using ID:", tempOrRealId);
    if (!tempOrRealId) return;

    let index = 0;
    const interval = setInterval(() => {
      index++;
      const partial = fullText.slice(0, index);
      setCurrentTypingAnswer(partial);

      setChatItems((prev) =>
        prev.map((item) =>
          item._id === tempOrRealId ? { ...item, answer: partial } : item
        )
      );

      if (index >= fullText.length) {
        clearInterval(interval);
        setBotTyping(false);
        tempMessageIdRef.current = null;
        console.log("[Typewriter] Completed for ID:", tempOrRealId);
      }
    }, TYPEWRITER_INTERVAL);
  }, []);

  // Fetch lịch sử chat nếu có currentChatId
  const fetchChatHistory = useCallback(
    async (pageNumber: number) => {
      if (!currentChatId || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      pageNumber === 1 ? setLoadingInitial(true) : setLoadingMore(true);

      try {
        await new Promise((r) => setTimeout(r, 500));

        const res = await axiosClient.get(`/chatbot/history/${currentChatId}`, {
          params: { page: pageNumber, size: pageSize, visitorId: visitorId },
        });

        const data = res.data?.Data;
        if (data) {
          setHasMore(data.pagination.hasMore);
          const newItems = data.items.reverse();

          if (pageNumber === 1) {
            setChatItems(newItems);
            setTimeout(() => {
              containerRef.current?.scrollTo(
                0,
                containerRef.current.scrollHeight
              );
            }, 50);
          } else {
            if (containerRef.current) {
              const container = containerRef.current;
              const prevScrollHeight = container.scrollHeight;
              const prevScrollTop = container.scrollTop;

              setChatItems((prev) => [...newItems, ...prev]);

              setTimeout(() => {
                if (!container) return;
                const newScrollHeight = container.scrollHeight;
                container.scrollTop =
                  newScrollHeight - prevScrollHeight + prevScrollTop;
              }, 50);
            } else {
              setChatItems((prev) => [...newItems, ...prev]);
            }
          }
          setPage(pageNumber);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        loadingMoreRef.current = false;
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [currentChatId]
  );

  // Tải lịch sử chat khi currentChatId thay đổi
  useEffect(() => {
    if (currentChatId) {
      fetchChatHistory(1);
    } else {
      setChatItems([]);
    }
  }, [currentChatId, fetchChatHistory]);

  // Xử lý scroll event
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;

      if (target.scrollTop <= 20 && hasMore && !loadingMoreRef.current) {
        fetchChatHistory(page + 1);
      }

      const isAtBottom =
        Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
        5;
      setShowScrollDown(!isAtBottom);
    },
    [fetchChatHistory, hasMore, page]
  );

  // Socket khởi tạo khi currentChatId thay đổi
  useEffect(() => {
    if (!currentChatId) return;

    if (socketRef.current) {
      console.log("[Socket] Disconnecting existing socket");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(socketBaseUrl);
    socketRef.current = socket;
    console.log("[Socket] Connected to", socketBaseUrl);

    const handleChatReceive = (data: { chatId: string; question: string; answer: string; }) => {
      console.log("[Socket] chat:receive:", data);

      if (data.chatId !== currentChatId) {
        console.log("[Socket] chatId mismatch: skipping");
        return;
      }

      const tempId = `temp-${Date.now()}`;
      tempMessageIdRef.current = tempId;

      setChatItems((prev) => [
        ...prev,
        {
          _id: tempId,
          question: data.question,
          answer: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      typeWriteAnswer(data.answer);
    };

    const handleChatResponse = (response: any) => {
      console.log("[Socket] chat:response:", response);

      const tempId = tempMessageIdRef.current;
      if (!tempId) {
        console.warn("[Socket] No tempMessageIdRef when response received");
        return;
      }

      if (response.Code !== 1) {
        toast.error(response.Message || "Đã xảy ra lỗi.");
        setBotTyping(false);
        tempMessageIdRef.current = null;
        return;
      }

      const data = response.Data;

      // Update ID cho chat item
      setChatItems((prev) => {
        const updated = prev.map((item) => {
          if (item._id === tempId) {
            // Lưu mapping temp -> real
            if (data.historyId) {
              tempToRealIdMapRef.current[tempId] = data.historyId;
            }
            return { ...item, _id: data.historyId ?? tempId };
          }
          return item;
        });
        return updated;
      });
      tempMessageIdRef.current = data.historyId ?? tempId;
      console.log("[Socket] Updated tempId -> real ID:", tempId, "->", data.historyId);

      if (data.visitorId) saveVisitorId(data.visitorId);

      if (data.chatId && data.chatId !== currentChatId) {
        setCurrentChatId(data.chatId);
        onNewChatCreated?.(data.chatId);
      }

      if (data.answer) {
        typeWriteAnswer(data.answer);
      } else {
        setChatItems((prev) =>
          prev.map((item) =>
            item._id === (data.historyId ?? tempId)
              ? {
                ...item,
                answer: "Xin lỗi, tôi chưa có câu trả lời cho câu hỏi này.",
              }
              : item
          )
        );
        setBotTyping(false);
      }
    };

    socket.on("chat:receive", handleChatReceive);
    socket.on("chat:response", handleChatResponse);

    return () => {
      console.log("[Socket] Cleaning up socket");
      socket.off("chat:receive", handleChatReceive);
      socket.off("chat:response", handleChatResponse);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentChatId, typeWriteAnswer]);

  // Gửi câu hỏi mới
  const handleSend = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      const tempId = `temp-${Date.now()}`;
      tempMessageIdRef.current = tempId;

      setCurrentTypingAnswer("");
      setChatItems((prev) => [
        ...prev,
        {
          _id: tempId,
          question,
          answer: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      setBotTyping(true);
      scrollToBottomRef.current = true;

      try {
        const res = await axiosClient.post("/chatbot/chat", {
          question,
          chatId: currentChatId,
          visitorId,
        });

        const data = res.data.Data;
        console.log("[API/chatbot/chat] Response:", data);

        if (data.visitorId) saveVisitorId(data.visitorId);

        if (data.historyId) {
          setChatItems((prev) =>
            prev.map((item) =>
              item._id === tempId
                ? { ...item, _id: data.historyId }
                : item
            )
          );
          tempMessageIdRef.current = data.historyId; // cập nhật tham chiếu ID
        }

        if (data.chatId && data.chatId !== currentChatId) {
          setCurrentChatId(data.chatId);
          onNewChatCreated?.(data.chatId);
        }

        if (data.answer) {
          await typeWriteAnswer(data.answer);
        } else {
          setChatItems((prev) =>
            prev.map((item) =>
              item._id === (data.historyId ?? tempId)
                ? { ...item, answer: "Xin lỗi, hiện tại tôi không có câu trả lời cho câu hỏi này." }
                : item
            )
          );
          setBotTyping(false);
        }
      } catch (error) {
        console.error("Failed to send question:", error);
        setChatItems((prev) =>
          prev.map((item) =>
            item._id === tempId
              ? { ...item, answer: "Đã có lỗi xảy ra, vui lòng thử lại sau." }
              : item
          )
        );
        setBotTyping(false);
      }
    },
    [currentChatId, onNewChatCreated, typeWriteAnswer]
  );

  if (!currentChatId)
    return (
      <div className="text-center text-gray-500 mt-10">
        Hãy bắt đầu đặt câu hỏi để tạo đoạn chat mới.
      </div>
    );

  // GỬI FEEDBACK
  const handleFeedback = async (
    historyId: string,
    rating: number,
    comment: string,
    feedbackId?: string
  ) => {
    try {
      let res;
      if (feedbackId) {
        // Cập nhật feedback
        res = await axiosClient.put(`/feedbacks/${feedbackId}`, { rating, comment });
      } else {
        // Tạo mới feedback
        res = await axiosClient.post("/feedbacks", { historyId, rating, comment });
      }
      const response = res.data;
      if (response.Code === 1) {
        toast.success(feedbackId ? "Cập nhật phản hồi thành công!" : "Cảm ơn bạn đã gửi phản hồi!");
        setChatItems((prev) =>
          prev.map((ci) =>
            ci._id === historyId
              ? {
                ...ci,
                isFeedback: true,
                feedback: {
                  _id: feedbackId || response.Data._id,
                  rating,
                  comment,
                  createdAt: feedbackId
                    ? (ci.feedback?.createdAt ?? new Date().toISOString())
                    : new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              }
              : ci
          )
        );
      } else {
        toast.error(response.Message || "Thao tác thất bại!");
      }
    } catch (error) {
      console.error("Error sending/updating feedback:", error);
      toast.error("Có lỗi khi xử lý phản hồi. Vui lòng thử lại.");
    }
  };

  return (
    <div className="w-[80%] mx-auto p-4 flex flex-col h-[85vh] relative">
      <div
        ref={containerRef}
        className="mb-4 space-y-6 overflow-y-auto flex-grow"
        onScroll={handleScroll}
      >
        <div
          className="mb-4 space-y-6 overflow-y-auto flex-grow"
          style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          {loadingInitial ? (
            <div className="flex justify-center mt-10">
              <Spin size="large" />
            </div>
          ) : chatItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              Không có lịch sử hội thoại.
            </div>
          ) : (
            <>
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Spin size="small" />
                </div>
              )}
              {chatItems.map((item) => (
                <div key={item._id} className="space-y-1 my-4 flex flex-col">
                  <QuestionItem content={item.question} />
                  <AnswerItem
                    content={item._id === tempMessageIdRef.current && botTyping
                      ? currentTypingAnswer
                      : item.answer}
                    isFeedback={item.isFeedback || false}
                    feedback={item.feedback || undefined}
                    onFeedback={(value) => handleFeedback(item._id, value.rating, value.comment, value.feedbackId)}
                  />

                </div>
              ))}
              {botTyping && chatItems.length === 0 && (
                <div className="flex justify-start py-2">
                  <Spin />
                  <div className="ml-2 text-gray-600">
                    Chatbot đang trả lời...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showScrollDown && (
          <Tooltip title="Chuyển đến tin nhắn mới nhất">
            <div
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }
              }}
              className="fixed bottom-[80px] right-8 cursor-pointer z-50 bg-main-blue hover:bg-main-red text-white rounded-full shadow-lg select-none transition
                       flex items-center justify-center"
              style={{ width: 44, height: 44 }}
            >
              <DownOutlined style={{ fontSize: 24 }} />
            </div>
          </Tooltip>
        )}
      </div>
      <ChatInputBox onSend={handleSend} chatId={currentChatId} isDisabled={botTyping} />
    </div>
  );
};

export default ChatView;
