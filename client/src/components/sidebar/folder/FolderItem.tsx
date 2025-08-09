import { memo, useEffect, useState } from "react";
import { FolderOpenOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
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
  const [modalType, setModalType] = useState<"rename" | "addProject" | "delete">("rename");
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

  const openDeleteModal = () => {
    setModalType("delete");
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
        const res = await chatApi.createChat(projectName.trim(), id);
        if (res.Code === 1) {
          message.success("Tạo đoạn chat thành công");
          setModalVisible(false);
          fetchChats();
          reload?.();
        } else {
          message.error(res.Message || "Tạo đoạn chat thất bại"); 
        }
      } catch {
        message.error("Tạo đoạn chat thất bại");
      } finally {
        setLoading(false);
      }
    }

    if (modalType === "delete") {
      setLoading(true);
      try {
        const res = await folderApi.deleteFolder(id);
        if (res.Code === 1) {
          message.success("Xoá thư mục thành công");
          setModalVisible(false);
          reload?.();
        } else {
          message.error(res.Message || "Xoá thư mục thất bại");
        }
      } catch {
        message.error("Lỗi khi xoá thư mục");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
  };

  // Render modal content based on type
  const renderModalContent = () => {
    switch (modalType) {
      case "rename":
        return (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={50}
            autoFocus
            onPressEnter={handleModalOk}
            placeholder="Nhập tên thư mục mới"
          />
        );
      case "addProject":
        return (
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            maxLength={50}
            autoFocus
            onPressEnter={handleModalOk}
            placeholder="Nhập tên đoạn chat mới"
          />
        );
      case "delete":
        return (
          <div className="flex items-start gap-3">
            <ExclamationCircleOutlined
              className="text-red-500 text-xl mt-1 flex-shrink-0"
            />
            <div className="flex flex-col gap-2">
              <p className="text-gray-700 mb-2">
                Bạn có chắc chắn muốn xoá thư mục <strong>"{name}"</strong>?
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Get modal config based on type
  const getModalConfig = () => {
    switch (modalType) {
      case "rename":
        return {
          title: "Đổi tên thư mục",
          okText: "Lưu",
          okType: "primary" as const,
        };
      case "addProject":
        return {
          title: "Tạo đoạn chat trong thư mục",
          okText: "Tạo",
          okType: "primary" as const,
        };
      case "delete":
        return {
          title: "Xác nhận xoá thư mục",
          okText: "Xoá thư mục",
          okType: "danger" as const,
        };
      default:
        return {
          title: "",
          okText: "OK",
          okType: "primary" as const,
        };
    }
  };

  const modalConfig = getModalConfig();

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
            onDelete={openDeleteModal}
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
        title={modalConfig.title}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={modalConfig.okText}
        cancelText="Hủy"
        confirmLoading={loading}
        okType={modalConfig.okType}
        width={modalType === "delete" ? 480 : 400}
        centered
        maskClosable={false}
        keyboard={modalType !== "delete"} // Ngăn ESC đóng modal delete
      >
        {renderModalContent()}
      </Modal>
    </>
  );
};

export default memo(FolderItem);
