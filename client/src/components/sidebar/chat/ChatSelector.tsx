import { PlusOutlined } from "@ant-design/icons";
import { Tooltip, Modal, Input, Button, message } from "antd";
import { useRef, useState } from "react";
import ChatList from "./ChatList";
import { chatApi } from "@/api/chat.api";

interface ChatSelectorProps {
    title?: string;
    icon?: React.ReactNode;
}

const ChatSelector = ({ title = "Đoạn chat", icon }: ChatSelectorProps) => {
    const [openModal, setOpenModal] = useState(false);
    const [newChatName, setNewChatName] = useState("");
    const [creating, setCreating] = useState(false);
    const chatListRef = useRef<{ reload: () => void }>(null);

    const openCreateModal = () => setOpenModal(true);
    const closeCreateModal = () => {
        setOpenModal(false);
        setNewChatName("");
    };

    const handleReloadChats = () => {
        chatListRef.current?.reload();
    };

    const handleCreate = async () => {
        if (!newChatName.trim()) {
            message.error("Vui lòng nhập tên đoạn chat");
            return;
        }
        setCreating(true);
        try {
            const res = await chatApi.createChat(newChatName.trim());
            if (res.Code === 1) {
                message.success("Tạo đoạn chat mới thành công");
                closeCreateModal();
                handleReloadChats(); // gọi reload khi tạo thành công
            } else {
                message.error(res.Message || "Tạo đoạn chat thất bại");
            }
        } catch {
            message.error("Lỗi kết nối hoặc server");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center group h-6">
                <div className="folder-sidebar-title">{title}</div>
                <Tooltip placement="right" title={`Thêm ${title.toLowerCase()} mới`}>
                    <Button
                        icon={<PlusOutlined />}
                        size="small"
                        type="text"
                        onClick={openCreateModal}
                        className="md:hidden md:group-hover:flex"
                    />
                </Tooltip>
            </div>

            <ChatList ref={chatListRef} />

            <Modal
                title="Tạo đoạn chat mới"
                open={openModal}
                onOk={handleCreate}
                onCancel={closeCreateModal}
                okButtonProps={{ loading: creating }}
                okText="Tạo"
            >
                <Input
                    placeholder="Tên đoạn chat"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    maxLength={50}
                    autoFocus
                />
            </Modal>
        </div>
    );
};

export default ChatSelector;
