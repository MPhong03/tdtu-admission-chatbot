import { Dropdown, MenuProps } from "antd";
import { TfiMoreAlt } from "react-icons/tfi";
import { TbTrash, TbEdit, TbFolder, TbFile } from "react-icons/tb";
import type { MenuInfo } from "rc-menu/lib/interface";

interface ItemDropdownMenuProps {
  onAddProject?: () => void;
  onMoveFolder?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  showMoveToFolder?: boolean;
  addProject?: boolean;
  triggerClassName?: string;
}

const ItemDropdownMenu = ({
  onAddProject,
  onMoveFolder,
  onRename,
  onDelete,
  showMoveToFolder = false,
  addProject = false,
  triggerClassName = "",
}: ItemDropdownMenuProps) => {
  const handleAddProject = (e: MenuInfo) => {
    e.domEvent.stopPropagation();
    onAddProject?.();
  };

  const handleMoveFolder = (e: MenuInfo) => {
    e.domEvent.stopPropagation();
    onMoveFolder?.();
  };

  const handleRename = (e: MenuInfo) => {
    e.domEvent.stopPropagation();
    onRename?.();
  };

  const handleDelete = (e: MenuInfo) => {
    e.domEvent.stopPropagation();
    onDelete?.();
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "rename",
      label: "Đổi tên",
      icon: <TbEdit size={16} />,
      onClick: handleRename,
    },
    showMoveToFolder
      ? {
          key: "move",
          label: "Chuyển vào thư mục",
          icon: <TbFolder size={16} />,
          onClick: handleMoveFolder,
        }
      : null,
    addProject
      ? {
          key: "add",
          label: "Thêm đoạn chat",
          icon: <TbFile size={16} />,
          onClick: handleAddProject,
        }
      : null,
    {
      key: "delete",
      label: "Xoá",
      icon: <TbTrash size={16} />,
      onClick: handleDelete,
    },
  ].filter(Boolean) as MenuProps["items"];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomLeft"
    >
      <div
        className={`p-1 cursor-pointer invisible group-hover:visible ${triggerClassName}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="menu"
      >
        <TfiMoreAlt size={18} />
      </div>
    </Dropdown>
  );
};

export default ItemDropdownMenu;
