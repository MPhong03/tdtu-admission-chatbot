import React from 'react';

const AuthLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-full p-6 bg-white rounded-lg shadow-lg">
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
