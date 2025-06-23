import { useEffect, useState } from "react";
import { Modal, Input, message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { chatApi } from "@/api/chat.api";
import { folderApi } from "@/api/folder.api";
import ItemDropdownMenu from "../ItemDropdownMenu";

interface ChatData {
  _id: string;
  userId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Folder {
  id: string;
  name: string;
}

interface ChatItemProps {
  chat: ChatData;
  reload?: (id: string) => void;
  onRenamed?: (id: string, name: string) => void;
}

const ChatItem = ({ chat, reload, onRenamed }: ChatItemProps) => {
  const navigate = useNavigate();

  // Modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.name);
  const [loading, setLoading] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);

  useEffect(() => {
    if (moveModalVisible) {
      fetchFolders(1);
    }
  }, [moveModalVisible]);

  const fetchFolders = async (pageToFetch: number) => {
    setFolderLoading(true);
    try {
      const res = await folderApi.paginateFolders(pageToFetch, 5);
      const newFolders = res.items.map((f: any) => ({
        id: f._id,
        name: f.name,
      }));

      if (pageToFetch === 1) {
        setFolders(newFolders);
      } else {
        setFolders((prev) => [...prev, ...newFolders]);
      }

      setHasMore(res.items.length === 5);
      setPage(pageToFetch);
    } catch (err) {
      message.error("Không thể tải danh sách thư mục");
    } finally {
      setFolderLoading(false);
    }
  };

  const openRenameModal = () => {
    setRenameValue(chat.name);
    setRenameModalVisible(true);
  };

  const openDeleteModal = () => setDeleteModalVisible(true);
  const closeDeleteModal = () => setDeleteModalVisible(false);
  const openMoveModal = () => setMoveModalVisible(true);
  const closeMoveModal = () => setMoveModalVisible(false);

  const handleRenameOk = async () => {
    if (!renameValue.trim()) {
      message.error("Tên không được để trống");
      return;
    }
    setLoading(true);
    try {
      await chatApi.renameChat(chat._id, renameValue.trim());
      message.success("Đổi tên thành công");
      onRenamed?.(chat._id, renameValue.trim());
      setRenameModalVisible(false);
    } catch {
      message.error("Đổi tên thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    try {
      await chatApi.deleteChat(chat._id);
      message.success("Đã xóa đoạn chat");
      reload?.(chat._id);
      closeDeleteModal();
    } catch {
      message.error("Xóa thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await chatApi.moveChatToFolder(chat._id, folderId);

      if (res.Code === 1) {
        message.success("Di chuyển đoạn chat thành công");
        closeMoveModal();
        reload?.(chat._id);
      } else {
        message.error(res.Message || "Di chuyển thất bại");
      }
    } catch (err) {
      message.error("Lỗi khi di chuyển đoạn chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="flex justify-between items-center cursor-pointer group hover:bg-gray-100 rounded px-2 py-1"
        onClick={() => navigate(`/chat/${chat._id}`)}
        title={chat.name}
      >
        <div className="truncate">{chat.name}</div>

        <ItemDropdownMenu
          onMoveFolder={openMoveModal}
          onRename={openRenameModal}
          onDelete={openDeleteModal}
          showMoveToFolder
        />
      </div>

      <Modal
        title="Đổi tên đoạn chat"
        open={renameModalVisible}
        onOk={handleRenameOk}
        onCancel={() => setRenameModalVisible(false)}
        confirmLoading={loading}
        okText="Lưu"
        cancelText="Hủy"
        afterClose={() => setRenameValue(chat.name)}
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          maxLength={50}
          autoFocus
          onPressEnter={handleRenameOk}
          placeholder="Nhập tên đoạn chat"
        />
      </Modal>

      <Modal
        title={`Xóa đoạn chat "${chat.name}"?`}
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        okText="Xóa"
        okType="danger"
        cancelText="Hủy"
        confirmLoading={loading}
      />

      <Modal
        title="Chọn thư mục cần di chuyển"
        open={moveModalVisible}
        onCancel={closeMoveModal}
        footer={null}
      >
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="button-hover !min-h-10"
              onClick={() => handleFolderClick(folder.id)}
            >
              {folder.name}
            </div>
          ))}

          {folderLoading && <Spin size="small" />}

          {hasMore && !folderLoading && (
            <button
              className="button-hover min-h-9 !w-fit !px-4 !py-2 mx-auto rounded-md"
              onClick={() => fetchFolders(page + 1)}
            >
              Xem thêm
            </button>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ChatItem;
