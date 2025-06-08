import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { Home, QAPage, UserPage, SystemConfigs } from "@/pages/dashboard";
import { SignIn } from "@/pages/auth";
import { AdjustmentsHorizontalIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    display: true,
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "Thống kê",
        path: "/home",
        element: <Home />,
        display: true
      },
      {
        icon: <ChatBubbleLeftRightIcon {...icon} />,
        name: "Lịch sử Q&A",
        path: "/qapage",
        element: <QAPage />,
        display: true
      },
      {
        icon: <UserGroupIcon {...icon} />,
        name: "Người dùng",
        path: "/userpage",
        element: <UserPage />,
        display: true
      },
      {
        icon: <AdjustmentsHorizontalIcon {...icon} />,
        name: "Cấu hình chung",
        path: "/systemconfigs",
        element: <SystemConfigs />,
        display: true
      }
    ],
  },
  {
    layout: "auth",
    display: false,
    pages: [
      {
        icon: <UserCircleIcon {...icon} />,
        name: "Đăng nhập",
        path: "/sign-in",
        element: <SignIn />,
        display: false
      }
    ]
  }
];

export default routes;
