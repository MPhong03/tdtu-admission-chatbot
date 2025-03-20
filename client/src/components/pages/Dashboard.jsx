import React from 'react';
import { removeToken } from '../../utils/session';

const Dashboard = ({ user, onLogout }) => {
    const handleLogout = () => {
        removeToken();
        onLogout();
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2">Chào mừng, {user.username || user.email}!</p>
            <button
                onClick={handleLogout}
                className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
                Đăng xuất
            </button>
        </div>
    );
};

export default Dashboard;
