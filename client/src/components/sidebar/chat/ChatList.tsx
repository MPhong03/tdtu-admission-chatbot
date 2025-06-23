import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Button, Spin } from "antd";
import ChatItem from "./ChatItem";
import { chatApi } from "@/api/chat.api";
import { ChatData } from "@/interfaces/ChatData";

interface ChatListProps {
  folderId?: string;
  maxInitialLoad?: number;
  pageSize?: number;
}

export interface ChatListRef {
  reload: () => void;
}

const ChatList = forwardRef<ChatListRef, ChatListProps>(
  ({ folderId, maxInitialLoad = 5, pageSize = 10 }, ref) => {
    const [chats, setChats] = useState<ChatData[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadChats = async (pageToLoad: number, append = false) => {
      setLoading(true);
      try {
        const data = await chatApi.paginateChats(
          pageToLoad,
          append ? pageSize : maxInitialLoad,
          folderId
        );
        const items = data.items || [];
        const totalPages = data.pagination?.totalPages || 1;

        setChats((prev) => (append ? [...prev, ...items] : items));
        setHasMore(pageToLoad < totalPages);
        setPage(pageToLoad);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      reload: () => loadChats(1, false),
    }));

    useEffect(() => {
      loadChats(1, false);
    }, [folderId]);

    const handleDelete = (id: string) => {
      setChats((prev) => prev.filter((c) => c._id !== id));
    };

    const handleRename = (id: string, name: string) => {
      setChats((prev) => prev.map((c) => (c._id === id ? { ...c, name } : c)));
    };

    return (
      <>
        {loading && chats.length === 0 ? (
          <Spin />
        ) : (
          <>
            {chats.map((chat) => (
              <ChatItem
                key={chat._id}
                chat={chat}
                reload={handleDelete}
                onRenamed={handleRename}
              />
            ))}
            {hasMore && (
              <Button
                type="link"
                block
                onClick={() => loadChats(page + 1, true)}
                disabled={loading}
                className="mt-2"
              >
                Xem thêm
              </Button>
            )}
          </>
        )}
      </>
    );
  }
);

export default ChatList;
