import { useEffect, useState } from "react";
import { Typography, Spin, message } from "antd";
import { IoChatbubblesOutline } from "react-icons/io5";
import ChatInputBox from "@/components/chat/ChatInputBox";
import { useNavigate, useParams } from "react-router-dom";
import { folderApi } from "@/api/folder.api";
import { chatApi } from "@/api/chat.api";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

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

  const { setTitle } = useBreadcrumb();

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
      <ChatInputBox
        onSend={async (question) => {
          console.log("Câu hỏi:", question);
        }}
      />

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
