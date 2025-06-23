import { useEffect, useRef, useState } from "react";
import FolderSection from "./FolderSection";
import FolderList from "./FolderList";
import { FolderData } from "./FolderItem";
import { Popover, Tooltip } from "antd";
import { TfiMore } from "react-icons/tfi";

interface FolderSelectorProps {
  title?: string;
  folders: FolderData[];
  icon?: React.ReactNode;
  maxVisible?: number;
  reload?: () => void;
}

const FolderSelector = ({
  title = "Thư mục",
  folders,
  icon,
  maxVisible = 5,
  reload,
}: FolderSelectorProps) => {
  const [openFolderIds, setOpenFolderIds] = useState<string[]>([]);
  const [visibleFolders, setVisibleFolders] = useState<FolderData[]>(
    folders.slice(0, maxVisible)
  );
  const [hiddenFolders, setHiddenFolders] = useState<FolderData[]>(
    folders.slice(maxVisible)
  );

  const handleSelectFolder = (selectedFolder: FolderData) => {
    const newVisible = [...visibleFolders];
    const replacedFolder = newVisible.shift();
    newVisible.push(selectedFolder);

    const newHidden = [
      replacedFolder!,
      ...hiddenFolders.filter((f) => f.id !== selectedFolder.id),
    ];

    setOpenFolderIds((prev) => prev.filter((id) => id !== replacedFolder!.id));
    setVisibleFolders(newVisible);
    setHiddenFolders(newHidden);
  };

  const toggleFolder = (folderId: string) => {
    setOpenFolderIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const popoverContent = (
    <div>
      {hiddenFolders.map((folder) => (
        <Tooltip placement="right" title={folder.name} key={folder.id}>
          <div
            key={folder.id}
            className="button-hover"
            onClick={() => {
              handleSelectFolder(folder);
            }}
          >
            <span className="text-clip-nowrap">{folder.name}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );

  useEffect(() => {
    setVisibleFolders(folders.slice(0, maxVisible));
    setHiddenFolders(folders.slice(maxVisible));
  }, [folders, maxVisible]);

  return (
    <FolderSection title={title} reload={reload}>
      <FolderList
        folders={visibleFolders}
        openFolderIds={openFolderIds}
        toggleFolder={toggleFolder}
        icon={icon}
        reload={reload}
      />

      {hiddenFolders.length > 0 && (
        <div className="flex relative">
          <Popover
            content={popoverContent}
            trigger="click"
            placement="rightBottom"
          >
            <div className="button-hover !p-1">
              <div className="p-2">
                <TfiMore />
              </div>
              Xem thêm
            </div>
          </Popover>
        </div>
      )}
    </FolderSection>
  );
};

export default FolderSelector;
