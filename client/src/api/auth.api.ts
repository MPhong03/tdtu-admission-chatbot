import axiosClient from "./axiosClient";

export const authApi = {
  login: async (
    email: string,
    password: string,
    visitorId?: string
  ): Promise<{ token: string }> => {
    const res = await axiosClient.post("/auth/login", { email, password, visitorId });
    return res.data.Data;
  },

  register: async (
    username: string,
    email: string,
    password: string,
    visitorId?: string
  ): Promise<any> => {
    const res = await axiosClient.post("/auth/register", {
      username,
      email,
      password,
      visitorId
    });
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("token");
  },

  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<any> => {
    const res = await axiosClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
    });
    return res.data;
  },
};
