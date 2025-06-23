import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatInputBox from "@/components/chat/ChatInputBox";
import axiosClient from "@/api/axiosClient";
import Chatbot from "@/assets/images/chatbot.jpg";
import { saveVisitorId, getVisitorId } from "@/utils/auth";

const HomeView = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const visitorId = getVisitorId();
      const res = await axiosClient.post("/chatbot/chat", { question, visitorId });
      const data = res.data.Data;
      if (data?.visitorId) saveVisitorId(data.visitorId);
      if (data?.chatId) {
        // Chuyển sang trang chat với chatId mới được tạo
        navigate(`/chat/${data.chatId}`);
      } else {
        alert("Không thể tạo đoạn chat mới, vui lòng thử lại");
      }
    } catch (error) {
      console.error(error);
      alert(`${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-4 w-[60%]">
      <img src={Chatbot} alt="chatbot" className="h-20 w-20" />
      <div className="text-xl text-center">
        Bạn có thắc mắc gì về việc tuyển sinh của TDTU không?
      </div>
      <ChatInputBox onSend={handleSend} />
      {loading && <div className="mt-2 text-gray-500">Đang gửi...</div>}
    </div>
  );
};

export default HomeView;
