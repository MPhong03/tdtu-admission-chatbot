import axiosClient from "./axiosClient";
import { getVisitorId } from "@/utils/auth";

export const chatApi = {
    paginateChats: async (
        page: number,
        size: number,
        folderId?: string
    ) => {
        const params: any = { page, size };
        if (folderId) params.folderId = folderId;
        const visitorId = getVisitorId();
        if (visitorId) params.visitorId = visitorId;
        const res = await axiosClient.get("/chats", { params });
        if (res.data.Code !== 1) throw new Error(res.data.Message || "Failed to load chats");
        return res.data.Data;
    },

    createChat: async (name: string, folderId?: string) => {
        const visitorId = getVisitorId();
        const res = await axiosClient.post("/chats", { name, folderId, visitorId });
        return res.data;
    },

    deleteChat: async (id: string) => {
        const visitorId = getVisitorId();
        const res = await axiosClient.delete(`/chats/${id}?visitorId=${visitorId}`);
        return res.data;
    },

    renameChat: async (id: string, name: string) => {
        const visitorId = getVisitorId();
        const res = await axiosClient.patch(`/chats/${id}/rename`, { name, visitorId });
        return res.data;
    },

    moveChatToFolder: async (id: string, folderId: string) => {
        const visitorId = getVisitorId();
        const res = await axiosClient.patch(`/chats/${id}/move`, { folderId, visitorId });
        return res.data;
    }
};
