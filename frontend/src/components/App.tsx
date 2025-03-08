import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
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
					<div className='h-screen flex flex-col'>
          	<Header onLogout={handleLogout} />
						<div className='flex-1 overflow-auto'>
							<Routes>
								<Route path="/" element={<Home />} />
								<Route path="/chat/:id" element={<ChatView />} />
								<Route path="/settings" element={<Settings />} />
								<Route path="*" element={<Navigate to="/" replace />} />
							</Routes>
						</div>
					</div>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}
