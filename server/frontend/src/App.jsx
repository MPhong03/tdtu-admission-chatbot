import React, { useState, useEffect } from 'react';
import AuthForm from './components/pages/AuthForm';
import Dashboard from './components/pages/Dashboard';
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import { getToken } from './utils/session';
import api from './services/api';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.get('/auth/profile')
        .then(response => {
          if (response.data.Code === 1) {
            setUser(response.data.Data);
          }
        })
        .catch(err => console.error(err));
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData.user || userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      {user ? (
        <MainLayout>
          <Dashboard user={user} onLogout={handleLogout} />
        </MainLayout>
      ) : (
        <AuthLayout>
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        </AuthLayout>
      )}
    </>
  );
};

export default App;
