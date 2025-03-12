import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';

export default function Login() {
  const { loginWithRedirect } = useAuth0();
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
				{/* logo shoud be center */}
				<div className='flex justify-center items-center'>
        	<Logo className='w-16 h-16' />
				</div>
        <h2 className="mt-6 text-center text-2xl font-light tracking-tight">
          y-mcp Chat
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400">
          Sign in to access your chats
        </p>
      </div>

      <div className="mt-10 sm:mx-auto w-full max-w-[90%] sm:max-w-[360px]">
        <div className="flex flex-col space-y-4">
          {/* Google Login Button */}
          <button
            onClick={() => loginWithRedirect({
              authorizationParams: {
                connection: 'google-oauth2'
              }
            })}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
