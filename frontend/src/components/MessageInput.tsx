import React, { KeyboardEvent, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Bot } from '@shared/types';

interface MessageInputProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  selectedBot: string;
  setSelectedBot: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  bots: Bot[];
  onSendMessage?: (content: string, botName: string) => void;
}

export default function MessageInput({
  message,
  setMessage,
  selectedBot,
  setSelectedBot,
  isLoading,
  handleSubmit,
  bots,
  onSendMessage
}: MessageInputProps) {
  const { isDarkMode } = useTheme();

  // Set default bot to first in the array if not already selected
  React.useEffect(() => {
    if ((!selectedBot || selectedBot === '') && bots.length > 0) {
      setSelectedBot(bots[0].name);
    }
  }, [selectedBot, bots, setSelectedBot]);

  // Handle Enter key to send message (without Shift key)
  // Skip if in IME composition mode (for languages like Chinese, Japanese, etc.)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (message.trim() && selectedBot) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // If onSendMessage is provided, use it instead of the default handleSubmit
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !selectedBot) {
      return;
    }

    if (onSendMessage) {
      onSendMessage(message, selectedBot);
      setMessage('');
      return;
    }

    // Otherwise use the provided handleSubmit
    handleSubmit(e);
  };

  const [showBotDropdown, setShowBotDropdown] = useState(false);

  return (
    <div className={`fixed bottom-6 left-0 right-0 z-10 flex justify-center px-4`}>
      <form onSubmit={onSubmit} className="w-full max-w-3xl">
        <div className={`relative flex items-center rounded-full shadow-lg ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className={`flex-1 rounded-full py-3 pl-5 pr-16 ${
              isDarkMode
                ? 'bg-gray-800 text-gray-200 placeholder-gray-500'
                : 'bg-white text-gray-700 placeholder-gray-400'
            } focus:outline-none appearance-none`}
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              resize: 'none' // Disable resize handle
            }}
            rows={1}
            spellCheck="false"
            autoComplete="off"
          />

          <div className="absolute right-2 flex items-center space-x-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBotDropdown(!showBotDropdown)}
                className={`rounded-full p-2 ${
                  isDarkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <span className="text-xs font-medium">{selectedBot}</span>
              </button>

              {showBotDropdown && (
                <div className={`absolute bottom-full right-0 mb-2 w-48 rounded-md shadow-lg ${
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
              type="submit"
              disabled={isLoading || !message.trim() || !selectedBot}
              className={`rounded-full p-2 ${
                isLoading || !message.trim() || !selectedBot
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#4285f4] hover:bg-blue-700'
              } text-white focus:outline-none`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center w-6 h-6">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
