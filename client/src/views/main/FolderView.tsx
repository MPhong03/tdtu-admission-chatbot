import { useEffect, useState } from "react";
import { Typography, Spin, message } from "antd";
import { IoChatbubblesOutline } from "react-icons/io5";
import ChatInputBox from "@/components/chat/ChatInputBox";
import { useNavigate, useParams } from "react-router-dom";
import { folderApi } from "@/api/folder.api";
import { chatApi } from "@/api/chat.api";
import axiosClient from "@/api/axiosClient";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { saveVisitorId, getVisitorId } from "@/utils/auth";
import toast from "react-hot-toast";
import { useChat } from "@/contexts/ChatContext";

const { Title, Paragraph } = Typography;

interface Folder {
  id: string;
  name: string;
}

interface Chat {
  _id: string;
  name: string;
  content?: string;
}

const FolderView = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatCreationLoading, setChatCreationLoading] = useState(false);

  const { setTitle } = useBreadcrumb();
  const { notifyNewChat } = useChat();

  // Fetch folder + chat theo folderId
  useEffect(() => {
    const fetchData = async () => {
      if (!folderId) return;

      setLoading(true);
      try {
        const folderRes = await folderApi.paginateFolders(1, 100);
        const foundFolder = folderRes.items.find(
          (f: any) => f._id === folderId
        );
        if (!foundFolder) {
          message.error("Không tìm thấy thư mục");
          setFolder(null);
          setChats([]);
          return;
        }

        setTitle(foundFolder.name || "Thư mục");

        setFolder({ id: foundFolder._id, name: foundFolder.name });

        const chatRes = await chatApi.paginateChats(1, 100, folderId);
        setChats(chatRes.items);
      } catch (err: any) {
        message.error(err.message || "Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [folderId]);

  // Handle send message - similar to HomeView but with folderId
  const handleSend = async (question: string) => {
    if (!question.trim()) return;
    
    setChatCreationLoading(true);
    try {
      // Bước 1: Tạo chat mới trong folder
      const visitorId = getVisitorId();
      console.log("[FolderView] Creating new chat in folder:", folderId);
      
      const createChatRes = await axiosClient.post("/chats", {
        name: question.slice(0, 50) + (question.length > 50 ? "..." : ""), // Dùng 50 ký tự đầu làm tên
        visitorId,
        folderId
      });

      const createChatData = createChatRes.data;
      if (createChatData.Code !== 1) {
        throw new Error(createChatData.Message || "Không thể tạo đoạn chat mới");
      }

      const newChatId = createChatData.Data._id;
      console.log("[FolderView] Chat created with ID:", newChatId);

      if (createChatData.Data.visitorId) saveVisitorId(createChatData.Data.visitorId);

      // Bước 2: Notify ChatContext để update Sidebar
      notifyNewChat(createChatData.Data);

      // Bước 3: Update local chats list in FolderView
      setChats(prev => [createChatData.Data, ...prev]);

      // Bước 4: Navigate đến trang chat với question trong state
      navigate(`/chat/${newChatId}`, {
        state: { 
          initialQuestion: question,
          chatName: createChatData.Data.name || "Cuộc trò chuyện mới",
          fromHome: true,
          folderId: folderId
        }
      });
      
    } catch (error) {
      console.error("[FolderView] Error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi tạo cuộc trò chuyện");
    } finally {
      setChatCreationLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full mt-20">
        <Spin size="large" />
      </div>
    );

  if (!folder)
    return (
      <div className="p-4 text-center text-gray-500">
        Không tìm thấy thư mục
      </div>
    );

  return (
    <div className="flex flex-col justify-center gap-4 w-[60%] mx-auto">
      <Title level={3}>{folder.name}</Title>
      
      {/* Enhanced ChatInputBox với loading state */}
      <div className="w-full">
        <ChatInputBox
          onSend={handleSend}
          mode="home"
          loading={chatCreationLoading}
          placeholder="Đặt câu hỏi để bắt đầu trò chuyện mới trong thư mục..."
        />
        
        {/* Loading feedback */}
        {chatCreationLoading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-blue-600">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="text-sm font-medium ml-2">Đang tạo cuộc trò chuyện...</span>
          </div>
        )}
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col justify-center items-center gap-2 mt-20">
          <IoChatbubblesOutline size={20} />
          <Paragraph italic>Hãy bắt đầu 1 đoạn chat mới</Paragraph>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <Paragraph strong className="text-xs mt-6">
            Danh sách chat trong thư mục
          </Paragraph>
          {chats.map((chat) => (
            <div
              key={chat._id}
              className="border rounded p-4 shadow-sm bg-gray-50 hover:shadow-md transition flex items-center gap-4 cursor-pointer"
              onClick={() => navigate(`/chat/${chat._id}`)}
            >
              <IoChatbubblesOutline size={20} />
              <div className="text-sm">
                <div className="font-semibold">{chat.name}</div>
                <div className="line-clamp-1 overflow-hidden text-ellipsis text-gray-500">
                  {chat.content || "Không có nội dung hiển thị"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderView;