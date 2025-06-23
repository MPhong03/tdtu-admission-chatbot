import { memo, useEffect, useState } from "react";
import { FolderOpenOutlined } from "@ant-design/icons";
import { Tooltip, Modal, Input, message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import ChatItem from "../chat/ChatItem";
import ItemDropdownMenu from "../ItemDropdownMenu";
import { folderApi } from "@/api/folder.api";
import { chatApi } from "@/api/chat.api";

export interface FolderData {
  id: string;
  name: string;
}

interface FolderItemProps {
  data: FolderData;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  reload?: () => void;
}

const FolderItem = ({
  data,
  isOpen,
  onToggle,
  icon,
  reload,
}: FolderItemProps) => {
  const navigate = useNavigate();
  const { id, name } = data;
  const renderIcon = icon ?? <FolderOpenOutlined />;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"rename" | "addProject">("rename");
  const [renameValue, setRenameValue] = useState(name);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);

  const [chats, setChats] = useState<{ _id: string; name: string }[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChats();
    }
  }, [isOpen]);

  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const res = await chatApi.paginateChats(1, 100, id);
      const mapped = res.items.map((chat: any) => ({
        _id: chat._id,
        name: chat.name,
      }));
      setChats(mapped);
    } catch (err) {
      message.error("Lỗi khi load đoạn chat");
    } finally {
      setLoadingChats(false);
    }
  };

  const openRenameModal = () => {
    setModalType("rename");
    setRenameValue(name);
    setModalVisible(true);
  };

  const openAddProjectModal = () => {
    setModalType("addProject");
    setProjectName("");
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    if (modalType === "rename") {
      if (!renameValue.trim()) {
        message.error("Tên không được để trống");
        return;
      }

      setLoading(true);
      try {
        const res = await folderApi.renameFolder(id, renameValue.trim());
        if (res.Code === 1) {
          message.success("Đổi tên thành công");
          setModalVisible(false);
          reload?.();
        } else {
          message.error(res.Message || "Đổi tên thất bại");
        }
      } catch {
        message.error("Lỗi khi đổi tên thư mục");
      } finally {
        setLoading(false);
      }
    }

    if (modalType === "addProject") {
      if (!projectName.trim()) {
        message.error("Tên đoạn chat không được để trống");
        return;
      }

      setLoading(true);
      try {
        // TODO: Gọi API tạo đoạn chat nếu cần
        message.success("Tạo đoạn chat thành công");
        setModalVisible(false);
        fetchChats();
        reload?.();
      } catch {
        message.error("Tạo đoạn chat thất bại");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteFolder = () => {
    Modal.confirm({
      title: `Xoá thư mục "${name}"?`,
      content: "Tất cả dữ liệu bên trong sẽ bị xoá vĩnh viễn.",
      okText: "Xoá",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await folderApi.deleteFolder(id);
          if (res.Code === 1) {
            message.success("Xoá thư mục thành công");
            reload?.();
          } else {
            message.error(res.Message || "Xoá thư mục thất bại");
          }
        } catch {
          message.error("Lỗi khi xoá thư mục");
        }
      },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div
          className="flex justify-between items-center cursor-pointer group hover:bg-gray-100 rounded px-2 py-1"
          onClick={() => navigate(`/folder/${id}`)}
        >
          <div className="flex gap-2 items-center">
            <div
              className="icon-hover inline-block mr-2"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <Tooltip title="Mở danh sách chat">{renderIcon}</Tooltip>
            </div>
            <Tooltip title={name}>
              <span className="truncate">{name}</span>
            </Tooltip>
          </div>

          <ItemDropdownMenu
            onRename={openRenameModal}
            onDelete={handleDeleteFolder}
            onAddProject={openAddProjectModal}
            addProject
          />
        </div>

        {isOpen && (
          <div className="ml-6 flex flex-col gap-2">
            {loadingChats ? (
              <Spin size="small" />
            ) : chats.length > 0 ? (
              chats.map((chat) => (
                <ChatItem
                  key={chat._id}
                  chat={{ ...chat, userId: "" }}
                  reload={fetchChats}
                  onRenamed={fetchChats}
                />
              ))
            ) : (
              <span className="text-gray-400 italic text-sm">
                Chưa có đoạn chat nào
              </span>
            )}
          </div>
        )}
      </div>

      <Modal
        title={
          modalType === "rename"
            ? "Đổi tên thư mục"
            : "Tạo đoạn chat trong thư mục"
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={modalType === "rename" ? "Lưu" : "Tạo"}
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Input
          value={modalType === "rename" ? renameValue : projectName}
          onChange={(e) =>
            modalType === "rename"
              ? setRenameValue(e.target.value)
              : setProjectName(e.target.value)
          }
          maxLength={50}
          autoFocus
          onPressEnter={handleModalOk}
          placeholder={
            modalType === "rename"
              ? "Nhập tên thư mục mới"
              : "Nhập tên đoạn chat mới"
          }
        />
      </Modal>
    </>
  );
};

export default memo(FolderItem);
