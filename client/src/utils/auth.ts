import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "token";
const VISITOR = "visitorId";

export const saveVisitorId = (visitorId: string) => {
  localStorage.setItem(VISITOR, visitorId);
}

export const getVisitorId = (): string | null => {
  return localStorage.getItem(VISITOR);
}

export const saveToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) return false;

  try {
    const decoded: { exp: number } = jwtDecode(token);
    // exp là timestamp (giây), so sánh với thời gian hiện tại
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const isAuthenticated = (): boolean => {
  return isTokenValid();
};