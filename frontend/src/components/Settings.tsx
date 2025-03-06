import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState('••••••••••••••••');

  return (
    <div className={`min-h-full ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'} border-b`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'} mr-4`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
              <h1 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Appearance Section */}
          <section>
            <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Appearance</h2>
            <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-lg space-y-6`}>
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Theme</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Choose your preferred theme</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Light</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isDarkMode}
                      onChange={(e) => setIsDarkMode(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dark</span>
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Font Size</h3>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className={`w-full h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-lg appearance-none cursor-pointer`}
                />
                <div className={`flex justify-between text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>12px</span>
                  <span>16px</span>
                  <span>20px</span>
                </div>
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section>
            <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Account</h2>
            <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-lg space-y-6`}>
              {/* API Key */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>API Key</label>
                <div className="flex space-x-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className={`flex-1 input-primary rounded-md px-3 py-2 text-sm ${
                      isDarkMode ? 'text-white bg-gray-800' : 'text-gray-900 bg-gray-50'
                    }`}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={`px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } rounded-md transition-colors`}
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Default AI Model
                </label>
                <select
                  className={`w-full input-primary rounded-md px-3 py-2 text-sm ${
                    isDarkMode ? 'text-white bg-[#1a1a1a]' : 'text-gray-900 bg-white'
                  }`}
                >
                  <option>Claude</option>
                  <option>GPT-4</option>
                  <option>GPT-3.5</option>
                </select>
              </div>
            </div>
          </section>

          {/* Data Management Section */}
          <section>
            <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Data Management</h2>
            <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-lg space-y-6`}>
              {/* Storage Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Storage Usage</h3>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>2.1 GB / 5 GB</span>
                </div>
                <div className={`w-full h-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div className="bg-[#4285f4] h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              {/* Export Data */}
              <div className="space-y-2">
                <h3 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Export Data</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#4285f4] rounded-md hover:bg-[#3b78e7] focus:outline-none">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Export All Chats
                  </button>
                  <button
                    className={`flex items-center justify-center px-4 py-2 text-sm font-medium ${
                      isDarkMode
                        ? 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    } rounded-md focus:outline-none`}
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                    Backup Settings
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'} mb-4`}>Danger Zone</h2>
            <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} rounded-lg space-y-4`}>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Delete All Data
                </button>
                <button className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"></path>
                  </svg>
                  Delete Account
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
