import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BanknotesIcon,
  GiftIcon,
  PaperClipIcon
} from "@heroicons/react/24/solid";
import { 
  Home, 
  QAPage, 
  UserPage, 
  SystemConfigs, 
  ProgrammePage, 
  MajorPage,
  TuitionPage,
  ScholarshipPage,
  DocumentPage
} from "@/pages/dashboard";
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
        path: "/qa",
        element: <QAPage />,
        display: true
      },
      {
        icon: <UserGroupIcon {...icon} />,
        name: "Người dùng",
        path: "/user",
        element: <UserPage />,
        display: true
      },
      {
        icon: <AcademicCapIcon {...icon} />,
        name: "Chương trình/hệ",
        path: "/programme",
        element: <ProgrammePage />,
        display: true
      },
      {
        icon: <BookOpenIcon  {...icon} />,
        name: "Ngành học",
        path: "/major",
        element: <MajorPage />,
        display: true
      },
      {
        icon: <BanknotesIcon  {...icon} />,
        name: "Học phí",
        path: "/tuition",
        element: <TuitionPage />,
        display: true
      },
      {
        icon: <GiftIcon  {...icon} />,
        name: "Học bổng",
        path: "/scholarship",
        element: <ScholarshipPage />,
        display: true
      },
      {
        icon: <PaperClipIcon  {...icon} />,
        name: "Tài liệu",
        path: "/document",
        element: <DocumentPage />,
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
