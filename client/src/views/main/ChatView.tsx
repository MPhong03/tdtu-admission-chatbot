// ChatView.tsx - Fixed version với debug logging
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
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
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

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
  initialChatId?: string;
  onNewChatCreated?: (chatId: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  initialChatId,
  onNewChatCreated,
}) => {
  const chatIdFromParams = useParams<{ chatId: string }>().chatId;
  const location = useLocation();
  const locationState = location.state as { initialQuestion?: string; fromHome?: boolean; chatName?: string } | null;
  
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
  const hasProcessedInitialQuestion = useRef(false);
  const visitorId = getVisitorId();
  const { setTitle } = useBreadcrumb();

  // Set breadcrumb title for ChatView
  useEffect(() => {
    setTitle(locationState?.chatName || "Cuộc trò chuyện");
  }, [setTitle]);

  const pageSize = 5;
  const socketBaseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

  // Debug: Log state changes
  useEffect(() => {
    console.log("[DEBUG] chatItems updated:", chatItems.length, chatItems);
  }, [chatItems]);

  useEffect(() => {
    console.log("[DEBUG] botTyping:", botTyping, "tempMessageId:", tempMessageIdRef.current);
  }, [botTyping]);

  useEffect(() => {
    console.log("[DEBUG] currentTypingAnswer:", currentTypingAnswer);
  }, [currentTypingAnswer]);

  // Reset khi initialChatId hoặc chatIdFromParams thay đổi
  useEffect(() => {
    const newChatId = initialChatId || chatIdFromParams;
    if (newChatId !== currentChatId) {
      console.log("[ChatView] ChatId changed:", currentChatId, "->", newChatId);
      setCurrentChatId(newChatId);
      setChatItems([]);
      setPage(1);
      setHasMore(true);
      setBotTyping(false);
      setCurrentTypingAnswer("");
      hasProcessedInitialQuestion.current = false;
    }
  }, [initialChatId, chatIdFromParams, currentChatId]);

  // Xử lý initial question từ HomeView
  useEffect(() => {
    if (
      locationState?.initialQuestion && 
      locationState?.fromHome && 
      currentChatId && 
      !hasProcessedInitialQuestion.current
    ) {
      console.log("[ChatView] Processing initial question:", locationState.initialQuestion);
      hasProcessedInitialQuestion.current = true;
      
      // Delay để đảm bảo socket đã connect và component đã render
      setTimeout(() => {
        handleSend(locationState.initialQuestion || "");
      }, 1000); // Tăng delay lên 1 giây
    }
  }, [currentChatId, locationState]);

  // Scroll xuống đáy khi currentTypingAnswer thay đổi
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentTypingAnswer, chatItems]);

  // Enhanced typewriter effect với better logging
  const typeWriteAnswer = useCallback((fullText: string) => {
    console.log("[Typewriter] Starting with text length:", fullText.length);
    console.log("[Typewriter] Full text:", fullText.substring(0, 100) + "...");
    
    setBotTyping(true);
    setCurrentTypingAnswer("");
    const tempOrRealId = tempMessageIdRef.current;
    console.log("[Typewriter] Using ID:", tempOrRealId);
    
    if (!tempOrRealId) {
      console.error("[Typewriter] No temp message ID!");
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index++;
      const partial = fullText.slice(0, index);
      setCurrentTypingAnswer(partial);

      // Update chatItems immediately
      setChatItems((prev) => {
        const updated = prev.map((item) => {
          if (item._id === tempOrRealId) {
            console.log("[Typewriter] Updating item:", item._id, "with partial length:", partial.length);
            return { ...item, answer: partial };
          }
          return item;
        });
        return updated;
      });

      if (index >= fullText.length) {
        clearInterval(interval);
        setBotTyping(false);
        setCurrentTypingAnswer("");
        console.log("[Typewriter] Completed for ID:", tempOrRealId);
        tempMessageIdRef.current = null;
      }
    }, TYPEWRITER_INTERVAL);

    // Cleanup function
    return () => {
      clearInterval(interval);
      setBotTyping(false);
    };
  }, []);

  // Fetch lịch sử chat
  const fetchChatHistory = useCallback(
    async (pageNumber: number) => {
      if (!currentChatId || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      pageNumber === 1 ? setLoadingInitial(true) : setLoadingMore(true);

      try {
        console.log("[ChatView] Fetching history for page:", pageNumber);
        
        const res = await axiosClient.get(`/chatbot/history/${currentChatId}`, {
          params: { page: pageNumber, size: pageSize, visitorId: visitorId },
        });

        const data = res.data?.Data;
        if (data) {
          setTitle(data.chat?.name || "Cuộc trò chuyện");
          setHasMore(data.pagination.hasMore);
          const newItems = data.items.reverse();
          console.log("[ChatView] Loaded history items:", newItems.length);

          if (pageNumber === 1) {
            setChatItems(newItems);
            setTimeout(() => {
              containerRef.current?.scrollTo(
                0,
                containerRef.current.scrollHeight
              );
            }, 50);
          } else {
            setChatItems((prev) => [...newItems, ...prev]);
          }
          setPage(pageNumber);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        toast.error("Không thể tải lịch sử chat");
      } finally {
        loadingMoreRef.current = false;
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [currentChatId, visitorId]
  );

  // Load history khi chatId thay đổi
  useEffect(() => {
    if (currentChatId) {
      console.log("[ChatView] Loading history for chatId:", currentChatId);
      fetchChatHistory(1);
    } else {
      setChatItems([]);
    }
  }, [currentChatId, fetchChatHistory]);

  // Xử lý scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;

      if (target.scrollTop <= 20 && hasMore && !loadingMoreRef.current) {
        fetchChatHistory(page + 1);
      }

      const isAtBottom =
        Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 5;
      setShowScrollDown(!isAtBottom);
    },
    [fetchChatHistory, hasMore, page]
  );

  // Socket setup với better error handling
  useEffect(() => {
    if (!currentChatId) return;

    console.log("[Socket] Setting up for chatId:", currentChatId);

    // Cleanup existing socket
    if (socketRef.current) {
      console.log("[Socket] Disconnecting existing socket");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("[Socket] Connected successfully to", socketBaseUrl);
    });

    socket.on('disconnect', (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on('error', (error) => {
      console.error("[Socket] Error:", error);
    });

    const handleChatReceive = (data: { chatId: string; question: string; answer: string; }) => {
      console.log("[Socket] chat:receive:", data);

      if (data.chatId !== currentChatId) {
        console.log("[Socket] chatId mismatch: expected", currentChatId, "got", data.chatId);
        return;
      }

      const tempId = `temp-${Date.now()}`;
      tempMessageIdRef.current = tempId;
      console.log("[Socket] Setting tempMessageId:", tempId);

      setChatItems((prev) => {
        const newItem = {
          _id: tempId,
          question: data.question,
          answer: "",
          createdAt: new Date().toISOString(),
        };
        console.log("[Socket] Adding new chat item:", newItem);
        return [...prev, newItem];
      });

      // Start typewriter immediately
      setTimeout(() => typeWriteAnswer(data.answer), 100);
    };

    const handleChatResponse = (response: any) => {
      console.log("[Socket] chat:response:", response);

      const tempId = tempMessageIdRef.current;
      if (!tempId) {
        console.warn("[Socket] No tempMessageIdRef when response received");
        return;
      }

      if (response.Code !== 1) {
        console.error("[Socket] Error response:", response);
        toast.error(response.Message || "Đã xảy ra lỗi.");
        setBotTyping(false);
        tempMessageIdRef.current = null;
        return;
      }

      const data = response.Data;
      console.log("[Socket] Processing response data:", data);

      // Update chat item with real ID
      if (data.historyId) {
        setChatItems((prev) => {
          const updated = prev.map((item) => {
            if (item._id === tempId) {
              console.log("[Socket] Updating temp ID to real ID:", tempId, "->", data.historyId);
              return { ...item, _id: data.historyId };
            }
            return item;
          });
          return updated;
        });
        tempMessageIdRef.current = data.historyId;
      }

      if (data.visitorId) saveVisitorId(data.visitorId);

      if (data.chatId && data.chatId !== currentChatId) {
        setCurrentChatId(data.chatId);
        onNewChatCreated?.(data.chatId);
      }

      if (data.answer) {
        setTimeout(() => typeWriteAnswer(data.answer), 100);
      } else {
        setBotTyping(false);
        console.warn("[Socket] No answer in response");
      }
    };

    socket.on("chat:receive", handleChatReceive);
    socket.on("chat:response", handleChatResponse);

    return () => {
      console.log("[Socket] Cleaning up socket for chatId:", currentChatId);
      socket.off("chat:receive", handleChatReceive);
      socket.off("chat:response", handleChatResponse);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentChatId, typeWriteAnswer, onNewChatCreated]);

  // Enhanced handleSend với better error handling
  const handleSend = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      console.log("[ChatView] Sending question:", question);
      
      const tempId = `temp-${Date.now()}`;
      tempMessageIdRef.current = tempId;

      // Add question to chat immediately
      const newChatItem = {
        _id: tempId,
        question,
        answer: "",
        createdAt: new Date().toISOString(),
      };

      console.log("[ChatView] Adding question to chat:", newChatItem);
      setChatItems((prev) => [...prev, newChatItem]);
      setBotTyping(true);

      try {
        const requestData = {
          question,
          chatId: currentChatId,
          visitorId,
        };
        console.log("[ChatView] Sending API request:", requestData);

        const res = await axiosClient.post("/chatbot/chat", requestData);
        const data = res.data.Data;
        console.log("[API/chatbot/chat] Response:", data);

        if (data.visitorId) saveVisitorId(data.visitorId);

        // Update with real history ID
        if (data.historyId) {
          console.log("[ChatView] Updating with real historyId:", data.historyId);
          setChatItems((prev) =>
            prev.map((item) =>
              item._id === tempId ? { ...item, _id: data.historyId } : item
            )
          );
          tempMessageIdRef.current = data.historyId;
        }

        if (data.chatId && data.chatId !== currentChatId) {
          setCurrentChatId(data.chatId);
          onNewChatCreated?.(data.chatId);
        }

        // Start typewriter for answer
        if (data.answer) {
          console.log("[ChatView] Starting typewriter for answer length:", data.answer.length);
          setTimeout(() => typeWriteAnswer(data.answer), 200);
        } else {
          console.warn("[ChatView] No answer received");
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
        console.error("[ChatView] Send error:", error);
        toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
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
    [currentChatId, onNewChatCreated, typeWriteAnswer, visitorId]
  );

  // Feedback handler
  const handleFeedback = async (
    historyId: string,
    rating: number,
    comment: string,
    feedbackId?: string
  ) => {
    try {
      let res;
      if (feedbackId) {
        res = await axiosClient.put(`/feedbacks/${feedbackId}`, { rating, comment });
      } else {
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

  if (!currentChatId) {
    return (
      <div className="w-[85%] mx-auto p-6 flex flex-col items-center justify-center h-[85vh] text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Bắt đầu cuộc trò chuyện
          </h3>
          <p className="text-gray-600 mb-6">
            Hãy đặt câu hỏi để tạo đoạn chat mới với AI Assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[85%] mx-auto p-4 flex flex-col h-[85vh] relative">
      {/* <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
        <div>ChatId: {currentChatId}</div>
        <div>Items: {chatItems.length}</div>
        <div>BotTyping: {botTyping ? 'true' : 'false'}</div>
        <div>TempId: {tempMessageIdRef.current}</div>
        <div>TypingAnswer: {currentTypingAnswer.length} chars</div>
      </div> */}

      {/* Chat messages */}
      <div
        ref={containerRef}
        className="mb-4 space-y-6 overflow-y-auto flex-grow"
        onScroll={handleScroll}
      >
        {loadingInitial ? (
          <div className="flex flex-col items-center justify-center mt-10">
            <Spin size="large" />
            <p className="text-gray-600 mt-3">Đang tải lịch sử chat...</p>
          </div>
        ) : chatItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">💭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {locationState?.fromHome ? "Đang khởi tạo cuộc trò chuyện..." : "Chưa có cuộc trò chuyện nào"}
            </h3>
            <p className="text-gray-600">
              {locationState?.fromHome ? "Vui lòng chờ một chút..." : "Hãy bắt đầu bằng cách đặt câu hỏi đầu tiên."}
            </p>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <Spin size="small" />
                  <span className="text-sm text-gray-600">Đang tải thêm...</span>
                </div>
              </div>
            )}
            {chatItems.map((item, index) => (
              <div key={`${item._id}-${index}`} className="space-y-4 my-6 flex flex-col">
                <QuestionItem 
                  content={item.question} 
                  timestamp={item.createdAt}
                />
                <AnswerItem
                  content={item._id === tempMessageIdRef.current && botTyping
                    ? currentTypingAnswer
                    : item.answer}
                  isFeedback={item.isFeedback || false}
                  feedback={item.feedback || undefined}
                  onFeedback={(value) => handleFeedback(item._id, value.rating, value.comment, value.feedbackId)}
                  isTyping={item._id === tempMessageIdRef.current && botTyping}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
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
            className="fixed bottom-[100px] right-8 cursor-pointer z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg select-none transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            style={{ width: 48, height: 48 }}
          >
            <DownOutlined style={{ fontSize: 20 }} />
          </div>
        </Tooltip>
      )}

      {/* Input section */}
      <div className="relative">
        <ChatInputBox 
          onSend={handleSend} 
          chatId={currentChatId} 
          isDisabled={false}
          isBotTyping={botTyping}
          mode="chat"
        />
      </div>
    </div>
  );
};

export default ChatView;
