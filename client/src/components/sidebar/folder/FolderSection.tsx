import { folderApi } from "@/api/folder.api";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, message, Modal, Tooltip } from "antd";
import { useState } from "react";

interface Props {
  title: string;
  children?: React.ReactNode;
  reload?: () => void;
}

const FolderSection = ({ title, children, reload }: Props) => {
  const [openModal, setOpenModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const openCreateModal = () => setOpenModal(true);
  const closeCreateModal = () => {
    setOpenModal(false);
    setNewFolderName("");
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      message.error("Vui lòng nhập tên thư mục");
      return;
    }
    setCreating(true);
    try {
      const res = await folderApi.createFolder(newFolderName.trim());
      if (res.Code === 1) {
        message.success("Tạo thư mục mới thành công");
        closeCreateModal();
        reload?.();
      } else {
        message.error(res.Message || "Tạo thư mục thất bại");
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
          <div
            className="icon-hover !h-6 !w-6 !rounded-lg transition-all duration-200
              flex md:!hidden md:group-hover:!flex"
          >
            <Button
              icon={<PlusOutlined />}
              size="small"
              type="text"
              onClick={openCreateModal}
              className="md:hidden md:group-hover:flex"
            />
          </div>
        </Tooltip>
      </div>

      {children}

      <Modal
        title="Tạo thư mục mới"
        open={openModal}
        onOk={handleCreate}
        onCancel={closeCreateModal}
        okButtonProps={{ loading: creating }}
        okText="Tạo"
      >
        <Input
          placeholder="Tên thư mục"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          maxLength={50}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default FolderSection;
