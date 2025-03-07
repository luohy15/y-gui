import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Chat } from '@shared/types';
import ChatList from './ChatList';
import ChatView from './ChatView';
import Login from './Login';
import { Settings } from './Settings';
import Header from './Header';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function App() {
  const [token, setToken] = React.useState<string | null>(
    localStorage.getItem('authToken')
  );

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  return (
    <ThemeProvider>
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <BrowserRouter>
          <Header onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<ChatList />} />
            <Route path="/chat/:id" element={<ChatView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}
