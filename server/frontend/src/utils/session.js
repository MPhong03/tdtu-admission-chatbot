const TOKEN_KEY = 'jwt_token';
const PROFILE_KEY = 'admin-info';

// TOKEN
export const saveToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

// PROFILE
export const saveProfile = (profile) => {
    localStorage.setItem(PROFILE_KEY, profile);
}

export const getProfile = () => {
    return localStorage.getItem(PROFILE_KEY);
}

export const removeProfile = () => {
    localStorage.removeItem(PROFILE_KEY);
}