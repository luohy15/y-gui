import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Chat, Message } from '@shared/types';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import CompactMarkdown from './Markdown';
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
  const [collapsedReasoning, setCollapsedReasoning] = React.useState<{ [key: string]: boolean }>({});
  const [collapsedToolInfo, setCollapsedToolInfo] = React.useState<{ [key: string]: boolean }>({});
  const [collapsedToolResults, setCollapsedToolResult] = React.useState<{ [key: string]: boolean }>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const toggleReasoning = (messageId: string) => {
    setCollapsedReasoning(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const toggleToolInfo = (messageId: string) => {
    setCollapsedToolInfo(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const toggleToolResult = (messageId: string) => {
    setCollapsedToolResult(prev => ({
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
          <div
            key={`${msg.unix_timestamp}-${index}`}
            className={`flex items-start space-x-4 ${msg.role === 'user' && !msg.tool ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className="flex-shrink-0">
              {msg.role === 'user' && !msg.tool ? (
                <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>U</span>
                </div>
              ) : (
                <AssistantAvatar model={msg.model} />
              )}
            </div>
            <div className={`max-w-full flex-1 space-y-2 ${msg.role === 'user' && !msg.tool ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${msg.role === 'user' && !msg.tool
                  ? 'bg-[#4285f4] text-white ml-auto'
                  : isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
                }`}>
                {/* assistant info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm font-medium">{msg.role === 'user' && !msg.tool ? 'User' : 'Assistant'}</span>
                    <span className="text-xs opacity-75">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {msg.model && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.tool
                            ? 'bg-blue-400 text-white'
                            : isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                          }`}>
                          {msg.model}
                        </span>
                      )}
                      {msg.provider && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.tool
                            ? 'bg-blue-400 text-white'
                            : isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                          }`}>
                          {msg.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* reasoning content */}
                {msg.reasoning_content && (
                  <div className={`mb-3 text-sm ${msg.role === 'user' && !msg.tool
                      ? 'border-blue-400 text-blue-100'
                      : isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                    }`}>
                    <button
                      onClick={() => toggleReasoning(msg.unix_timestamp.toString())}
                      className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
                    >
                      <svg
                        className={`h-4 w-4 transform transition-transform ${!collapsedReasoning[msg.unix_timestamp.toString()] ? 'rotate-90' : ''
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Reasoning</span>
                    </button>
                    {!collapsedReasoning[msg.unix_timestamp.toString()] && (
                      <div className="pl-5 italic">
                        {msg.reasoning_content}
                      </div>
                    )}
                  </div>
                )}
                {/* content */}
                {msg.role === 'user' && msg.tool ? (
                  <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <button
                      onClick={() => toggleToolResult(msg.unix_timestamp.toString())}
                      className="flex items-center space-x-1 mb-2 opacity-80 hover:opacity-100 text-sm font-medium"
                    >
                      <svg
                        className={`h-4 w-4 transform transition-transform ${!collapsedToolResults[msg.unix_timestamp.toString()] ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Tool Result</span>
                    </button>
                    {!collapsedToolResults[msg.unix_timestamp.toString()] && (
                      <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                        {typeof msg.content === 'string' ? (
                          msg.content.trim().startsWith('{') && msg.content.trim().endsWith('}') ? (
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{msg.content}</pre>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {JSON.stringify(msg.content, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                <CompactMarkdown
                  content={typeof msg.content === 'string' ? msg.content : ''}
                  className={msg.role === 'user' && !msg.tool ? 'prose-invert' : 'prose-gray'}
                />
                )}
                {/* Tool information */}
                {msg.tool && msg.server && msg.arguments && msg.role === 'assistant' && (
                  <div className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <button
                      onClick={() => toggleToolInfo(msg.unix_timestamp.toString())}
                      className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
                    >
                      <svg
                        className={`h-4 w-4 transform transition-transform ${!collapsedToolInfo[msg.unix_timestamp.toString()] ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Tool Information</span>
                    </button>
                    {!collapsedToolInfo[msg.unix_timestamp.toString()] && (
                      <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="mb-2">
                          <span className="text-sm font-semibold">Server:</span>
                          <span className="ml-2 text-sm">{msg.server}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-semibold">Tool:</span>
                          <span className="ml-2 text-sm">{msg.tool}</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm font-semibold">Arguments:</span>
                          <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {typeof msg.arguments === 'string'
                              ? msg.arguments
                              : JSON.stringify(msg.arguments, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
