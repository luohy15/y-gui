import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Chat } from '@shared/types';
import { useTheme } from '../../contexts/ThemeContext';
import SharedMessageItem from './SharedMessageItem';
import useSWR, { SWRConfiguration } from 'swr';

export default function SharedChatView() {
  const { isDarkMode } = useTheme();
  const { id } = useParams<{ id: string }>();

  // Configure SWR options for proper revalidation
  const swrConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
    dedupingInterval: 2000,
  };

  // Use a non-authenticated fetcher for public access
  const fetcher = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = new Error('An error occurred while fetching the data.');
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  };

  // Fetch the shared chat data
  const { data: chat, error } = useSWR<Chat>(
    id ? `/api/share/${id}` : null,
    fetcher,
    swrConfig
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedToolInfo, setExpandedToolInfo] = React.useState<{ [key: string]: boolean }>({});
  const [expandedToolResults, setExpandedToolResults] = React.useState<{ [key: string]: boolean }>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  // No need for initialization effect since we want tools collapsed by default
  // (empty objects for expandedToolInfo and expandedToolResults achieve this)

  const toggleToolInfo = (messageId: string) => {
    setExpandedToolInfo(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const toggleToolResult = (messageId: string) => {
    setExpandedToolResults(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chat Not Found</h2>
          <p>This shared chat may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      {/* Header with shared info */}
      <div className={`py-4 px-6 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
        <div className="flex flex-col items-center space-y-3">
          <h1 className="text-xl font-semibold">Shared Chat</h1>
          <Link
            to="/"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
            }`}
          >
            Go to y-mcp home page
          </Link>
          <div className="text-sm opacity-75">
            {new Date(chat.create_time).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className={`flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-x-hidden overflow-y-auto`}>
        {chat.messages.map((msg, index) => (
          <SharedMessageItem
            key={`${msg.unix_timestamp}-${index}`}
            message={msg}
            isDarkMode={isDarkMode}
            expandedToolInfo={expandedToolInfo}
            expandedToolResults={expandedToolResults}
            onToggleToolInfo={toggleToolInfo}
            onToggleToolResult={toggleToolResult}
          />
        ))}
        <div ref={messagesEndRef} />
        <div className="pb-12"></div>
      </div>

      {/* Footer with shared info */}
      <div className={`py-3 px-6 border-t ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <div className="text-center">
          <p className="mb-4">This is a shared chat view. The content is read-only.</p>
          <Link
            to="/"
            className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-base font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
            }`}
          >
            Go to y-mcp home page
          </Link>
        </div>
      </div>
    </div>
  );
}
