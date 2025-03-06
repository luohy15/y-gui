import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LoginProps {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [secretKey, setSecretKey] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const { isDarkMode, setIsDarkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKey.trim() }),
        credentials: 'omit'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Invalid secret key');
      }

      const data = await response.json() as { token?: string; message?: string };

      if (!data.token) {
        throw new Error('Invalid response from server');
      }

      const { token } = data;
      localStorage.setItem('authToken', token);
      onLogin(token);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (!navigator.onLine) {
        setError('Please check your internet connection');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`min-h-screen flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>
      {/* Theme toggle */}
      <div className="fixed top-6 right-6">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`inline-flex items-center justify-center p-2 rounded-full ${
            isDarkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          } transition-colors`}
        >
          {isDarkMode ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="mx-auto h-12 w-12 bg-[#4285f4] rounded-full flex items-center justify-center transform transition hover:scale-105">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-2xl font-light tracking-tight">
          y-gui Chat
        </h2>
        <p className="mt-3 text-center text-sm text-gray-400">
          Enter your secret key to access your chats
        </p>
      </div>

      <div className="mt-10 sm:mx-auto w-full max-w-[90%] sm:max-w-[360px]">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="secretKey" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              Secret Key
            </label>
            <input
              id="secretKey"
              type="password"
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="off"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className={`appearance-none block w-full px-3 py-2 rounded-md text-sm focus:outline-none transition-all duration-200 ${
                isDarkMode
                  ? 'bg-[#1a1a1a] border-[#333] text-white placeholder-gray-500 focus:border-[#4285f4]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-[#4285f4]'
              } ${error ? 'border-red-500' : 'border'}`}
              placeholder="Enter your secret key"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={`h-4 w-4 rounded focus:ring-0 text-[#4285f4] transition-all duration-200 ${
                isDarkMode ? 'bg-[#1a1a1a] border-gray-600' : 'border-gray-300'
              }`}
            />
            <label htmlFor="remember-me" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Remember me
            </label>
          </div>

          {error && (
            <div role="alert" className="text-sm text-red-500 text-center" aria-live="polite">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !secretKey.trim()}
              className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-[#4285f4] hover:bg-[#3b78e7] focus:outline-none transition-all duration-200 transform hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              aria-busy={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <a href="#" className="text-sm font-medium text-[#4285f4] hover:text-[#3b78e7] transition-colors">
            Learn how to get your secret key
          </a>
        </div>
      </div>
    </div>
  );
}
