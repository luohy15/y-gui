import React, { KeyboardEvent, useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthenticatedSWR } from '../utils/api';
import { BotConfig } from '@shared/types';

interface MessageInputProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  selectedBot: string | undefined;
  setSelectedBot: React.Dispatch<React.SetStateAction<string | undefined>>;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onSendMessage?: (content: string, botName: string) => void;
  isFixed?: boolean; // Controls whether the input is fixed at the bottom of the screen
  onStop?: () => void; // Callback for stopping message generation
}

export default function MessageInput({
  message,
  setMessage,
  selectedBot,
  setSelectedBot,
  isLoading,
  handleSubmit,
  onSendMessage,
  isFixed = true, // Default to fixed position for backward compatibility
  onStop
}: MessageInputProps) {
  const { isDarkMode } = useTheme();

  // Fetch bots data internally using authenticated SWR
  const { data: botsData } = useAuthenticatedSWR<BotConfig[]>('/api/bots');

  const bots = botsData || [];

  // Set default bot to first in the array if not already selected
  // Or load from localStorage if available
  React.useEffect(() => {
    // Get the current path
    const currentPath = window.location.pathname;

    // Try to get the selected bot from localStorage
    const savedBot = currentPath === '/'
      ? localStorage.getItem('home_page_selected_bot')  // Special key for home page
      : localStorage.getItem(`chat_${currentPath.split('/').pop()}_selectedBot`);  // Chat-specific key

    if (savedBot) {
      // If we have a saved bot, use it
      setSelectedBot(savedBot);
    } else if (bots.length > 0) {
      // Otherwise use the first bot in the list
      setSelectedBot(bots[0].name);
    }
  }, [bots, setSelectedBot]); // Removed selectedBot from dependencies to prevent infinite loop

  // Save selected bot to localStorage whenever it changes
  React.useEffect(() => {
    if (selectedBot) {
      // Get the current path
      const currentPath = window.location.pathname;

      // Save the selected bot
      if (currentPath === '/') {
        localStorage.setItem('home_page_selected_bot', selectedBot);  // Special key for home page
      } else {
        localStorage.setItem(`chat_${currentPath.split('/').pop()}_selectedBot`, selectedBot);  // Chat-specific key
      }
    }
  }, [selectedBot]);

  // Handle Enter key to send message (without Shift key)
  // Skip if in IME composition mode (for languages like Chinese, Japanese, etc.)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (message.trim() && selectedBot !== undefined) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // If onSendMessage is provided, use it instead of the default handleSubmit
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || selectedBot === undefined) {
      return;
    }

    if (onSendMessage) {
            onSendMessage(message, selectedBot || '');
      setMessage('');
      return;
    }

    // Otherwise use the provided handleSubmit
    handleSubmit(e);
  };

  const [showBotDropdown, setShowBotDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBotDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`${isFixed ? 'fixed bottom-0 left-0 right-0' : ''} flex justify-center mx-auto px-4 py-4 sm:w-[60%] max-w-3xl`}>
      <form onSubmit={onSubmit} className="w-full">
        <div className={`relative flex items-center rounded-2xl shadow-lg ${
          isDarkMode ? 'text-white bg-gray-800 border border-gray-700' : 'text-gray-800 bg-white border border-gray-200'
        }`}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className={`flex-1 rounded-2xl py-4 pl-6 pr-16 ${
              isDarkMode
                ? 'bg-gray-800 text-gray-200 placeholder-gray-500'
                : 'bg-white text-gray-700 placeholder-gray-400'
            } focus:outline-none appearance-none ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              resize: 'none', // Disable resize handle
              minHeight: '60px' // Set minimum height
            }}
            rows={2}
            spellCheck="false"
            autoComplete="off"
          />

          <div className="absolute right-2 flex items-center space-x-2">
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowBotDropdown(!showBotDropdown)}
                className={`rounded-md p-2 ${
                  isDarkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="hidden sm:inline text-xs font-medium">{selectedBot}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

              {showBotDropdown && (
                <div className={`absolute ${isFixed ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-48 rounded-md shadow-lg ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="py-1">
                    {bots.map((bot) => (
                      <button
                        key={bot.name}
                        type="button"
                        onClick={() => {
                          setSelectedBot(bot.name);
                          setShowBotDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedBot === bot.name
                            ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-50 text-blue-700'
                            : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {bot.name} ({bot.model})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type={isLoading ? "button" : "submit"}
              onClick={isLoading && onStop ? onStop : undefined}
              disabled={(!isLoading && (!message.trim() || !selectedBot))}
              className={`rounded-full p-2 ${
                !isLoading && (!message.trim() || !selectedBot)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isLoading
                    ? 'bg-gray-500 hover:bg-gray-600'
                    : 'bg-[#4285f4] hover:bg-blue-600'
              } text-white focus:outline-none`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center w-6 h-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="5" y="5" width="10" height="10" />
                  </svg>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
