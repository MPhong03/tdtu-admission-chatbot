import { FolderData } from "@/components/sidebar/folder/FolderItem";

export const mockMenu: FolderData[] = [
  {
    id: "101",
    name: "Hướng dẫn sử dụng kĩ thuật",
    projects: [
      { id: "201", name: "Quy trình A" },
      { id: "202", name: "Quy trình B" },
    ],
  },
  { id: "102", name: "Tài liệu kỹ thuật", projects: [] },
  { id: "103", name: "Template báo cáo", projects: [] },
  {
    id: "104",
    name: "Báo cáo tuần",
    projects: [{ id: "301", name: "Báo cáo tuần 1" }],
  },
  { id: "105", name: "Mẫu hợp đồng", projects: [] },
  {
    id: "106",
    name: "Giao tiếp khách hàng",
    projects: [],
  },
  { id: "107", name: "Cấu hình hệ thống", projects: [] },
];

export const mockFolder = [
  {
    id: "201",
    title: "Quy trình A",
    content:
      "Đây là nội dung hướng dẫn từng bước cho quy trình A từng bước cho quy trình A",
  },
  {
    id: "202",
    title: "Quy trình B",
    content: "Chi tiết các bước thực hiện và tiêu chuẩn trong quy trình B...",
  },
  {
    id: "301",
    title: "Báo cáo tuần 1",
    content: "Nội dung báo cáo tổng hợp công việc trong tuần 1...",
  },
];

export const mockChat = [
  {
    id: "201",
    title: "Quy trình A",
    content:
      "Đây là nội dung chi tiết cho quy trình A bao gồm các bước thực hiện từ A đến Z.",
  },
  {
    id: "202",
    title: "Quy trình B",
    content:
      "Hướng dẫn từng bước để triển khai quy trình B một cách hiệu quả trong tổ chức.",
  },
  {
    id: "301",
    title: "Báo cáo tuần 1",
    content:
      "Báo cáo tổng kết công việc tuần 1: đã hoàn thành các hạng mục được giao, cập nhật tiến độ.",
  },
];
