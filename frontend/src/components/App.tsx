import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Home from './Home';
import ChatView from './ChatView';
import Login from './Login';
import { Settings } from './Settings/Settings';
import Header from './Header';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  // Show loading indicator while Auth0 initializes
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4285f4]"></div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <Login />
      ) : (
        <BrowserRouter>
					<div className='h-screen flex flex-col'>
          	<Header />
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
