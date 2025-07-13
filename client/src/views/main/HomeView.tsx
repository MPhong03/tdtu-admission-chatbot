import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatInputBox from "@/components/chat/ChatInputBox";
import axiosClient from "@/api/axiosClient";
import Chatbot from "@/assets/images/chatbot.jpg";
import { saveVisitorId, getVisitorId } from "@/utils/auth";
import toast from "react-hot-toast";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

const HomeView = () => {
  const [loading, setLoading] = useState(false);
  const { setTitle } = useBreadcrumb();
  const navigate = useNavigate();

  // Set breadcrumb title for HomeView
  useEffect(() => {
    setTitle("Trang chủ");
  }, []);

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      // Bước 1: Tạo chat mới trước
      const visitorId = getVisitorId();
      console.log("[HomeView] Creating new chat...");
      const createChatRes = await axiosClient.post("/chats", {
        name: question.slice(0, 50) + (question.length > 50 ? "..." : ""), // Dùng 50 ký tự đầu làm tên
        visitorId
      });

      const createChatData = createChatRes.data;
      if (createChatData.Code !== 1) {
        throw new Error(createChatData.Message || "Không thể tạo đoạn chat mới");
      }

      const newChatId = createChatData.Data._id;
      console.log("[HomeView] Chat created with ID:", newChatId);

      if (createChatData.Data.visitorId) saveVisitorId(createChatData.Data.visitorId);

      // Bước 2: Navigate đến trang chat với question trong state
      navigate(`/chat/${newChatId}`, {
        state: { 
          initialQuestion: question,
          chatName: createChatData.Data.name || "Cuộc trò chuyện mới",
          fromHome: true
        }
      });

    } catch (error) {
      console.error("[HomeView] Error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo cuộc trò chuyện");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-6 w-[60%] mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
          <img src={Chatbot} alt="chatbot" className="h-16 w-16 rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Trợ lý TDTU
        </h1>
        <p className="text-lg text-gray-600 max-w-md">
          Bạn có thắc mắc gì về việc tuyển sinh của TDTU không?
        </p>
      </div>

      {/* Enhanced ChatInputBox */}
      <div className="w-full max-w-2xl">
        <ChatInputBox 
          onSend={handleSend} 
          mode="home"
          loading={loading}
          placeholder="Đặt câu hỏi để bắt đầu trò chuyện với AI..."
        />
        
        {/* Loading feedback */}
        {loading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-blue-600">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="text-sm font-medium ml-2">Đang tạo cuộc trò chuyện...</span>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      <div className="w-full max-w-2xl">
        <p className="text-sm text-gray-500 mb-3 text-center">Gợi ý câu hỏi:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "Điều kiện tuyển sinh như thế nào?",
            "Học phí các ngành là bao nhiêu?",
            "Có những ngành nào hot hiện nay?",
            "Quy trình đăng ký xét tuyển ra sao?"
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => !loading && handleSend(suggestion)}
              disabled={loading}
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
