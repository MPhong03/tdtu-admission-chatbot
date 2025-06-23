import FolderItem, { FolderData } from "./FolderItem";

interface FolderListProps {
  folders: FolderData[];
  openFolderIds: string[];
  toggleFolder: (id: string) => void;
  icon?: React.ReactNode;
  reload?: () => void;
}

const FolderList = ({
  folders,
  openFolderIds,
  toggleFolder,
  icon,
  reload,
}: FolderListProps) => {
  return (
    <div className="flex flex-col gap-2">
      {folders.slice(0, 5).map((folder) => (
        <FolderItem
          key={folder.id}
          data={folder}
          icon={icon}
          isOpen={openFolderIds.includes(folder.id)}
          onToggle={() => toggleFolder(folder.id)}
          reload={reload}
        />
      ))}
    </div>
  );
};

export default FolderList;
