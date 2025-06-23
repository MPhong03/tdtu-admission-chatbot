import { useEffect, useRef, useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  FolderOpenOutlined,
  MenuOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Logo from "@/assets/images/logo.png";
import { Tooltip, Typography } from "antd";
import { useBreakpointMatch } from "@/hooks/useBreakpointMatch";
import PopUpSearch, { PopUpSearchRef } from "./PopUpSearch";
import { SlideDown } from "../animation";
import Chatbot from "@/assets/images/chatbot.jpg";
import SidebarFolderSelector from "./folder/FolderSelector";
import { mockMenu } from "@/mocks";
import { useNavigate } from "react-router-dom";
import ChatSelector from "./chat/ChatSelector";
import { folderApi } from "@/api/folder.api";
import toast from "react-hot-toast";
import { authApi } from "@/api";
import { CgLogOut, CgProfile } from "react-icons/cg";
import { FaPencilAlt } from "react-icons/fa";
import PopUpChangePassWord, {
  PopUpChangePasswordRef,
} from "./PopUpChangePassWord";
import { isAuthenticated } from "@/utils/auth";

const { Title } = Typography;

const Sidebar = () => {
  const navigate = useNavigate();
  const popupSearchRef = useRef<PopUpSearchRef>(null);
  const popupChangePasswordRef = useRef<PopUpChangePasswordRef>(null);
  const isLargeScreen = useBreakpointMatch("md");

  const { isOpen, toggle } = useSidebar();
  const [folders, setFolders] = useState([]);

  const asideClass = isLargeScreen
    ? isOpen
      ? "block static"
      : "hidden static"
    : `fixed top-0 left-0 transform ${isOpen ? "translate-x-0" : "-translate-x-full"
    }`;

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await folderApi.paginateFolders(1, 100);

      const mappedFolders = res.items.map((f: any) => ({
        id: f._id,
        name: f.name,
      }));

      setFolders(mappedFolders);
    } catch (err) {
      console.error("Lỗi khi load folders:", err);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    toast.success("Đăng xuất thành công!");
    navigate("/login");
  };

  return (
    <>
      {(isLargeScreen || isOpen) && (
        <SlideDown>
          {!isLargeScreen && (
            <div
              onClick={toggle}
              className={`
    fixed inset-0 bg-black/50 z-40 transition-opacity
    ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}
  `}
            />
          )}

          <aside
            className={`
          z-50 w-64 max-h-screen min-h-screen bg-gray-50 border-r pl-3 pt-2 flex flex-col gap-4
          transition-all duration-300 relative
          ${asideClass}
        `}
          >
            <div className="absolute top-0 left-0 right-0 px-4 py-3 bg-gray-50 z-10 border-b h-14 flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate("/home")}
              >
                <img src={Logo} alt="logo" className="w-8" />
                <Title level={5} className="uppercase !text-main-red !mb-0">
                  Tuyển sinh
                </Title>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="icon-hover"
                  onClick={() => popupSearchRef.current?.open()}
                >
                  <SearchOutlined style={{ fontSize: 18 }} />
                </div>
                <div className="icon-hover" onClick={toggle}>
                  <MenuOutlined style={{ fontSize: 18 }} />
                </div>
              </div>
            </div>

            <div className="pt-14 py-20 overflow-y-auto h-full">
              <Tooltip placement="right" title="Đoạn chat mới">
                <div className="button-hover" onClick={() => navigate("/home")}>
                  <div className="text-clip-nowrap">
                    <img
                      src={Chatbot}
                      alt="chatbot"
                      className="w-6 h-6 rounded-full border-2 border-main-red"
                    />
                    Chatbot tuyển sinh
                  </div>
                </div>
              </Tooltip>

              <div className="p-2 flex flex-col gap-2">
                <ChatSelector />

                <div className="my-2 border-t border-gray-300"></div>

                <SidebarFolderSelector
                  title="Thư mục"
                  icon={<FolderOpenOutlined />}
                  folders={folders}
                  reload={fetchFolders}
                />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-50 border-t flex flex-col gap-2">
              {isAuthenticated() ? (
                <>
                  <div
                    className="button-hover mt-auto text-main-blue hover:font-semibold"
                    onClick={() => popupChangePasswordRef.current?.open()}
                  >
                    <FaPencilAlt size={18} />
                    <span className="text-sm">Đổi mật khẩu</span>
                  </div>

                  <div
                    className="button-hover mt-[-10px] text-main-red hover:font-semibold"
                    onClick={handleLogout}
                  >
                    <CgLogOut size={20} />
                    <span className="text-sm">Đăng xuất</span>
                  </div>
                </>
              ) : (
                <div
                  className="button-hover text-main-blue hover:font-semibold"
                  onClick={() => navigate("/auth")}
                >
                  <CgProfile size={20} />
                  <span className="text-sm">Đăng nhập</span>
                </div>
              )}
            </div>
          </aside>

          <PopUpSearch ref={popupSearchRef} />
          <PopUpChangePassWord ref={popupChangePasswordRef} />
        </SlideDown>
      )}
    </>
  );
};

export default Sidebar;
