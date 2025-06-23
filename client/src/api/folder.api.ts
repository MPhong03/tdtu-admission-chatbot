import axiosClient from "./axiosClient";
import { getVisitorId } from "@/utils/auth";

export const folderApi = {
  paginateFolders: async (page: number, size: number) => {
    const visitorId = getVisitorId();
    const res = await axiosClient.get("/folders", {
      params: { page, size, visitorId },
    });
    if (res.data.Code !== 1)
      throw new Error(res.data.Message || "Failed to load folders");
    return res.data.Data;
  },

  createFolder: async (name: string) => {
    const visitorId = getVisitorId();
    const res = await axiosClient.post("/folders", { name, visitorId });
    return res.data;
  },

  deleteFolder: async (id: string) => {
    const visitorId = getVisitorId();
    const res = await axiosClient.delete(`/folders/${id}?visitorId=${visitorId}`);
    return res.data;
  },

  renameFolder: async (id: string, name: string) => {
    const visitorId = getVisitorId();
    const res = await axiosClient.patch(`/folders/${id}/rename`, { name, visitorId });
    return res.data;
  },
};
